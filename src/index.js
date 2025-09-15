import { Hono } from 'hono';
import { serveStatic } from 'hono/cloudflare-workers';
// Cloudflare Email (only if bound) — safe optional import
// eslint-disable-next-line import/no-unresolved
import { EmailMessage } from 'cloudflare:email';
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
		zip: (body.zip || '').trim(),
		service: (body.service || '').trim(),
		message: (body.description || body.message || '').trim(),
		page: (body.page || '/contact-form').trim(),
		session: (body.session || '').trim(),
		source: body.source || 'web',
		// Extra attribution fields (not stored directly in leads table). If needed later, create a leads_meta table.
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
	// Insert into DB (match schema in 0001_leads.sql)
	try {
		await env.DB.prepare(
			`INSERT INTO leads (name, email, phone, city, zip, service, page, session, source, message)
			 VALUES (?,?,?,?,?,?,?,?,?,?)`
		).bind(
			leadData.name,
			leadData.email,
			leadData.phone,
			leadData.city,
			leadData.zip,
			leadData.service,
			leadData.page,
			leadData.session,
			leadData.source,
			leadData.message
		).run();
	} catch (e) {
		console.error('D1 insert leads failed', e); // eslint-disable-line no-console
		return c.json({ error: 'Database operation failed.' }, 500);
	}
	// Notify admin (simple email)
	try {
		if (env.SEB && env.SEB.send) {
			const subject = `New Lead: ${leadData.service || 'General'} — ${leadData.name || 'Unknown'}`;
			const text = [
				'You have a new lead from your website contact form!',
				'--------------------------------',
				`Name: ${leadData.name || '-'}`,
				`Email: ${leadData.email || '-'}`,
				`Phone: ${leadData.phone || '-'}`,
				`City: ${leadData.city || '-'}`,
				`Service of Interest: ${leadData.service || '-'}`,
				`Message: ${leadData.message || '-'}`,
				'--------------------------------',
				`Submitted from page: ${leadData.page || '-'}`,
				`UTM Source: ${leadData.utm_source || '-'}`,
				`Session ID: ${leadData.session || '-'}`,
				`IP: ${leadData.ip || '-'}`,
				`UA: ${leadData.ua || '-'}`
			].join('\n');
			const from = env.FROM_ADDR || 'no-reply@dependablepainting.work';
			const to = env.ADMIN_EMAIL || env.OWNER_EMAIL || env.TO_ADDR || 'just-paint-it@dependablepainting.work';
			try {
				const msg = new EmailMessage(from, to, subject);
				msg.setBody('text/plain', text);
				await env.SEB.send(msg);
			} catch (inner) {
				// Fallback: attempt JSON payload (if binding expects raw API style)
				try { await env.SEB.send({ from, to, subject, content: text }); } catch (_) { /* swallow */ }
			}
		}
	} catch (e) {
		// Log but do not fail the request
		console.warn('Admin email send failed', e); // eslint-disable-line no-console
	}
	// Auto-reply to customer
	try {
		const to = (leadData.email || '').trim();
		if (to && env.SEB && env.SEB.send) {
			const subject = `Thanks for contacting ${env.SITE_NAME || 'Dependable Painting'}`;
			const html = `<p>Hi ${leadData.name || 'there'},</p><p>We received your request and will be in touch within the hour.</p><p>If you need us now, call <strong>(251) 525-4405</strong>.</p><p>— ${env.SITE_NAME || 'Dependable Painting'}</p>`;
			const fromAddr = env.FROM_ADDR || 'no-reply@dependablepainting.work';
			try {
				const msg = new EmailMessage(fromAddr, to, subject);
				msg.setBody('text/html', html);
				await env.SEB.send(msg);
			} catch (inner) {
				try { await env.SEB.send({ from: fromAddr, to, subject, html }); } catch (_) { /* swallow */ }
			}
		}
	} catch (e) {
		// Log but do not fail the request
		console.warn('Auto-reply email send failed', e); // eslint-disable-line no-console
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
			// Workers AI (Llama, etc.)
			try {
				const aiResp = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
					messages: [
						{ role: 'system', content: systemPrompt },
						{ role: 'user', content: userMsg }
					],
					max_tokens: 512,
					temperature: env.AI_TEMP ? Number(env.AI_TEMP) : 0.3
				});
				reply = aiResp.response || '';
				aiProvider = 'workers-ai';
			} catch (aiError) {
				// If AI fails (e.g., not logged in), fall back to local responses
				console.warn('Workers AI failed, falling back to local responses:', aiError.message);
				throw new Error('ai_fallback');
			}
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
			// Development fallback when no AI provider is configured
			const lowerMsg = userMsg.toLowerCase();
			if (lowerMsg.includes('paint') && (lowerMsg.includes('type') || lowerMsg.includes('kind') || lowerMsg.includes('brand'))) {
				reply = 'We primarily use high-quality Sherwin-Williams paints for all our projects. Sherwin-Williams offers excellent durability, coverage, and color selection. For exterior surfaces, we recommend their Duration or SuperPaint lines which provide superior weather resistance and long-lasting protection.';
			} else if (lowerMsg.includes('exterior') && lowerMsg.includes('paint')) {
				reply = 'For exterior painting, we use premium weather-resistant paints like Sherwin-Williams Duration or SuperPaint. These provide excellent protection against Alabama\'s humid climate, UV rays, and temperature changes. We also ensure proper surface preparation including pressure washing, scraping, priming, and caulking for the best results.';
			} else if (lowerMsg.includes('interior') && lowerMsg.includes('paint')) {
				reply = 'For interior painting, we use high-quality Sherwin-Williams paints like ProClassic for trim and SuperPaint for walls. These provide smooth application, excellent coverage, and durability. We offer various finishes from flat to semi-gloss depending on the room and your preferences.';
			} else if (lowerMsg.includes('cabinet')) {
				reply = 'Cabinet painting requires specialized techniques and products. We use Sherwin-Williams ProClassic or Emerald Urethane for cabinets, which provide a smooth, durable finish that resists chips and scratches. The process includes thorough cleaning, sanding, priming, and multiple thin coats for a factory-like finish.';
			} else if (lowerMsg.includes('cost') || lowerMsg.includes('price') || lowerMsg.includes('estimate')) {
				reply = 'Pricing varies based on the size, condition, and complexity of your project. For standard interior rooms, we offer packages starting at $400. For accurate pricing, I recommend getting a free estimate by calling (251) 525-4405 or using our contact form. We provide detailed, transparent quotes with no hidden fees.';
			} else if (lowerMsg.includes('area') || lowerMsg.includes('service') || lowerMsg.includes('location')) {
				reply = 'We proudly serve Baldwin and Mobile Counties in Alabama, including Fairhope, Daphne, Spanish Fort, Mobile, and Bay Minette. We do not service Gulf Shores or Orange Beach for residential projects. Call (251) 525-4405 to confirm we serve your specific area.';
			} else {
				reply = 'I\'m here to help with questions about painting services, materials, processes, and our service areas. For specific quotes or scheduling, please call (251) 525-4405 or use our contact form. What specific painting question can I help you with?';
			}
			aiProvider = 'fallback';
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
		if (e.message === 'ai_fallback') {
			// Use development fallback when AI services fail
			const lowerMsg = userMsg.toLowerCase();
			if (lowerMsg.includes('paint') && (lowerMsg.includes('type') || lowerMsg.includes('kind') || lowerMsg.includes('brand'))) {
				reply = 'We primarily use high-quality Sherwin-Williams paints for all our projects. Sherwin-Williams offers excellent durability, coverage, and color selection. For exterior surfaces, we recommend their Duration or SuperPaint lines which provide superior weather resistance and long-lasting protection.';
			} else if (lowerMsg.includes('exterior') && lowerMsg.includes('paint')) {
				reply = 'For exterior painting, we use premium weather-resistant paints like Sherwin-Williams Duration or SuperPaint. These provide excellent protection against Alabama\'s humid climate, UV rays, and temperature changes. We also ensure proper surface preparation including pressure washing, scraping, priming, and caulking for the best results.';
			} else if (lowerMsg.includes('interior') && lowerMsg.includes('paint')) {
				reply = 'For interior painting, we use high-quality Sherwin-Williams paints like ProClassic for trim and SuperPaint for walls. These provide smooth application, excellent coverage, and durability. We offer various finishes from flat to semi-gloss depending on the room and your preferences.';
			} else if (lowerMsg.includes('cabinet')) {
				reply = 'Cabinet painting requires specialized techniques and products. We use Sherwin-Williams ProClassic or Emerald Urethane for cabinets, which provide a smooth, durable finish that resists chips and scratches. The process includes thorough cleaning, sanding, priming, and multiple thin coats for a factory-like finish.';
			} else if (lowerMsg.includes('cost') || lowerMsg.includes('price') || lowerMsg.includes('estimate')) {
				reply = 'Pricing varies based on the size, condition, and complexity of your project. For standard interior rooms, we offer packages starting at $400. For accurate pricing, I recommend getting a free estimate by calling (251) 525-4405 or using our contact form. We provide detailed, transparent quotes with no hidden fees.';
			} else if (lowerMsg.includes('area') || lowerMsg.includes('service') || lowerMsg.includes('location')) {
				reply = 'We proudly serve Baldwin and Mobile Counties in Alabama, including Fairhope, Daphne, Spanish Fort, Mobile, and Bay Minette. We do not service Gulf Shores or Orange Beach for residential projects. Call (251) 525-4405 to confirm we serve your specific area.';
			} else {
				reply = 'I\'m here to help with questions about painting services, materials, processes, and our service areas. For specific quotes or scheduling, please call (251) 525-4405 or use our contact form. What specific painting question can I help you with?';
			}
			aiProvider = 'fallback';
			
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
		} else {
			console.error('Chat AI error:', e); // Log the actual error
			return c.json({ error: `ai_fail:${e.message}` }, 502);
		}
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
	// Normalize & map to lead_events schema (0001_leads.sql)
	const now = new Date();
	const iso = now.toISOString();
	const day = iso.slice(0, 10); // YYYY-MM-DD
	const hour = iso.slice(11, 13); // HH
	const record = {
		// required
		type: (body.type || 'event').toString().slice(0, 50),
		// optional mapped fields
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
		}
	} catch (e) {
		console.error('D1 insert lead_events failed', e); // eslint-disable-line no-console
		return c.json({ error: 'Database operation failed.' }, 500);
	}
	// Forward to GA4
	const measurement_id = 'G-CLK9PTRD5N';
	const api_secret = env.GA4_API_SECRET || '';
	const client_id = body.session || crypto.randomUUID();
	const ga4Params = {
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
app.use('*', serveStatic({ root: './public' }));

export default app;

