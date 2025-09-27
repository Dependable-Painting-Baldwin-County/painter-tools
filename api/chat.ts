export interface ChatRequestBody {
  session?: string;
  message: string;
  page?: string;
  service?: string;
  source?: string;
  temperature?: number;
  stream?: boolean;
}

interface ChatContextDoc { id: string; score: number; text: string }

const MAX_HISTORY_PAIRS = 12;
const MAX_CONTEXT_DOCS = 4;
const MAX_TOKENS_REPLY = 512;
const DEFAULT_MODEL = 'gpt-4o-mini';
const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}

function shortId() { return Math.random().toString(36).slice(2, 10); }

async function parseJSON(req: Request) { try { return await req.json(); } catch { return null; } }

async function rateLimit(env: any, session: string, ip: string | null) {
  if (!env.PAINTER_KV) return;
  const key = `rl:${session || ip || 'anon'}`;
  const raw = await env.PAINTER_KV.get(key);
  const count = raw ? parseInt(raw, 10) : 0;
  if (count > 40) throw new Error('rate_limited');
  await env.PAINTER_KV.put(key, String(count + 1), { expirationTtl: 300 });
}

async function fetchHistory(env: any, session: string) {
  try {
    const { results } = await env.DB.prepare(
      `SELECT question, answer FROM chat_log WHERE session = ? ORDER BY id DESC LIMIT ?`
    ).bind(session, MAX_HISTORY_PAIRS).all();
    return (results || []).reverse();
  } catch {
    return [];
  }
}

function buildHistoryMessages(history: any[]) {
  const msgs: { role: 'user' | 'assistant'; content: string }[] = [];
  for (const row of history) {
    if (row.question) msgs.push({ role: 'user', content: row.question });
    if (row.answer) msgs.push({ role: 'assistant', content: row.answer });
  }
  return msgs;
}

async function retrieveDocs(env: any, userMsg: string): Promise<ChatContextDoc[]> {
  if (!env.VECTORIZE || !env.AI) return [];
  try {
    const embeddingResp: any = await env.AI.run('@cf/baai/bge-small-en-v1.5', { text: userMsg });
    const vector: number[] = embeddingResp?.data?.[0]?.embedding || embeddingResp?.embedding || [];
    if (!Array.isArray(vector) || !vector.length) return [];
    const queryResp = await env.VECTORIZE.query(vector, { topK: MAX_CONTEXT_DOCS, returnValues: true });
    const docs: ChatContextDoc[] = (queryResp.matches || []).map((m: any, i: number) => ({
      id: m.id || String(i),
      score: m.score,
      text: (m.values?.text || m.metadata?.text || '').toString().slice(0, 1200)
    })).filter((d: ChatContextDoc) => d.text);
    return docs;
  } catch (e) {
    return [];
  }
}

function classifyIntent(text: string) {
  const lower = text.toLowerCase();
  return {
    wantsEstimate: /estimate|quote|cost|price/.test(lower),
    scheduling: /schedule|when can|availability|book/.test(lower),
    greeting: /^(hi|hello|hey|good (morning|afternoon|evening))\b/.test(lower),
    farewell: /(bye|thank you|thanks)/.test(lower)
  };
}

function systemPrompt(env: any) {
  return `You are Paint Guru, the expert, professional painting consultant for Dependable Painting (Baldwin & Mobile County, Alabama).
MANDATES:
- Be accurate, concise, friendly, and professional.
- Only answer about painting, surfaces, coatings, preparation, tools, safety, scheduling guidance.
- Allowed topics ONLY: painting techniques, surface prep, coatings, primers, Sherwin-Williams products (general characteristics, appropriate uses), our services, service areas, scheduling expectations, seasonal considerations (humidity, UV, salt air), safety & cleanup.
- Disallowed: precise pricing numbers, unrelated trades, legal/medical/financial topics, unrelated home improvement outside painting context. Politely redirect if outside scope.
- If user requests a quote or pricing, DO NOT provide exact prices or line-item costs. Instead outline factors (prep, substrate, square footage, coatings) and suggest a free in-person estimate by calling (251) 423-5855.
- NEVER invent company data. If unsure, admit uncertainty and offer a human follow-up.
- Localize examples to Gulf Coast climate (humidity, UV, salt air) when relevant.
- Cite retrieved context snippets as [Doc #] when used.
- Encourage surface preparation best practices.
- Always end with a concise CTA: "Call (251) 423-5855 for a fast, accurate estimate" OR suggest a relevant internal page (e.g. /interior-painting.html, /exterior-painting.html, /cabinet-painting.html, /commercial-painting.html, /contact-form.html) depending on user intent.
OUTPUT STYLE:
- Short paragraphs (2-4 sentences) or lists.
- Provide actionable steps when user asks how.
- End with a helpful invitation if appropriate.`;
}

function buildContextBlock(docs: ChatContextDoc[]): string {
  if (!docs.length) return '';
  return 'Retrieved Context:\n' + docs.map((d, i) => `[Doc ${i+1}] ${d.text}`).join('\n---\n');
}

async function callWorkersAI(env: any, messages: any[], temperature: number) {
  const resp = await env.AI.run({
    model: env.AI_MODEL || DEFAULT_MODEL,
    messages,
    max_tokens: MAX_TOKENS_REPLY,
    temperature
  });
  return { text: resp?.choices?.[0]?.message?.content || '', provider: 'workers-ai' };
}

async function callOpenAI(env: any, messages: any[], temperature: number) {
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('openai_missing');
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL,
      messages,
      temperature,
      max_tokens: MAX_TOKENS_REPLY
    })
  });
  if (!resp.ok) {
    const tx = await resp.text().catch(() => '');
    throw new Error(`openai_http_${resp.status}:${tx.slice(0,200)}`);
  }
  const data = await resp.json();
  return { text: data?.choices?.[0]?.message?.content || '', provider: 'openai' };
}

async function persist(env: any, session: string, question: string, answer: string, provider: string, page: string | undefined, ua: string | null) {
  try {
    await env.DB.prepare(
      "INSERT INTO chat_log (ts, session, question, answer, ai_provider, user_agent, page) VALUES (datetime('now'),?,?,?,?,?,?)"
    ).bind(session, question, answer, provider, ua, page || '').run();
  } catch {}
  try {
    if (env.CHAT_QUEUE) {
      await env.CHAT_QUEUE.send({ session, question, answer, provider, page, ts: Date.now() });
    }
  } catch {}
}

function sseStream(text: string) {
  const encoder = new TextEncoder();
  const sentences = text.match(/[^.!?]+[.!?]?/g) || [text];
  let i = 0;
  return new ReadableStream({
    pull(controller) {
      if (i >= sentences.length) { controller.enqueue(encoder.encode('event: end\ndata: [DONE]\n\n')); controller.close(); return; }
      const chunk = sentences[i++].trim();
      if (chunk) controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
    }
  });
}

export async function handleChat(env: any, request: Request) {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  const body = await parseJSON(request) as ChatRequestBody | null;
  if (!body || !body.message) return json({ error: 'message_required' }, 400);
  const session = (body.session || '').slice(0,64) || shortId();
  const temperature = Number.isFinite(body.temperature) ? Number(body.temperature) : (env.AI_TEMP ? Number(env.AI_TEMP) : 0.3);
  const ip = request.headers.get('CF-Connecting-IP');

  try { await rateLimit(env, session, ip); } catch { return json({ error: 'rate_limited' }, 429); }

  const historyRows = await fetchHistory(env, session);
  const historyMsgs = buildHistoryMessages(historyRows);
  const docs = await retrieveDocs(env, body.message);
  const intents = classifyIntent(body.message);

  const contextBlock = buildContextBlock(docs);
  const dynamicDirectives: string[] = [];
  if (intents.wantsEstimate) dynamicDirectives.push('User is seeking a cost/estimate: Provide realistic ballpark ranges & factors, then advise free on-site estimate (call (251) 423-5855).');
  if (intents.scheduling) dynamicDirectives.push('User intent: scheduling. Offer phone scheduling and typical lead times.');
  if (intents.greeting) dynamicDirectives.push('Acknowledge greeting briefly.');
  if (intents.farewell) dynamicDirectives.push('Offer a helpful closing, ask if they need anything else.');

  const dynamicBlock = dynamicDirectives.length ? ('Dynamic Guidance:\n' + dynamicDirectives.join('\n')) : '';

  const system = systemPrompt(env) + (contextBlock ? '\n\n' + contextBlock : '') + (dynamicBlock ? '\n\n' + dynamicBlock : '');

  const messages = [
    { role: 'system', content: system },
    ...historyMsgs,
    { role: 'user', content: body.message }
  ];

  let aiResp: { text: string; provider: string } | null = null;
  let error: string | null = null;
  try {
    if (env.AI) {
      aiResp = await callWorkersAI(env, messages, temperature);
    } else if (env.OPENAI_API_KEY) {
      aiResp = await callOpenAI(env, messages, temperature);
    } else {
      throw new Error('no_ai_provider');
    }
  } catch (e: any) {
    error = e?.message || String(e);
  }
  if (!aiResp) return json({ error: error || 'ai_failed' }, 502);

  persist(env, session, body.message, aiResp.text, aiResp.provider, body.page, request.headers.get('User-Agent'));

  if (body.stream) {
    const stream = sseStream(aiResp.text);
    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        'X-Session': session
      }
    });
  }

  return json({
    ok: true,
    session,
    reply: aiResp.text,
    // Backwards compatibility for earlier widget expecting 'answer'
    answer: aiResp.text,
    provider: aiResp.provider,
    intents,
    used: {
      history_pairs: historyRows.length,
      context_docs: docs.length
    }
  });
}
