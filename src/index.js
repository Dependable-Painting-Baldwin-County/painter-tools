import { Hono } from 'hono';
import { serveStatic } from 'hono/cloudflare-workers';
// Cloudflare Email (only if bound) — safe optional import
// eslint-disable-next-line import/no-unresolved
import { EmailMessage } from 'cloudflare:email';

const app = new Hono();

// Utility functions
async function parseBody(c) {
	const contentType = c.req.header('content-type') || '';
	
	if (contentType.includes('application/json')) {
		return await c.req.json();
	} else if (contentType.includes('application/x-www-form-urlencoded')) {
		const formData = await c.req.formData();
		const body = {};
		for (const [key, value] of formData.entries()) {
			body[key] = value;
		}
		return body;
	} else if (contentType.includes('multipart/form-data')) {
		const formData = await c.req.formData();
		const body = {};
		for (const [key, value] of formData.entries()) {
			body[key] = value;
		}
		return body;
	} else {
		// Default to JSON parsing
		return await c.req.json();
	}
}

function validateLead(leadData) {
	const errors = [];
	
	if (!leadData.name || leadData.name.trim().length < 2) {
		errors.push('Name is required and must be at least 2 characters');
	}
	if (!leadData.city || leadData.city.trim().length < 2) {
		errors.push('City is required');
	}
	if (!leadData.service || leadData.service.trim().length < 2) {
		errors.push('Service type is required');
	}
	if (!leadData.message || leadData.message.trim().length < 10) {
		errors.push('Message is required and must be at least 10 characters');
	}
	if (!leadData.phone && !leadData.email) {
		errors.push('Either phone number or email is required');
	}
	if (leadData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(leadData.email)) {
		errors.push('Please provide a valid email address');
	}
	
	// Honeypot validation - these fields should be empty
	if (leadData.company || leadData.website || leadData.url) {
		errors.push('spam_detected');
	}
	
	// Timestamp validation for bot detection
	if (leadData.form_timestamp) {
		const now = Date.now();
		const formTime = parseInt(leadData.form_timestamp);
		const timeDiff = now - formTime;
		
		// Form filled too quickly (less than 3 seconds) or too slowly (more than 1 hour)
		if (timeDiff < 3000 || timeDiff > 3600000) {
			errors.push('invalid_timing');
		}
	}
	
	return errors;
}

async function sendEmail(env, { to, subject, text, html }) {
	if (!env.SEB || !env.SEB.send) return false;
	
	const from = env.FROM_ADDR || 'no-reply@dependablepainting.work';
	
	try {
		const msg = new EmailMessage(from, to, subject);
		if (html) {
			msg.setBody('text/html', html);
		} else {
			msg.setBody('text/plain', text);
		}
		await env.SEB.send(msg);
		return true;
	} catch (e) {
		// Fallback: attempt JSON payload style
		try {
			await env.SEB.send({ from, to, subject, content: text || html });
			return true;
		} catch (_) {
			console.warn('Email send failed', e);
			return false;
		}
	}
}

// Simple rate limiting using KV
async function rateLimit(env, ip, maxRequests = 5, windowMs = 60000) {
	if (!env.PAINTER_KV) return true; // Allow if no KV available
	
	const key = `rate_limit:${ip}`;
	const now = Date.now();
	
	try {
		const data = await env.PAINTER_KV.get(key, 'json');
		if (!data) {
			await env.PAINTER_KV.put(key, JSON.stringify({ count: 1, resetTime: now + windowMs }), { expirationTtl: Math.ceil(windowMs / 1000) });
			return true;
		}
		
		if (now > data.resetTime) {
			await env.PAINTER_KV.put(key, JSON.stringify({ count: 1, resetTime: now + windowMs }), { expirationTtl: Math.ceil(windowMs / 1000) });
			return true;
		}
		
		if (data.count >= maxRequests) {
			return false;
		}
		
		data.count++;
		await env.PAINTER_KV.put(key, JSON.stringify(data), { expirationTtl: Math.ceil((data.resetTime - now) / 1000) });
		return true;
	} catch (e) {
		console.warn('Rate limiting failed', e);
		return true; // Allow on error
	}
}

// Knowledge base for AI chat
function buildKnowledgeContext() {
	return `
DEPENDABLE PAINTING COMPANY KNOWLEDGE BASE:

COMPANY INFO:
- Business: Dependable Painting (serving Baldwin & Mobile County, AL)
- Phone: (251) 525-4405 
- Primary Contact: (251) 289-1347
- Location: Bay Minette, AL 36507
- Website: https://dependablepainting.work
- Reputation: Known for quality, reliability, and customer satisfaction

SERVICES OFFERED:
1. Interior Painting
   - Walls, ceilings, trim, doors
   - Cabinet painting and refinishing
   - Specialty finishes and textures
   - Color consultation

2. Exterior Painting  
   - House siding (wood, vinyl, fiber cement, brick)
   - Trim, shutters, doors
   - Deck and fence staining
   - Pressure washing prep

3. Commercial Painting
   - Office buildings, retail spaces
   - Warehouses and industrial facilities
   - Multi-unit residential complexes

4. Specialty Services
   - Cabinet refinishing and painting
   - Wood staining and restoration
   - Drywall repair and texture matching
   - Power washing

SURFACES & MATERIALS:
- Wood siding, trim, decks, cabinets
- Drywall and plaster walls
- Brick and masonry
- Vinyl and fiber cement siding
- Metal surfaces
- Various paint types: latex, oil-based, specialty finishes

PROCESS:
1. Free estimate and consultation
2. Surface preparation (crucial step)
3. Primer application when needed
4. Quality paint application
5. Clean-up and final inspection

PRICING PACKAGES (Interior):
- Walls Only: Starting at $400
- Walls & Ceiling: Starting at $550  
- The Works (full room): Starting at $625
- Prices vary by room size, condition, and additional services

LOCAL KNOWLEDGE:
- Serves Baldwin County and Mobile County, Alabama
- Understands local climate challenges (humidity, salt air near coast)
- Familiar with common local home styles and materials
- Licensed and insured in Alabama
`;
}

function buildSystemPrompt() {
	const knowledgeBase = buildKnowledgeContext();
	
	return `You are Paint Guru, the expert assistant for Dependable Painting. You have access to comprehensive knowledge about the company and painting industry.

${knowledgeBase}

INSTRUCTIONS:
- Only answer with facts about painting, surfaces, materials, prep, application, and Dependable Painting
- Use the knowledge base above to provide accurate information about services and company
- Always clarify or ask follow-up questions if the user's request is unclear
- For scheduling or quotes, direct them to call (251) 525-4405
- If asked about the company, mention Dependable Painting's reputation for quality, reliability, and customer satisfaction
- If you don't know something not covered in the knowledge base, say so and offer to connect them with a human expert
- Always be helpful, concise, and professional
- Log every chat for quality and improvement`;
}
// Contact/lead form with enhanced validation and spam protection
app.post('/api/estimate', async (c) => {
	const env = c.env;
	const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || '';
	
	// Rate limiting
	const rateLimitOk = await rateLimit(env, ip, 5, 300000); // 5 requests per 5 minutes
	if (!rateLimitOk) {
		return c.json({ error: 'too_many_requests', message: 'Too many requests. Please try again later.' }, 429);
	}
	
	let body;
	try {
		body = await parseBody(c);
	} catch (e) {
		return c.json({ error: 'invalid_data', message: 'Invalid form data' }, 400);
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
		// Honeypot fields for spam detection
		company: body.company || '',
		website: body.website || '',
		url: body.url || '',
		form_timestamp: body.form_timestamp || '',
		// Extra attribution fields
		utm_source: body.utm_source || '',
		utm_medium: body.utm_medium || '',
		utm_campaign: body.utm_campaign || '',
		gclid: body.gclid || '',
		ip,
		ua: c.req.header('User-Agent') || ''
	};
	
	// Validation with detailed error messages
	const validationErrors = validateLead(leadData);
	if (validationErrors.length > 0) {
		if (validationErrors.includes('spam_detected') || validationErrors.includes('invalid_timing')) {
			// Silent rejection for suspected spam
			return c.json({ success: true, redirect: env.THANK_YOU_URL || '/thank-you' });
		}
		return c.json({ 
			error: 'validation_failed', 
			message: 'Please correct the following issues:', 
			details: validationErrors 
		}, 400);
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
		return c.json({ error: 'database_error', message: 'Unable to save your request. Please try again.' }, 500);
	}
	
	// Notify admin with enhanced email
	try {
		const to = env.ADMIN_EMAIL || env.OWNER_EMAIL || env.TO_ADDR || 'just-paint-it@dependablepainting.work';
		const subject = `🎨 New Lead: ${leadData.service || 'General'} — ${leadData.name || 'Unknown'}`;
		const text = [
			'🎨 NEW LEAD FROM WEBSITE 🎨',
			'========================================',
			'',
			'CONTACT INFORMATION:',
			`Name: ${leadData.name || '-'}`,
			`Email: ${leadData.email || '-'}`,
			`Phone: ${leadData.phone || '-'}`,
			`City: ${leadData.city || '-'}`,
			`Zip: ${leadData.zip || '-'}`,
			'',
			'SERVICE REQUEST:',
			`Service of Interest: ${leadData.service || '-'}`,
			`Message: ${leadData.message || '-'}`,
			'',
			'TRACKING INFO:',
			`Submitted from page: ${leadData.page || '-'}`,
			`UTM Source: ${leadData.utm_source || '-'}`,
			`UTM Medium: ${leadData.utm_medium || '-'}`,
			`UTM Campaign: ${leadData.utm_campaign || '-'}`,
			`Session ID: ${leadData.session || '-'}`,
			`IP Address: ${leadData.ip || '-'}`,
			`User Agent: ${leadData.ua || '-'}`,
			'',
			'⚡ Respond within 1 hour for best conversion rates!'
		].join('\n');
		
		await sendEmail(env, { to, subject, text });
	} catch (e) {
		console.warn('Admin email send failed', e); // eslint-disable-line no-console
	}
	
	// Auto-reply to customer with enhanced content
	try {
		const to = (leadData.email || '').trim();
		if (to) {
			const subject = `Thanks for contacting ${env.SITE_NAME || 'Dependable Painting'}!`;
			const html = `
				<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
					<h2 style="color: #ff3b3b;">Thank you, ${leadData.name || 'there'}!</h2>
					<p>We received your request for <strong>${leadData.service || 'painting services'}</strong> and appreciate you choosing Dependable Painting.</p>
					<p><strong>What happens next:</strong></p>
					<ul>
						<li>We'll review your request and call you within the hour</li>
						<li>We can schedule a free, no-obligation estimate</li>
						<li>All our work is backed by our satisfaction guarantee</li>
					</ul>
					<p><strong>Need immediate assistance?</strong><br>
					Call us now at <a href="tel:+12515254405" style="color: #ff3b3b; font-weight: bold;">(251) 525-4405</a></p>
					<p style="margin-top: 20px; font-size: 14px; color: #666;">
						— The team at ${env.SITE_NAME || 'Dependable Painting'}<br>
						Serving Baldwin & Mobile County, AL
					</p>
				</div>
			`;
			
			await sendEmail(env, { to, subject, html });
		}
	} catch (e) {
		console.warn('Auto-reply email send failed', e); // eslint-disable-line no-console
	}
	
	// Handle redirect based on Accept header
	const acceptHeader = c.req.header('Accept') || '';
	const redirectUrl = env.THANK_YOU_URL || '/thank-you';
	
	if (acceptHeader.includes('text/html')) {
		// Browser form submission - send redirect response
		return c.redirect(redirectUrl, 303);
	} else {
		// JSON API call - return success with redirect URL
		return c.json({ success: true, redirect: redirectUrl });
	}
});

// Paint Guru chat with enhanced knowledge base
app.post('/api/chat', async (c) => {
	const env = c.env;
	let body;
	try {
		body = await parseBody(c);
	} catch (e) {
		return c.json({ error: 'invalid_data', message: 'Invalid JSON data' }, 400);
	}
	
	const userMsg = (body.message || '').toString().slice(0, 8000);
	const hasImage = body.image_url || body.image;
	
	if (!userMsg) {
		return c.json({ error: 'missing_message', message: 'Message is required' }, 400);
	}

	// Build enhanced system prompt with knowledge base
	const systemPrompt = buildSystemPrompt();

	let reply = '';
	let aiProvider = '';
	let imageSupported = false;
	
	try {
		if (env.AI) {
			// Workers AI - check if model supports images
			const model = env.AI_MODEL || '@cf/meta/llama-3.2-11b-vision-instruct';
			imageSupported = model.includes('vision') || model.includes('gpt-4');
			
			const messages = [
				{ role: 'system', content: systemPrompt },
				{ role: 'user', content: userMsg }
			];
			
			// Add image if provided and supported
			if (hasImage && imageSupported && body.image_url) {
				messages[1].content = [
					{ type: 'text', text: userMsg },
					{ type: 'image_url', image_url: { url: body.image_url } }
				];
			}
			
			const aiResp = await env.AI.run({
				messages,
				model,
				max_tokens: 512,
				temperature: env.AI_TEMP ? Number(env.AI_TEMP) : 0.3
			});
			
			reply = aiResp.choices?.[0]?.message?.content || '';
			aiProvider = 'workers-ai';
			
		} else if (env.OPENAI_API_KEY) {
			// OpenAI API fallback
			const model = env.OPENAI_MODEL || 'gpt-4o';
			imageSupported = model.includes('gpt-4') && (model.includes('vision') || model.includes('4o'));
			
			const messages = [
				{ role: 'system', content: systemPrompt },
				{ role: 'user', content: userMsg }
			];
			
			// Add image if provided and supported
			if (hasImage && imageSupported && body.image_url) {
				messages[1].content = [
					{ type: 'text', text: userMsg },
					{ type: 'image_url', image_url: { url: body.image_url } }
				];
			}
			
			const resp = await fetch('https://api.openai.com/v1/chat/completions', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${env.OPENAI_API_KEY}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					model,
					messages,
					temperature: env.OPENAI_TEMP ? Number(env.OPENAI_TEMP) : 0.3,
					max_tokens: 512
				})
			});
			
			if (!resp.ok) {
				const tx = await resp.text().catch(() => '');
				console.error('OpenAI API error:', resp.status, tx);
				return c.json({ error: 'ai_provider_error', message: 'AI service temporarily unavailable' }, 502);
			}
			
			const data = await resp.json();
			reply = data?.choices?.[0]?.message?.content || '';
			aiProvider = 'openai';
			
		} else {
			return c.json({ error: 'no_ai_provider', message: 'AI chat service is not configured' }, 500);
		}
		
		// Enhanced chat logging with more details
		try {
			const logData = {
				ts: new Date().toISOString(),
				session: body.session || '',
				question: userMsg,
				answer: reply,
				ai_provider: aiProvider,
				user_agent: c.req.header('User-Agent') || '',
				page: body.page || '',
				has_image: hasImage ? 1 : 0,
				image_supported: imageSupported ? 1 : 0,
				ip: c.req.header('CF-Connecting-IP') || '',
				response_length: reply.length
			};
			
			await env.DB.prepare(
				`INSERT INTO chat_log (ts, session, question, answer, ai_provider, user_agent, page) VALUES (?,?,?,?,?,?,?)`
			).bind(
				logData.ts,
				logData.session,
				logData.question,
				logData.answer,
				logData.ai_provider,
				logData.user_agent,
				logData.page
			).run();
		} catch (e) {
			console.warn('Chat logging failed', e);
		}
		
		// Add helpful message if image was provided but not supported
		if (hasImage && !imageSupported) {
			reply += '\n\n(Note: I can see you tried to share an image, but I can\'t process images with the current AI model. Please describe what you\'d like help with in text, and I\'ll be happy to assist!)';
		}
		
		return c.json({ 
			reply,
			provider: aiProvider,
			image_supported: imageSupported
		});
		
	} catch (e) {
		console.error('AI chat error:', e);
		return c.json({ 
			error: 'ai_processing_error', 
			message: 'I\'m having trouble processing your request right now. Please try again or call us at (251) 525-4405 for immediate assistance.' 
		}, 502);
	}
});

// Stripe Payment Processing with Payment Intents
app.post('/api/charge', async (c) => {
	const env = c.env;
	
	if (!env.STRIPE_SECRET_KEY) {
		return c.json({ error: 'payment_not_configured', message: 'Payment processing is not configured' }, 500);
	}
	
	let body;
	try {
		body = await parseBody(c);
	} catch (e) {
		return c.json({ error: 'invalid_data', message: 'Invalid request data' }, 400);
	}
	
	const {
		payment_method_id,
		amount,
		currency = 'usd',
		name,
		email,
		address,
		package: packageType,
		description
	} = body;
	
	// Validation
	if (!payment_method_id || !amount || !name || !email) {
		return c.json({ 
			error: 'missing_required_fields', 
			message: 'Payment method, amount, name, and email are required' 
		}, 400);
	}
	
	if (amount < 50 || amount > 500000) { // $0.50 to $5000.00
		return c.json({ 
			error: 'invalid_amount', 
			message: 'Amount must be between $0.50 and $5,000.00' 
		}, 400);
	}
	
	try {
		// Create Payment Intent with Stripe
		const paymentIntentData = {
			amount: Math.round(amount * 100), // Convert to cents
			currency,
			payment_method: payment_method_id,
			confirmation_method: 'manual',
			confirm: true,
			description: description || `${packageType || 'Painting Service'} - ${name}`,
			receipt_email: email,
			metadata: {
				customer_name: name,
				customer_email: email,
				package_type: packageType || 'custom',
				address: address || ''
			}
		};
		
		const stripeResponse = await fetch('https://api.stripe.com/v1/payment_intents', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: new URLSearchParams(paymentIntentData).toString()
		});
		
		const paymentIntent = await stripeResponse.json();
		
		if (!stripeResponse.ok) {
			console.error('Stripe API error:', paymentIntent);
			return c.json({ 
				error: 'payment_processing_error', 
				message: paymentIntent.error?.message || 'Payment processing failed' 
			}, 400);
		}
		
		// Handle different payment statuses
		if (paymentIntent.status === 'succeeded') {
			// Payment successful - log to database
			try {
				await env.DB.prepare(
					`INSERT INTO orders (stripe_payment_intent_id, amount, currency, customer_name, customer_email, package_type, service_address, status, created_at)
					 VALUES (?,?,?,?,?,?,?,?,?)`
				).bind(
					paymentIntent.id,
					amount,
					currency,
					name,
					email,
					packageType || 'custom',
					address || '',
					'completed',
					new Date().toISOString()
				).run();
			} catch (dbError) {
				console.error('Failed to log order to database:', dbError);
				// Don't fail the payment, just log the error
			}
			
			// Send success notification email to admin
			try {
				const adminSubject = `💳 Payment Received: $${amount} - ${name}`;
				const adminText = [
					'PAYMENT RECEIVED!',
					'==================',
					'',
					`Amount: $${amount} ${currency.toUpperCase()}`,
					`Customer: ${name}`,
					`Email: ${email}`,
					`Package: ${packageType || 'Custom'}`,
					`Address: ${address || 'Not provided'}`,
					`Payment Intent ID: ${paymentIntent.id}`,
					'',
					'Customer has been charged successfully.'
				].join('\n');
				
				const adminEmail = env.ADMIN_EMAIL || env.OWNER_EMAIL || 'just-paint-it@dependablepainting.work';
				await sendEmail(env, { to: adminEmail, subject: adminSubject, text: adminText });
			} catch (emailError) {
				console.warn('Failed to send admin notification:', emailError);
			}
			
			// Send receipt to customer
			try {
				const customerSubject = `Payment Confirmation - ${env.SITE_NAME || 'Dependable Painting'}`;
				const customerHtml = `
					<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
						<h2 style="color: #ff3b3b;">Payment Confirmed!</h2>
						<p>Dear ${name},</p>
						<p>Thank you for your payment. Here are the details:</p>
						<div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
							<p><strong>Amount:</strong> $${amount} ${currency.toUpperCase()}</p>
							<p><strong>Package:</strong> ${packageType || 'Custom Service'}</p>
							<p><strong>Transaction ID:</strong> ${paymentIntent.id}</p>
						</div>
						<p>We'll be in touch shortly to schedule your service.</p>
						<p>Questions? Call us at <a href="tel:+12515254405" style="color: #ff3b3b;">(251) 525-4405</a></p>
						<p style="margin-top: 20px; font-size: 14px; color: #666;">
							— ${env.SITE_NAME || 'Dependable Painting'}<br>
							Bay Minette, AL
						</p>
					</div>
				`;
				
				await sendEmail(env, { to: email, subject: customerSubject, html: customerHtml });
			} catch (emailError) {
				console.warn('Failed to send customer receipt:', emailError);
			}
			
			return c.json({
				success: true,
				payment_intent_id: paymentIntent.id,
				status: paymentIntent.status,
				message: 'Payment successful!'
			});
			
		} else if (paymentIntent.status === 'requires_action') {
			// 3D Secure authentication required
			return c.json({
				success: false,
				requires_action: true,
				client_secret: paymentIntent.client_secret,
				message: 'Additional authentication required'
			});
			
		} else {
			// Payment failed or requires additional steps
			return c.json({
				success: false,
				error: 'payment_failed',
				message: 'Payment could not be processed',
				status: paymentIntent.status
			}, 400);
		}
		
	} catch (error) {
		console.error('Payment processing error:', error);
		return c.json({ 
			error: 'payment_system_error', 
			message: 'Payment system temporarily unavailable. Please try again.' 
		}, 500);
	}
});

// Dynamic configuration endpoint for client-side JavaScript
app.get('/config.js', (c) => {
	const env = c.env;
	
	// Set appropriate headers for JavaScript file
	c.header('Content-Type', 'application/javascript');
	c.header('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
	
	const config = {
		STRIPE_PUBLISHABLE_KEY: env.STRIPE_PUBLISHABLE_KEY || '',
		GA4_MEASUREMENT_ID: env.GA4_MEASUREMENT_ID || 'G-CLK9PTRD5N',
		SITE_NAME: env.SITE_NAME || 'Dependable Painting',
		PHONE: env.BUSINESS_PHONE || '(251) 525-4405',
		PHONE_HREF: env.BUSINESS_PHONE_HREF || 'tel:+12515254405'
	};
	
	const jsContent = `// Dynamic configuration - generated server-side
window.APP_CONFIG = ${JSON.stringify(config, null, 2)};

// Helper functions
window.APP_CONFIG.getStripeKey = () => window.APP_CONFIG.STRIPE_PUBLISHABLE_KEY;
window.APP_CONFIG.getGA4Id = () => window.APP_CONFIG.GA4_MEASUREMENT_ID;
window.APP_CONFIG.getSiteName = () => window.APP_CONFIG.SITE_NAME;
window.APP_CONFIG.getPhone = () => window.APP_CONFIG.PHONE;
window.APP_CONFIG.getPhoneHref = () => window.APP_CONFIG.PHONE_HREF;
`;
	
	return c.text(jsContent);
});

// Analytics ping endpoint for heartbeat and version tracking
app.post('/api/analytics/ping', async (c) => {
	const env = c.env;
	let body;
	
	try {
		body = await parseBody(c);
	} catch (e) {
		body = {};
	}
	
	const pingData = {
		timestamp: new Date().toISOString(),
		user_agent: c.req.header('User-Agent') || '',
		ip: c.req.header('CF-Connecting-IP') || '',
		version: body.version || '1.0.0',
		page: body.page || '',
		session: body.session || '',
		action: body.action || 'heartbeat'
	};
	
	// Log to analytics if enabled
	try {
		if (env.DB) {
			await env.DB.prepare(
				`INSERT INTO lead_events (ts, day, hour, type, page, session, source, device)
				 VALUES (?,?,?,?,?,?,?,?)`
			).bind(
				pingData.timestamp,
				pingData.timestamp.slice(0, 10), // YYYY-MM-DD
				pingData.timestamp.slice(11, 13), // HH
				'ping',
				pingData.page,
				pingData.session,
				'analytics',
				'web'
			).run();
		}
	} catch (e) {
		console.warn('Analytics ping logging failed:', e);
	}
	
	return c.json({ 
		success: true, 
		timestamp: pingData.timestamp,
		server_version: '2.0.0' 
	});
});
// Analytics/event tracking with configurable GA4
app.post('/api/track', async (c) => {
	const env = c.env;
	let body;
	try {
		body = await parseBody(c);
	} catch (e) {
		return c.json({ error: 'invalid_data', message: 'Invalid JSON data' }, 400);
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
	
	// Store in primary database
	try {
		await env.DB.prepare(
			`INSERT INTO lead_events (ts, day, hour, type, page, service, source, device, city, country, zip, area, session, scroll_pct, duration_ms, referrer, utm_source, utm_medium, utm_campaign, gclid)
			 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
		).bind(
			iso, day, hour, record.type, record.page, record.service, record.source, record.device,
			record.city, record.country, record.zip, record.area, record.session, record.scroll_pct,
			record.duration_ms, record.referrer, record.utm_source, record.utm_medium, record.utm_campaign, record.gclid
		).run();
		
		// Optional secondary database logging
		if (env.DB_2) {
			await env.DB_2.prepare(
				`INSERT INTO lead_events (ts, day, hour, type, page, service, source, device, city, country, zip, area, session, scroll_pct, duration_ms, referrer, utm_source, utm_medium, utm_campaign, gclid)
				 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
			).bind(
				iso, day, hour, record.type, record.page, record.service, record.source, record.device,
				record.city, record.country, record.zip, record.area, record.session, record.scroll_pct,
				record.duration_ms, record.referrer, record.utm_source, record.utm_medium, record.utm_campaign, record.gclid
			).run();
		}
	} catch (e) {
		console.error('D1 insert lead_events failed', e); // eslint-disable-line no-console
		return c.json({ error: 'database_error', message: 'Failed to log analytics event' }, 500);
	}
	
	// Forward to GA4 with configurable measurement ID
	const measurement_id = env.GA4_MEASUREMENT_ID || 'G-CLK9PTRD5N'; // Fallback to existing ID
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
		area: record.area,
		// Enhanced metadata
		utm_source: record.utm_source || undefined,
		utm_medium: record.utm_medium || undefined,
		utm_campaign: record.utm_campaign || undefined,
		gclid: record.gclid || undefined
	};
	
	// Remove undefined values
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
	
	// Send to GA4 (non-blocking)
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
				console.warn('GA4 tracking failed:', resp.status, tx.slice(0, 300));
				// Don't fail the request for GA4 errors
			}
		}
	} catch (e) {
		console.warn('GA4 tracking error:', e);
		// Log but do not fail the request
	}
	
	// Optional secondary analytics logging
	try {
		if (env.SECONDARY_ANALYTICS_URL && env.SECONDARY_ANALYTICS_KEY) {
			await fetch(env.SECONDARY_ANALYTICS_URL, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${env.SECONDARY_ANALYTICS_KEY}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					timestamp: iso,
					event: record.type,
					properties: record
				})
			});
		}
	} catch (e) {
		console.warn('Secondary analytics failed:', e);
	}
	
	return c.json({ success: true, recorded: iso });
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

