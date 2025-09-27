// NOTE: Use explicit relative paths so Wrangler/Workers bundler resolves modules reliably in production.
// Previously used bare specifiers 'api/...', which can fail without custom module resolution.
import { handleChat as advancedChat } from '../api/chat';
import { handleAdvancedTrack } from '../api/track';
import { handleContact } from '../api/estimate';

function json(data: any, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers }
  });
}

async function parseJSON(request: Request) {
  try { return await request.json(); } catch (_) { return null; }
}

// Generic form submission (lightweight, stores as lead_events type=form_submit and optionally email notify)
async function handleForm(env: any, request: Request) {
  const body = await parseJSON(request);
  if (!body) return json({ error: 'Invalid JSON' }, 400);
  const ts = new Date().toISOString();
  const page = (body.page || '/').toString().slice(0, 300);
  const session = (body.session || '').toString().slice(0, 120);
  const service = (body.service || '').toString().slice(0, 120);
  const source = (body.source || '').toString().slice(0, 120);
  try {
    await env.DB.prepare(
      `INSERT INTO lead_events (ts, day, hour, type, page, service, source, device, city, country, zip, area, session, scroll_pct, duration_ms, referrer, utm_source, utm_medium, utm_campaign, gclid)
       VALUES (?, date(?), strftime('%H', ?), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      ts, ts, ts,
      'form_submit',
      page,
      service,
      source,
      body.device || '',
      body.city || '',
      body.country || '',
      body.zip || '',
      body.area || '',
      session,
      Number.isFinite(Number(body.scroll_pct)) ? Number(body.scroll_pct) : 0,
      Number.isFinite(Number(body.duration_ms)) ? Number(body.duration_ms) : 0,
      body.referrer || '',
      body.utm_source || '',
      body.utm_medium || '',
      body.utm_campaign || '',
      body.gclid || ''
    ).run();
  } catch (e) {
    return json({ error: 'db error' }, 500);
  }
  return json({ ok: true });
}

// Call event (e.g., phone click) stored as type=click_call
async function handleCall(env: any, request: Request) {
  const body = await parseJSON(request);
  if (!body) return json({ error: 'Invalid JSON' }, 400);
  const ts = new Date().toISOString();
  try {
    await env.DB.prepare(
      `INSERT INTO lead_events (ts, day, hour, type, page, service, source, device, city, country, zip, area, session, scroll_pct, duration_ms, referrer, utm_source, utm_medium, utm_campaign, gclid)
       VALUES (?, date(?), strftime('%H', ?), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      ts, ts, ts,
      'click_call',
      body.page || '',
      body.service || '',
      body.source || '',
      body.device || '',
      body.city || '',
      body.country || '',
      body.zip || '',
      body.area || '',
      body.session || '',
      Number.isFinite(Number(body.scroll_pct)) ? Number(body.scroll_pct) : 0,
      Number.isFinite(Number(body.duration_ms)) ? Number(body.duration_ms) : 0,
      body.referrer || '',
      body.utm_source || '',
      body.utm_medium || '',
      body.utm_campaign || '',
      body.gclid || ''
    ).run();
  } catch (e) {
    return json({ error: 'db error' }, 500);
  }
  return json({ ok: true });
}

async function handleStats(env: any) {
  const thirty = new Date(Date.now() - 30*24*3600*1000).toISOString();
  try {
    const events = await env.DB.prepare(
      `SELECT type, COUNT(*) as cnt FROM lead_events WHERE ts >= ? GROUP BY type ORDER BY cnt DESC`
    ).bind(thirty).all();
    const leads = await env.DB.prepare(
      `SELECT COUNT(*) as cnt FROM leads WHERE rowid IN (SELECT id FROM leads WHERE 1)`
    ).all();
    return json({ ok: true, event_counts: events.results || [], total_leads: (leads.results?.[0]?.cnt)||0 });
  } catch (e) {
    return json({ error: 'db error' }, 500);
  }
}

async function handleChatHistory(env: any, request: Request) {
  const url = new URL(request.url);
  const session = url.searchParams.get('session') || '';
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10) || 20, 100);
  if (!session) return json({ error: 'session required' }, 400);
  try {
    const { results } = await env.DB.prepare(
      `SELECT id, ts, question, answer, ai_provider, page FROM chat_log WHERE session = ? ORDER BY id DESC LIMIT ?`
    ).bind(session, limit).all();
    return json({ ok: true, items: results });
  } catch (e) {
    return json({ error: 'db error' }, 500);
  }
}

// Chat: inline handler removed; using advancedChat (see ../api/chat.ts)

// Tracking event ingestion
// Accepts: { type, page?, service?, source?, device?, city?, country?, zip?, area?, session?, scroll_pct?, duration_ms?, referrer?, utm_source?, utm_medium?, utm_campaign?, gclid?, ts? }
// If ts omitted, server time used. Stores row in lead_events and optionally forwards lightweight event to GA4.
async function handleTrack(env: any, request: Request) {
  const body = await parseJSON(request);
  if (!body) return json({ error: 'Invalid JSON' }, 400);
  const clientTs = typeof body.ts === 'string' ? body.ts : null;
  const now = clientTs ? new Date(clientTs) : new Date();
  const iso = now.toISOString();
  const day = iso.slice(0, 10);
  const hour = iso.slice(11, 13);
  const record = {
    type: (body.type || 'event').toString().slice(0, 50),
    page: body.page || '',
    service: body.service || '',
    source: body.source || '',
    device: body.device || '',
    city: body.city || '',
    country: body.country || '',
    zip: body.zip || '',
    area: body.area || '',
    session: body.session || '',
    scroll_pct: Number.isFinite(Number(body.scroll_pct)) ? Number(body.scroll_pct) : 0,
    duration_ms: Number.isFinite(Number(body.duration_ms)) ? Number(body.duration_ms) : 0,
    referrer: body.referrer || '',
    utm_source: body.utm_source || '',
    utm_medium: body.utm_medium || '',
    utm_campaign: body.utm_campaign || '',
    gclid: body.gclid || ''
  };
  try {
    await env.DB.prepare(
      `INSERT INTO lead_events (ts, day, hour, type, page, service, source, device, city, country, zip, area, session, scroll_pct, duration_ms, referrer, utm_source, utm_medium, utm_campaign, gclid)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(
      iso,
      day,
      hour,
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
    if (env.DB_2) {
      await env.DB_2.prepare(
        `INSERT INTO lead_events (ts, day, hour, type, page, service, source, device, city, country, zip, area, session, scroll_pct, duration_ms, referrer, utm_source, utm_medium, utm_campaign, gclid)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
      ).bind(
        iso,
        day,
        hour,
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
    }
  } catch (e) {
    console.error('D1 insert lead_events failed', e); // eslint-disable-line no-console
    return json({ error: 'Database operation failed.' }, 500);
  }
  const measurement_id = 'G-CLK9PTRD5N';
  const api_secret = env.GA4_API_SECRET || '';
  const client_id = body.session || crypto.randomUUID();
  const ga4Params: { [key: string]: any } = {
    page_location: record.page || 'https://dependablepainting.work',
    page_referrer: record.referrer || '',
    session_id: record.session || '',
    engagement_time_msec: record.duration_ms ? String(record.duration_ms) : undefined,
    scroll_pct: record.scroll_pct,
    city: record.city,
    zip: record.zip,
    area: record.area
  };
  Object.keys(ga4Params).forEach(k => ga4Params[k] === undefined && delete ga4Params[k]);
  const ga4Payload = { client_id, events: [{ name: body.type || 'event', params: ga4Params }] };
  try {
    if (api_secret) {
      const url = `https://www.google-analytics.com/mp/collect?measurement_id=${measurement_id}&api_secret=${api_secret}`;
      const resp = await fetch(url, { method: 'POST', body: JSON.stringify(ga4Payload), headers: { 'Content-Type': 'application/json' } });
      if (!resp.ok) {
        const tx = await resp.text().catch(() => '');
        return json({ error: `GA4 error: ${resp.status} ${tx.slice(0, 300)}` }, 502);
      }
    }
  } catch (e) {}
  return json({ ok: true });
}

// Not implemented placeholder JSON helper
function notImpl() { return json({ success: false, message: 'Not implemented yet' }, 501); }

async function serveStaticAsset(env: any, request: Request) {
  try {
    if (env.ASSETS && typeof env.ASSETS.fetch === 'function') {
      // Let the assets binding handle lookups and mime types first
      const assetResp = await env.ASSETS.fetch(request);
      if (assetResp.status !== 404) {
        // Some setups may omit Content-Type on edge cases; normalize for safety
        const url = new URL(request.url);
        const path = url.pathname.toLowerCase();
        const headers = new Headers(assetResp.headers);
        if (!headers.has('content-type')) {
          if (path.endsWith('.css')) headers.set('content-type', 'text/css; charset=utf-8');
          else if (path.endsWith('.js')) headers.set('content-type', 'application/javascript; charset=utf-8');
          else if (path.endsWith('.json')) headers.set('content-type', 'application/json; charset=utf-8');
          else if (path.endsWith('.svg')) headers.set('content-type', 'image/svg+xml');
          else if (path.endsWith('.ico')) headers.set('content-type', 'image/x-icon');
          else if (path.endsWith('.png')) headers.set('content-type', 'image/png');
          else if (path.endsWith('.jpg') || path.endsWith('.jpeg')) headers.set('content-type', 'image/jpeg');
          else if (path.endsWith('.webp')) headers.set('content-type', 'image/webp');
          else if (path.endsWith('.html') || path.endsWith('.htm')) headers.set('content-type', 'text/html; charset=utf-8');
        }
        // Modest default caching for static files
        if (!headers.has('cache-control')) {
          if (/\.(?:css|js|png|jpg|jpeg|webp|svg|ico|woff2?)$/i.test(path)) {
            headers.set('cache-control', 'public, max-age=31536000, immutable');
          } else {
            headers.set('cache-control', 'public, max-age=0, must-revalidate');
          }
        }
        return new Response(assetResp.body, { status: assetResp.status, headers });
      }
    }
  } catch (e) {
    console.warn('Asset fetch error', e as any); // eslint-disable-line no-console
  }
  return new Response('Not Found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
}

export default {
  async fetch(request: Request, env: any, ctx: any) { // eslint-disable-line @typescript-eslint/no-unused-vars
    const { pathname } = new URL(request.url);
    const method = request.method.toUpperCase();

    // API routing
  if (pathname === '/api/estimate' && method === 'POST') return handleContact(env, request); // new advanced contact
  if (pathname === '/api/contact' && method === 'POST') return handleContact(env, request);
  if (pathname === '/api/form' && method === 'POST') return handleForm(env, request);
  if (pathname === '/api/call' && method === 'POST') return handleCall(env, request);
  if (pathname === '/api/stats' && method === 'GET') return handleStats(env);
  if (pathname === '/api/chat/history' && method === 'GET') return handleChatHistory(env, request);
  if (pathname === '/api/event' && method === 'POST') return handleTrack(env, request); // alias
    if (pathname.startsWith('/api/lead/') && method === 'GET') {
      // /api/lead/:id
      const id = pathname.split('/').pop();
      if (!id) return json({ error: 'id required' }, 400);
      try {
        const row = await env.DB.prepare(
          `SELECT id, name, email, phone, city, zip, service, page, source, session, message FROM leads WHERE id = ?`
        ).bind(id).first();
        if (!row) return json({ ok: false, error: 'not found' }, 404);
        return json({ ok: true, lead: row });
      } catch (e) {
        return json({ error: 'db error' }, 500);
      }
    }
    if (pathname === '/api/leads' && method === 'GET') {
      const url = new URL(request.url);
      const q = url.searchParams.get('q');
      const source = url.searchParams.get('source');
      const city = url.searchParams.get('city');
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 200);
      const offset = parseInt(url.searchParams.get('offset') || '0', 10) || 0;
      const filters = [];
      const args = [];
      if (source) { filters.push('source = ?'); args.push(source); }
      if (city) { filters.push('city = ?'); args.push(city); }
      if (q) { filters.push('(name LIKE ? OR email LIKE ? OR phone LIKE ?)'); args.push(`%${q}%`, `%${q}%`, `%${q}%`); }
      const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
      try {
        const { results } = await env.DB.prepare(
          `SELECT id, name, email, phone, city, zip, service, page, source, session, message
           FROM leads ${where} ORDER BY id DESC LIMIT ? OFFSET ?`
        ).bind(...args, limit, offset).all();
        return json({ ok: true, items: results });
      } catch (e) {
        return json({ error: 'db error' }, 500);
      }
    }
  if (pathname === '/api/chat' && method === 'POST') return advancedChat(env, request);
  if (pathname === '/api/charge' && method === 'POST') return notImpl();
  if (pathname === '/api/track' && method === 'POST') return handleTrack(env, request);
  if (pathname === '/api/track/advanced' && method === 'POST') return handleAdvancedTrack(env, request);
    if (pathname === '/api/lead-status' && method === 'POST') return notImpl();
    if (pathname === '/api/job' && method === 'POST') return notImpl();
  // legacy placeholders replaced above for stats & call
    if (pathname === '/api/geo/classify' && method === 'GET') return notImpl();
    if (pathname === '/api/health' && method === 'GET') return json({ ok: true, ts: Date.now() });

    // Static asset fallback (Wrangler will handle real asset serving via "assets" config). 404 placeholder here.
  return serveStaticAsset(env, request);
  },
  async queue(batch: any, env: any, ctx: any) { // eslint-disable-line @typescript-eslint/no-unused-vars
    // batch.queue contains the queue name
    const qName = batch.queue;
    for (const msg of batch.messages) {
      try {
        const data = msg.body;
        switch (qName) {
          case 'painter-chat-log-interaction': {
            // Persist chat interaction if not already stored
            if (data && data.session && data.question && data.answer) {
              try {
                await env.DB.prepare(
                  "INSERT INTO chat_log (ts, session, question, answer, ai_provider, user_agent, page) VALUES (datetime('now'),?,?,?,?,?,?)"
                ).bind(
                  data.session,
                  data.question,
                  data.answer,
                  data.provider || '',
                  data.ua || '',
                  data.page || ''
                ).run();
              } catch (_) {}
            }
            break;
          }
          case 'painter-lead': {
            // Minimal lead ingestion (assumes message shaped like leadData)
            if (data && data.name && (data.phone || data.email) && data.service) {
              try {
                await env.DB.prepare(
                  `INSERT INTO leads (name, email, phone, city, zip, service, page, session, source, message)
                   VALUES (?,?,?,?,?,?,?,?,?,?)`
                ).bind(
                  data.name,
                  data.email || '',
                  data.phone || '',
                  data.city || '',
                  data.zip || '',
                  data.service || '',
                  data.page || '',
                  data.session || '',
                  data.source || 'queue',
                  data.message || ''
                ).run();
              } catch (e) {
                // Retry transient DB errors
                msg.retry();
              }
            }
            break;
          }
          case 'painter-analytics-forward-ga4': {
            // Forward lightweight event to GA4
            try {
              const measurement_id = 'G-CLK9PTRD5N';
              const api_secret = env.GA4_API_SECRET || '';
              if (api_secret) {
                const client_id = data?.session || data?.client_id || crypto.randomUUID();
                const ga4Payload = {
                  client_id,
                  events: [
                    { name: (data?.type || 'event').toString().slice(0,40), params: {
                      page_location: data?.page || 'https://dependablepainting.work',
                      session_id: data?.session || '',
                      city: data?.city || '',
                      source: data?.source || '',
                      service: data?.service || ''
                    }}
                  ]
                };
                const url = `https://www.google-analytics.com/mp/collect?measurement_id=${measurement_id}&api_secret=${api_secret}`;
                const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ga4Payload) });
                if (!resp.ok) {
                  // retry on server errors
                  if (resp.status >= 500) msg.retry();
                }
              }
            } catch (_) {
              msg.retry();
            }
            break;
          }
          case 'painter-lead-notify-customer': {
            // Send notification email (best effort)
            try {
              if (env.SEB && env.SEB.send && data?.email) {
                const fromAddr = env.FROM_ADDR || 'no-reply@dependablepainting.work';
                const subject = data.subject || `Thanks for contacting ${env.SITE_NAME || 'Dependable Painting'}`;
                const html = data.html || `<p>Hi ${data.name || 'there'},</p><p>We received your request and will be in touch shortly. Need us now? Call <strong>(251) 423-5855</strong>.</p>`;
                try {
                  // @ts-ignore
                  if (typeof EmailMessage !== 'undefined') {
                    // @ts-ignore
                    const msgObj = new EmailMessage(fromAddr, data.email, subject);
                    // @ts-ignore
                    msgObj.setBody('text/html', html);
                    await env.SEB.send(msgObj);
                  } else {
                    await env.SEB.send({ from: fromAddr, to: data.email, subject, html });
                  }
                } catch (inner) {
                  msg.retry();
                }
              }
            } catch (_) { /* swallow */ }
            break;
          }
          default:
            break;
        }
      } catch (err) {
        try { msg.retry(); } catch (_) {}
      }
    }
  }
};

