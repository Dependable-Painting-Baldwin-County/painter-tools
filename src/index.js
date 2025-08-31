import { Hono } from 'hono';
import { serveStatic } from 'hono/cloudflare-workers';
const app = new Hono();
// Contact/lead form
app.post('/api/estimate', async (c) => {
	const env = c.env;
	let body;
	try {
		body = await c.req.json();
	} catch (e) {
		return c.json({ error: 'Invalid JSON' }, 400);
	}
	const leadData = {
		name: (body.name || '').trim(),
		email: (body.email || '').trim(),
		phone: (body.phone || '').trim(),
		city: (body.city || '').trim(),
		service: (body.service || '').trim(),
		message: (body.description || body.message || '').trim(),
		page: (body.page || '/contact-form').trim(),
		session: (body.session || '').trim(),
		source: body.source || 'web',
		utm_source: body.utm_source || '',
		utm_medium: body.utm_medium || '',
		utm_campaign: body.utm_campaign || '',
		gclid: body.gclid || '',
		ip: c.req.header('CF-Connecting-IP') || '',
		ua: c.req.header('User-Agent') || ''
	};
	if (!leadData.name || !leadData.city || !leadData.service || !leadData.message || (!leadData.phone && !leadData.email)) {
		return c.json({ error: 'Missing required fields.' }, 400);
	}
	// Insert into DB
	try {
		await env.DB.prepare(
			`INSERT INTO leads (name, email, phone, service, message, source, utm_source, utm_medium, utm_campaign, gclid, page, session, ip, ua)
			 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
		).bind(
			leadData.name,
			leadData.email,
			leadData.phone,
			leadData.service,
			leadData.message,
			leadData.source,
			leadData.utm_source,
			leadData.utm_medium,
			leadData.utm_campaign,
			leadData.gclid,
			leadData.page,
			leadData.session,
			leadData.ip,
			leadData.ua
		).run();
	} catch (e) {
		return c.json({ error: 'Database operation failed.' }, 500);
	}
	// Notify admin (simple email)
	try {
		if (env.SEB && env.SEB.send) {
			const subject = `New Lead: ${leadData.service || 'General'} — ${leadData.name || 'Unknown'}`;
			const text = [
				`You have a new lead from your website contact form!`,
				`--------------------------------`,
				`Name: ${leadData.name || '-'}`,
				`Email: ${leadData.email || '-'}`,
				`Phone: ${leadData.phone || '-'}`,
				`City: ${leadData.city || '-'}`,
				`Service of Interest: ${leadData.service || '-'}`,
				`Message: ${leadData.message || '-'}`,
				`--------------------------------`,
				`Submitted from page: ${leadData.page || '-'}`,
				`UTM Source: ${leadData.utm_source || '-'}`,
				`Session ID: ${leadData.session || '-'}`,
				`IP: ${leadData.ip || '-'}`,
				`UA: ${leadData.ua || '-'}`
			].join('\n');
			const from = env.FROM_ADDR || 'no-reply@dependablepainting.work';
			const to = env.ADMIN_EMAIL || env.OWNER_EMAIL || env.TO_ADDR || 'just-paint-it@dependablepainting.work';
			const msg = new EmailMessage(from, to, subject);
			msg.setBody('text/plain', text);
			await env.SEB.send({
				personalizations: [{ to: [{ email: env.DESTINATION }] }],
				from: { email: env.SENDER, name: env.SITE_NAME || "Dependable Painting" },
				subject: "New Lead Submission",
				content: [{ type: "text/plain", value: emailBody }]
			});
		}
	} catch (e) {
		// Log but do not fail the request
	}
	// Auto-reply to customer
	try {
		const to = (leadData.email || '').trim();
		if (to && env.SEB && env.SEB.send) {
			const subject = `Thanks for contacting ${env.SITE_NAME || 'Dependable Painting'}`;
			const html = `<p>Hi ${leadData.name || 'there'},</p><p>We received your request and will be in touch within the hour.</p><p>If you need us now, call <strong>(251) 525-4405</strong>.</p><p>— ${env.SITE_NAME || 'Dependable Painting'}</p>`;
			const from = `${env.SITE_NAME || 'Dependable Painting'} <${env.FROM_ADDR || 'no-reply@dependablepainting.work'}>`;
			const msg = new EmailMessage(env.FROM_ADDR || 'no-reply@dependablepainting.work', to, subject);
			msg.setBody('text/html', html);
			await env.SEB.send({
				personalizations: [{ to: [{ email: lead.email }] }],
				from: { email: env.SENDER, name: env.SITE_NAME || "Dependable Painting" },
				subject: "Thank you for contacting us!",
				content: [{ type: "text/plain", value: autoReplyBody }]
			});
		}
	} catch (e) {
		// Log but do not fail the request
	}
	// Thank you redirect
	return c.json({ success: true, redirect: env.THANK_YOU_URL || '/thank-you' });
});

// Paint Guru chat
app.post('/api/chat', async (c) => {
	const env = c.env;
	let body;
	try {
		body = await c.req.json();
	} catch (e) {
		return c.json({ error: 'Invalid JSON' }, 400);
	}
	const userMsg = (body.message || '').toString().slice(0, 8000);
	if (!userMsg) return c.json({ error: 'message required' }, 400);

	// Enhanced, fact-based system prompt
	const systemPrompt = `You are Paint Guru, the expert operator and assistant for Dependable Painting. You:
- Only answer with facts about painting, surfaces, materials, prep, application, and the painting industry.
- Are deeply knowledgeable about all painting services, surfaces (wood, drywall, brick, siding, cabinets, etc.), materials (paints, primers, stains, finishes), and the company Dependable Painting.
- Serve Baldwin & Mobile County, AL, and know the local context.
- Always clarify or ask follow-up questions if the user's request is unclear.
- For scheduling or quotes, suggest calling (251) 525-4405.
- If asked about your company, mention Dependable Painting's reputation for quality, reliability, and customer satisfaction.
- If you do not know the answer, say so and offer to connect the user with a human expert.
- Log every chat for quality and improvement.
- Always be helpful, concise, and professional.`;

	let reply = '';
	let aiProvider = '';
	try {
		if (env.AI) {
			// Workers AI (Claude, Llama, etc.)
			const aiResp = await env.AI.run({
				messages: [
					{ role: 'system', content: systemPrompt },
					{ role: 'user', content: userMsg }
				],
				model: env.AI_MODEL || 'gpt-4o',
				max_tokens: 512,
				temperature: env.AI_TEMP ? Number(env.AI_TEMP) : 0.3
			});
			reply = aiResp.choices?.[0]?.message?.content || '';
			aiProvider = 'workers-ai';
		} else if (env.OPENAI_API_KEY) {
			// OpenAI API fallback
			const resp = await fetch('https://api.openai.com/v1/chat/completions', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${env.OPENAI_API_KEY}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					model: env.OPENAI_MODEL || 'gpt-4o',
					messages: [
						{ role: 'system', content: systemPrompt },
						{ role: 'user', content: userMsg }
					],
					temperature: env.OPENAI_TEMP ? Number(env.OPENAI_TEMP) : 0.3,
					max_tokens: 512
				})
			});
			if (!resp.ok) {
				const tx = await resp.text().catch(() => '');
				return c.json({ error: `openai_error:${resp.status} ${tx.slice(0, 300)}` }, 502);
			}
			const data = await resp.json();
			reply = data?.choices?.[0]?.message?.content || '';
			aiProvider = 'openai';
		} else {
			return c.json({ error: 'No AI provider configured' }, 500);
		}
		// Log chat to D1
		try {
			await env.DB.prepare(
				`INSERT INTO chat_log (ts, session, question, answer, ai_provider, user_agent, page) VALUES (strftime('%Y-%m-%dT%H:%M:%fZ','now'),?,?,?,?,?,?)`
			).bind(
				body.session || '',
				userMsg,
				reply,
				aiProvider,
				c.req.header('User-Agent') || '',
				body.page || ''
			).run();
		} catch (e) {
			// Log error but do not fail chat
		}
		return c.json({ reply });
	} catch (e) {
		return c.json({ error: `ai_fail:${e.message}` }, 502);
	}
});

// Payment/charge
app.post('/api/charge', async (c) => {
	// TODO: Add payment logic (Stripe integration)
	return c.json({ success: false, message: 'Not implemented yet' }, 501);
});

// Analytics/event tracking
app.post('/api/track', async (c) => {
	const env = c.env;
	let body;
	try {
		body = await c.req.json();
	} catch (e) {
		return c.json({ error: 'Invalid JSON' }, 400);
	}
	// Store event in D1 (and DB_2 if available)
	const eventFields = [
		'type', 'page', 'service', 'source', 'device', 'city', 'country', 'session', 'referrer',
		'utm_source', 'utm_medium', 'utm_campaign', 'gclid', 'scroll_pct', 'clicks', 'call', 'duration_ms', 'button', 'zip', 'area'
	];
	const values = eventFields.map(f => body[f] ?? '');
	try {
		await env.DB.prepare(
			`INSERT INTO events (ts, ${eventFields.join(', ')}) VALUES (strftime('%Y-%m-%dT%H:%M:%fZ','now'), ${eventFields.map(() => '?').join(', ')})`
		).bind(...values).run();
		if (env.DB_2) {
			await env.DB_2.prepare(
				`INSERT INTO events (ts, ${eventFields.join(', ')}) VALUES (strftime('%Y-%m-%dT%H:%M:%fZ','now'), ${eventFields.map(() => '?').join(', ')})`
			).bind(...values).run();
		}
	} catch (e) {
		return c.json({ error: 'Database operation failed.' }, 500);
	}
	// Forward to GA4
	const measurement_id = 'G-CLK9PTRD5N';
	const api_secret = env.GA4_API_SECRET || '';
	const client_id = body.session || crypto.randomUUID();
	const ga4Params = {
		page_location: body.page || 'https://dependablepainting.work',
		page_referrer: body.referrer || '',
		session_id: body.session || '',
		engagement_time_msec: body.duration_ms ? String(body.duration_ms) : undefined,
		scroll_pct: body.scroll_pct,
		clicks: body.clicks,
		call: body.call,
		city: body.city,
		button: body.button,
		zip: body.zip,
		area: body.area
	};
	Object.keys(ga4Params).forEach(k => ga4Params[k] === undefined && delete ga4Params[k]);
	const ga4Payload = {
		client_id,
		events: [
			{
				name: body.type || 'event',
				params: ga4Params
			}
		]
	};
	try {
		if (api_secret) {
			const url = `https://www.google-analytics.com/mp/collect?measurement_id=${measurement_id}&api_secret=${api_secret}`;
			const resp = await fetch(url, {
				method: 'POST',
				body: JSON.stringify(ga4Payload),
				headers: { 'Content-Type': 'application/json' }
			});
			if (!resp.ok) {
				const tx = await resp.text().catch(() => '');
				return c.json({ error: `GA4 error: ${resp.status} ${tx.slice(0, 300)}` }, 502);
			}
		}
	} catch (e) {
		// Log but do not fail the request
	}
	return c.json({ ok: true });
});

// Form event
app.post('/api/form', async (c) => {
	// TODO: Add form event logic
	return c.json({ success: false, message: 'Not implemented yet' }, 501);
});

// Lead status
app.post('/api/lead-status', async (c) => {
	// TODO: Add lead status logic
	return c.json({ success: false, message: 'Not implemented yet' }, 501);
});

// Job event
app.post('/api/job', async (c) => {
	// TODO: Add job event logic
	return c.json({ success: false, message: 'Not implemented yet' }, 501);
});

// Stats
app.get('/api/stats', async (c) => {
	// TODO: Add stats logic
	return c.json({ success: false, message: 'Not implemented yet' }, 501);
});

// Call event
app.post('/api/call', async (c) => {
	// TODO: Add call event logic
	return c.json({ success: false, message: 'Not implemented yet' }, 501);
});

// Geo classify
app.get('/api/geo/classify', async (c) => {
	// TODO: Add geo classify logic
	return c.json({ success: false, message: 'Not implemented yet' }, 501);
});

// Health check
app.get('/api/health', (c) => c.json({ ok: true, ts: Date.now() }));

// Serve static assets from the public directory (fallback)
app.use('*', serveStatic({ root: './' }));

export default app;events(
  id, INTEGER, PRIMARY, KEY, AUTOINCREMENT,
  ts, TEXT,
  type, TEXT,
  page, TEXT,
  service, TEXT,
  source, TEXT,
  device, TEXT,
  city, TEXT,
  country, TEXT,
  session, TEXT,
  referrer, TEXT,
  utm_source, TEXT,
  utm_medium, TEXT,
  utm_campaign, TEXT,
  gclid, TEXT,
  scroll_pct, TEXT,
  clicks, TEXT,
  call, TEXT,
  duration_ms, TEXT,
  button, TEXT,
  zip, TEXT,
  area, TEXT
);

