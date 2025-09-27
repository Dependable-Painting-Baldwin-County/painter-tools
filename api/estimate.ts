// Advanced contact / estimate form handling logic
// Features:
//  - Input validation & normalization
//  - Basic duplicate suppression (same phone+service+message)
//  - Risk scoring (spam heuristics)
//  - Immediate DB persistence (leads + lead_events)
//  - Admin notification email (rich details)
//  - Customer auto-reply via queue (LEAD_NOTIFY_QUEUE) for resilience
//  - Analytics fan-out to GA4 queue (optional)
//  - Graceful degradation: email / queue failures do not block success response

interface ContactBody {
	name?: string;
	email?: string;
	phone?: string;
	city?: string;
	zip?: string;
	service?: string;
	message?: string;
	description?: string;
	page?: string;
	session?: string;
	source?: string;
	utm_source?: string;
	utm_medium?: string;
	utm_campaign?: string;
	utm_term?: string;
	utm_content?: string;
	gclid?: string;
	referrer?: string;
}

function j(data: any, status = 200, headers: Record<string,string> = {}) {
	return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers } });
}

function normalizePhone(raw: string | undefined): { raw: string; digits: string } {
	if (!raw) return { raw: '', digits: '' };
	const digits = raw.replace(/\D+/g, '').slice(0, 15);
	return { raw: raw.trim(), digits };
}

function riskScore(msg: string, body: ContactBody): { score: number; reasons: string[] } {
	let score = 0;
	const reasons: string[] = [];
	const m = msg.toLowerCase();
	if (m.length < 5) { score += 10; reasons.push('very_short'); }
	if (/https?:\/\//.test(m)) { score += 25; reasons.push('link_present'); }
	if ((m.match(/free quote|seo|backlink|guest post/gi)||[]).length) { score += 25; reasons.push('spam_keywords'); }
	if (body.email && /@(example|test|mailinator|tempmail)/i.test(body.email)) { score += 15; reasons.push('throwaway_email'); }
	return { score, reasons };
}

async function findDuplicate(env: any, phoneDigits: string, email: string | undefined, service: string | undefined, message: string): Promise<boolean> {
	// Since leads table lacks ts column, dedupe by exact same (phone OR email) + service + message.
	try {
		if (!phoneDigits && !email) return false;
		const where: string[] = [];
		const args: any[] = [];
		if (phoneDigits) { where.push('phone LIKE ?'); args.push('%' + phoneDigits.slice(-6)); }
		if (email) { where.push('email = ?'); args.push(email); }
		const clause = where.length ? '(' + where.join(' OR ') + ')' : '1=0';
		const q = `SELECT id FROM leads WHERE ${clause} AND service = ? AND message = ? LIMIT 1`;
		const row = await env.DB.prepare(q).bind(...args, service || '', message).first();
		return !!row;
	} catch (_) { return false; }
}

async function insertLead(env: any, lead: any) {
	const res = await env.DB.prepare(
		`INSERT INTO leads (name, email, phone, city, zip, service, page, session, source, message)
		 VALUES (?,?,?,?,?,?,?,?,?,?)`
	).bind(
		lead.name,
		lead.email,
		lead.phone,
		lead.city,
		lead.zip,
		lead.service,
		lead.page,
		lead.session,
		lead.source,
		lead.message
	).run();
	return res.meta?.last_row_id ? String(res.meta.last_row_id) : undefined;
}

async function insertEvent(env: any, lead: any) {
	try {
		const ts = new Date().toISOString();
		await env.DB.prepare(
			`INSERT INTO lead_events (ts, day, hour, type, page, service, source, device, city, country, zip, area, session, scroll_pct, duration_ms, referrer, utm_source, utm_medium, utm_campaign, gclid)
			 VALUES (?, date(?), strftime('%H', ?), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
		).bind(
			ts, ts, ts,
			'form_submit',
			lead.page || '',
			lead.service || '',
			lead.source || '',
			'', // device
			lead.city || '',
			'', // country (not provided)
			lead.zip || '',
			'', // area
			lead.session || '',
			0, 0,
			lead.referrer || '',
			lead.utm_source || '',
			lead.utm_medium || '',
			lead.utm_campaign || '',
			lead.gclid || ''
		).run();
	} catch (_) {}
}

async function sendAdminEmail(env: any, lead: any, risk: { score: number; reasons: string[] }) {
	if (!env.SEB || !env.SEB.send) return;
	const subject = `[LEAD] ${lead.service || 'General'} | ${lead.name} | ${lead.phone || lead.email || 'no-contact'}`;
	const lines = [
		'New contact form submission:',
		`Name: ${lead.name}`,
		`Email: ${lead.email || '—'}`,
		`Phone: ${lead.phone || '—'}`,
		`City: ${lead.city || '—'}`,
		`Zip: ${lead.zip || '—'}`,
		`Service: ${lead.service || '—'}`,
		`Source: ${lead.source || '—'}`,
		`UTM: ${lead.utm_source || ''} / ${lead.utm_medium || ''} / ${lead.utm_campaign || ''}`,
		`Session: ${lead.session || '—'}`,
		`Page: ${lead.page}`,
		`Referrer: ${lead.referrer || '—'}`,
		`Message:\n${lead.message}`,
		`Risk Score: ${risk.score} (${risk.reasons.join(',') || 'clean'})`
	];
	const text = lines.join('\n');
	const from = env.FROM_ADDR || env.SENDER || 'no-reply@dependablepainting.work';
	// Accept multiple possible variable names for the destination list
	const rawList = env.LEAD_ALERTS || env.ADMIN_EMAIL || env.OWNER_EMAIL || env.TO_ADDR || env.DESTINATION;
	const toList = (rawList || 'just-paint-it@dependablepainting.work').split(/[,;\s]+/).filter(Boolean);
	for (const to of toList) {
		try {
			// @ts-ignore
			if (typeof EmailMessage !== 'undefined') {
				// @ts-ignore
				const msg = new EmailMessage(from, to, subject);
				// @ts-ignore
				msg.setBody('text/plain', text);
				await env.SEB.send(msg);
			} else {
				await env.SEB.send({ from, to, subject, content: text });
			}
		} catch (_) { /* swallow per recipient */ }
	}
}

async function queueCustomerAutoReply(env: any, lead: any) {
	if (!lead.email) return;
	try {
		if (env.LEAD_NOTIFY_QUEUE) {
			const subject = `Thanks for contacting ${env.SITE_NAME || 'Dependable Painting'}`;
			const html = `<p>Hi ${lead.name || 'there'},</p><p>We received your request about <strong>${lead.service || 'painting'}</strong>. We'll call you shortly. Need immediate help? Call <strong>(251) 423-5855</strong>.</p><p>— ${env.SITE_NAME || 'Dependable Painting'}</p>`;
			await env.LEAD_NOTIFY_QUEUE.send({ email: lead.email, name: lead.name, subject, html });
		}
	} catch (_) {}
}

async function fanOutAnalytics(env: any, lead: any) {
	try {
		if (env.GA4_QUEUE) {
			await env.GA4_QUEUE.send({ type: 'lead_submit', page: lead.page, session: lead.session, city: lead.city, service: lead.service, source: lead.source });
		}
	} catch (_) {}
}

export async function handleContact(env: any, request: Request) {
	const body: ContactBody | null = await request.json().catch(() => null);
	if (!body) return j({ error: 'Invalid JSON' }, 400);
	const name = (body.name || '').trim().slice(0, 160);
	const email = (body.email || '').trim().slice(0, 200).toLowerCase();
	const { raw: phoneRaw, digits: phoneDigits } = normalizePhone(body.phone);
	const phone = phoneRaw.slice(0, 40);
	const service = (body.service || '').trim().slice(0, 160);
	const message = (body.message || body.description || '').trim().slice(0, 4000);
	const page = (body.page || '/contact-form').slice(0, 300);
	const session = (body.session || '').slice(0, 120);
	const source = (body.source || body.utm_source || 'web').slice(0, 120);
	if (!name || !service || !message || (!phone && !email)) {
		return j({ error: 'Missing required fields' }, 400);
	}

	const dup = await findDuplicate(env, phoneDigits, email, service, message);

	const leadRecord = {
		name,
		email,
		phone,
		city: (body.city || '').slice(0, 160),
		zip: (body.zip || '').slice(0, 40),
		service,
		page,
		session,
		source,
		message,
		utm_source: body.utm_source || '',
		utm_medium: body.utm_medium || '',
		utm_campaign: body.utm_campaign || '',
		gclid: body.gclid || '',
		referrer: body.referrer || ''
	};

	let lead_id: string | undefined;
	if (!dup) {
		try {
			lead_id = await insertLead(env, leadRecord);
			await insertEvent(env, leadRecord);
		} catch (e) {
			return j({ error: 'database_error' }, 500);
		}
	}

	const risk = riskScore(message, body);

	// Fire and forget async side-effects
	request.signal.addEventListener('abort', () => { /* ignore */ });
	await Promise.all([
		sendAdminEmail(env, { ...leadRecord, lead_id }, risk),
		queueCustomerAutoReply(env, leadRecord),
		fanOutAnalytics(env, leadRecord)
	]);

	return j({ ok: true, lead_id, duplicate: dup, risk_score: risk.score, risk_reasons: risk.reasons });
}

