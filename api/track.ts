// Advanced analytics & marketing tracking endpoint
// Provides enriched event ingestion, session attribution, channel classification,
// lightweight bot filtering, aggregation funnels, and queue fan-out.
// Designed to complement the simpler handleTrack in src/index.ts.

export interface AdvancedTrackBody {
  type?: string;
  page?: string;
  title?: string;
  service?: string;
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
  device?: string;
  city?: string;
  country?: string;
  region?: string;
  zip?: string;
  area?: string;
  session?: string;
  user_id?: string;
  scroll_pct?: number;
  duration_ms?: number;
  value?: number;
  currency?: string;
  referrer?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  gclid?: string;
  fbclid?: string;
  ts?: string;
  meta?: Record<string, any>;
}

interface EnvBindings {
  DB: any;
  GA4_API_SECRET?: string;
  GA4_QUEUE?: any; // Queue binding (Cloudflare)
  ANALYTICS_EVENTS?: any; // Analytics Engine dataset
  PAINTER_KV: any; // KV namespace
}

// Basic JSON helper (duplicated minimal to keep file self-contained)
function j(data: any, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers } });
}

function safeNumber(n: any, d = 0) { const v = Number(n); return Number.isFinite(v) ? v : d; }

// Channel / medium classification heuristics
function classifyChannel(b: AdvancedTrackBody): { channel: string; source: string; medium: string } {
  const src = (b.source || b.utm_source || '').toLowerCase();
  const med = (b.medium || b.utm_medium || '').toLowerCase();
  const ref = (b.referrer || '').toLowerCase();
  if (b.gclid) return { channel: 'Paid Search', source: 'google', medium: 'cpc' };
  if (/facebook|fb\.com/.test(src) || /facebook|fb\.com/.test(ref)) return { channel: 'Paid Social', source: 'facebook', medium: med || 'paid_social' };
  if (/tiktok/.test(src) || /tiktok/.test(ref)) return { channel: 'Paid Social', source: 'tiktok', medium: med || 'paid_social' };
  if (/google/.test(src) && (med === 'organic' || !med)) return { channel: 'Organic Search', source: 'google', medium: 'organic' };
  if (/bing|yahoo|duckduckgo/.test(ref)) return { channel: 'Organic Search', source: 'other_search', medium: 'organic' };
  if (med === 'email') return { channel: 'Email', source: src || 'email', medium: 'email' };
  if (med === 'affiliate') return { channel: 'Affiliate', source: src || 'affiliate', medium: 'affiliate' };
  if (med === 'cpc' || med === 'ppc' || med === 'paid_search') return { channel: 'Paid Search', source: src || 'paid', medium: 'cpc' };
  if (ref && !ref.includes('dependablepainting.work')) return { channel: 'Referral', source: new URL('https://' + ref.replace(/^https?:\/\//,'')).hostname.replace(/^www\./,'') || 'referral', medium: 'referral' };
  return { channel: 'Direct', source: 'direct', medium: 'direct' };
}

// Lightweight bot detection
function isBot(ua: string | null): boolean {
  if (!ua) return false;
  return /(bot|crawl|spider|slurp|headless|phantom|monitor)/i.test(ua) && !/chrome\/[\d.]+ safari\//i.test(ua);
}

// Funnel stage inference (very heuristic)
function inferFunnel(type: string, page: string): string {
  const t = type.toLowerCase();
  if (t === 'page_view') {
    if (/thank-you/.test(page)) return 'Conversion';
    if (/contact|estimate|quote/.test(page)) return 'Consideration';
    return 'Awareness';
  }
  if (/form_submit|lead|conversion/.test(t)) return 'Conversion';
  if (/scroll|engagement/.test(t)) return 'Engagement';
  return 'Other';
}

async function rateLimitKV(kv: any, key: string, limit: number, windowSecs: number): Promise<boolean> {
  try {
    const nowBucket = Math.floor(Date.now() / (windowSecs * 1000));
    const storageKey = `rt:${key}:${nowBucket}`;
    const current = await kv.get(storageKey);
    if (!current) {
      await kv.put(storageKey, '1', { expirationTtl: windowSecs + 5 });
      return true;
    }
    const next = parseInt(current, 10) + 1;
    if (next > limit) return false;
    await kv.put(storageKey, String(next), { expirationTtl: windowSecs + 5 });
    return true;
  } catch { return true; }
}

async function persistEvent(env: EnvBindings, record: any) {
  try {
    await env.DB.prepare(
      `INSERT INTO lead_events (ts, day, hour, type, page, service, source, device, city, country, zip, area, session, scroll_pct, duration_ms, referrer, utm_source, utm_medium, utm_campaign, gclid)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(
      record.ts,
      record.day,
      record.hour,
      record.type,
      record.page,
      record.service,
      record.source,
      record.device,
      record.city,
      record.country,
      record.zip,
      record.area,
      record.session,
      record.scroll_pct,
      record.duration_ms,
      record.referrer,
      record.utm_source,
      record.utm_medium,
      record.utm_campaign,
      record.gclid
    ).run();
  } catch (e) {
    console.error('D1 advanced event insert failed', e); // eslint-disable-line no-console
  }
}

function buildDerived(record: any) {
  const funnel_stage = inferFunnel(record.type, record.page);
  return { funnel_stage };
}

async function maybeAnalyticsEngine(env: EnvBindings, enriched: any) {
  if (!env.ANALYTICS_EVENTS) return;
  try {
    await env.ANALYTICS_EVENTS.writeDataPoint({
      indexes: [enriched.channel, enriched.funnel_stage, enriched.type],
      blobs: [JSON.stringify(enriched)],
      doubles: [enriched.value || 0]
    });
  } catch (e) { /* ignore */ }
}

async function fanOutQueues(env: EnvBindings, enriched: any) {
  try {
    if (env.GA4_QUEUE) {
      await env.GA4_QUEUE.send({
        type: enriched.type,
        page: enriched.page,
        session: enriched.session,
        city: enriched.city,
        service: enriched.service,
        source: enriched.source
      });
    }
  } catch (_) {}
}

export async function handleAdvancedTrack(env: EnvBindings, request: Request) {
  const body: AdvancedTrackBody | null = await request.json().catch(() => null);
  if (!body) return j({ error: 'Invalid JSON' }, 400);
  const ua = request.headers.get('User-Agent');
  if (isBot(ua)) return j({ ok: true, skipped: 'bot' });

  const session = (body.session || crypto.randomUUID()).toString().slice(0, 120);

  // Rate limit per session
  const allowed = await rateLimitKV(env.PAINTER_KV, `adv:${session}`, 120, 60 * 5); // 120 events / 5 min
  if (!allowed) return j({ error: 'rate_limited' }, 429);

  const tsDate = body.ts ? new Date(body.ts) : new Date();
  const iso = tsDate.toISOString();
  const record = {
    ts: iso,
    day: iso.slice(0, 10),
    hour: iso.slice(11, 13),
    type: (body.type || 'page_view').toString().slice(0, 60),
    page: (body.page || '').toString().slice(0, 300),
    service: (body.service || '').toString().slice(0, 120),
    source: (body.source || body.utm_source || '').toString().slice(0, 120),
    device: (body.device || '').toString().slice(0, 60),
    city: (body.city || '').toString().slice(0, 120),
    country: (body.country || '').toString().slice(0, 120),
    zip: (body.zip || '').toString().slice(0, 40),
    area: (body.area || '').toString().slice(0, 80),
    session,
    scroll_pct: safeNumber(body.scroll_pct),
    duration_ms: safeNumber(body.duration_ms),
    referrer: (body.referrer || '').toString().slice(0, 300),
    utm_source: (body.utm_source || '').toString().slice(0, 120),
    utm_medium: (body.utm_medium || '').toString().slice(0, 120),
    utm_campaign: (body.utm_campaign || '').toString().slice(0, 120),
    gclid: (body.gclid || '').toString().slice(0, 200)
  };

  // Derivations
  const channelInfo = classifyChannel(body);
  const derived = buildDerived(record);
  const value = safeNumber(body.value, 0);

  const enriched = { ...record, ...channelInfo, ...derived, value, meta: body.meta || {}, ua };

  await persistEvent(env, record);
  await maybeAnalyticsEngine(env, enriched);
  await fanOutQueues(env, enriched);

  // Return enriched classification and minimal ack
  return j({ ok: true, channel: channelInfo.channel, funnel_stage: derived.funnel_stage, value });
}
