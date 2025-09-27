// Painter Tools Cloudflare Worker
// API + static marketing site for Dependable Painting

export default {
async fetch(request, env, ctx) {
const url = new URL(request.url);
const pathname = url.pathname;

// API routes
if (pathname.startsWith('/api/')) {
return handleAPIRoute(request, env, pathname, ctx);
}

// Static file serving
if (pathname === '/') {
return env.ASSETS.fetch(new Request(`${url.origin}/index.html`, request));
}

// Serve other static assets
return env.ASSETS.fetch(request);
}
};

async function handleAPIRoute(request, env, pathname, ctx) {
const corsHeaders = {
'Access-Control-Allow-Origin': '*',
'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

if (request.method === 'OPTIONS') {
return new Response(null, { status: 204, headers: corsHeaders });
}

try {
// Parse request body for POST requests
let body = {};
if (request.method === 'POST') {
const contentType = request.headers.get('content-type') || '';
if (contentType.includes('application/json')) {
body = await request.json();
} else if (contentType.includes('application/x-www-form-urlencoded')) {
const formData = await request.formData();
body = Object.fromEntries(formData);
}
}

// Route handling
if (pathname === '/api/health') {
return new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), {
headers: { ...corsHeaders, 'Content-Type': 'application/json' }
});
}

if (pathname === '/api/estimate' && request.method === 'POST') {
return handleEstimate(body, env, request, corsHeaders);
}

if (pathname === '/api/leads') {
return handleLeads(env, url, corsHeaders);
}

if (pathname.startsWith('/api/lead/')) {
const leadId = pathname.split('/')[3];
return handleLead(leadId, env, corsHeaders);
}

if (pathname === '/api/chat' && request.method === 'POST') {
return handleChat(body, env, request, corsHeaders);
}

if (pathname === '/api/track' && request.method === 'POST') {
return handleTrack(body, env, request, corsHeaders);
}

// Placeholder routes for future expansion
if (pathname === '/api/charge' && request.method === 'POST') {
return new Response(JSON.stringify({ error: 'Payment processing not yet implemented' }), {
status: 501,
headers: { ...corsHeaders, 'Content-Type': 'application/json' }
});
}

// 404 for unknown API routes
return new Response(JSON.stringify({ error: 'API endpoint not found' }), {
status: 404,
headers: { ...corsHeaders, 'Content-Type': 'application/json' }
});

} catch (error) {
console.error('API Error:', error);
return new Response(JSON.stringify({ error: 'Internal server error' }), {
status: 500,
headers: { ...corsHeaders, 'Content-Type': 'application/json' }
});
}
}

async function handleEstimate(body, env, request, corsHeaders) {
try {
// Validate required fields
if (!body.name || !body.email || !body.phone) {
return new Response(JSON.stringify({ error: 'Name, email, and phone are required' }), {
status: 400,
headers: { ...corsHeaders, 'Content-Type': 'application/json' }
});
}

// Store lead in database
const leadId = crypto.randomUUID();
const timestamp = new Date().toISOString();

await env.DB.prepare(
`INSERT INTO leads (id, name, email, phone, address, message, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
).bind(
leadId,
body.name,
body.email,
body.phone,
body.address || '',
body.message || '',
body.source || 'website',
timestamp
).run();

// Log event
await env.DB.prepare(
`INSERT INTO lead_events (lead_id, event_type, event_data, created_at) VALUES (?, ?, ?, ?)`
).bind(
leadId,
'lead_created',
JSON.stringify({ source: body.source || 'website', user_agent: request.headers.get('User-Agent') }),
timestamp
).run();

return new Response(JSON.stringify({ 
success: true, 
leadId,
message: 'Your estimate request has been received. We\'ll contact you within 24 hours!' 
}), {
headers: { ...corsHeaders, 'Content-Type': 'application/json' }
});

} catch (error) {
console.error('Database operation failed:', error);
return new Response(JSON.stringify({ error: 'Failed to save your request. Please try again.' }), {
status: 500,
headers: { ...corsHeaders, 'Content-Type': 'application/json' }
});
}
}

async function handleChat(body, env, request, corsHeaders) {
const userMsg = body.message || '';
if (!userMsg.trim()) {
return new Response(JSON.stringify({ error: 'Message is required' }), {
status: 400,
headers: { ...corsHeaders, 'Content-Type': 'application/json' }
});
}

const systemPrompt = `You are a helpful assistant for Dependable Painting, a professional painting company serving Baldwin and Mobile Counties in Alabama. 

Company Info:
- Services: Interior painting, exterior painting, cabinet painting, commercial painting
- Service areas: Fairhope, Daphne, Spanish Fort, Mobile, Bay Minette (NOT Gulf Shores or Orange Beach for residential)
- Phone: (251) 423-5855
- Uses high-quality Sherwin-Williams paints
- Professional crews with clean work standards

Answer questions about painting, services, service areas, materials, and processes. Keep responses helpful, professional, and under 150 words. If asked about scheduling or specific quotes, direct them to call (251) 423-5855 or use the contact form.`;

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
'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
'Content-Type': 'application/json'
},
body: JSON.stringify({
model: env.OPENAI_MODEL || 'gpt-3.5-turbo',
messages: [
{ role: 'system', content: systemPrompt },
{ role: 'user', content: userMsg }
],
max_tokens: 512,
temperature: env.OPENAI_TEMP ? Number(env.OPENAI_TEMP) : 0.3
})
});

if (!resp.ok) {
throw new Error(`OpenAI API error: ${resp.status} ${resp.statusText}`);
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
reply = 'Pricing varies based on the size, condition, and complexity of your project. For standard interior rooms, we offer packages starting at $400. For accurate pricing, I recommend getting a free estimate by calling (251) 423-5855 or using our contact form. We provide detailed, transparent quotes with no hidden fees.';
} else if (lowerMsg.includes('area') || lowerMsg.includes('service') || lowerMsg.includes('location')) {
reply = 'We proudly serve Baldwin and Mobile Counties in Alabama, including Fairhope, Daphne, Spanish Fort, Mobile, and Bay Minette. We do not service Gulf Shores or Orange Beach for residential projects. Call (251) 423-5855 to confirm we serve your specific area.';
} else {
reply = 'I\'m here to help with questions about painting services, materials, processes, and our service areas. For specific quotes or scheduling, please call (251) 423-5855 or use our contact form. What specific painting question can I help you with?';
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
request.headers.get('User-Agent') || '',
body.page || ''
).run();
} catch (e) {
// Log error but do not fail chat
}
return new Response(JSON.stringify({ reply }), {
headers: { ...corsHeaders, 'Content-Type': 'application/json' }
});
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
reply = 'Pricing varies based on the size, condition, and complexity of your project. For standard interior rooms, we offer packages starting at $400. For accurate pricing, I recommend getting a free estimate by calling (251) 423-5855 or using our contact form. We provide detailed, transparent quotes with no hidden fees.';
} else if (lowerMsg.includes('area') || lowerMsg.includes('service') || lowerMsg.includes('location')) {
reply = 'We proudly serve Baldwin and Mobile Counties in Alabama, including Fairhope, Daphne, Spanish Fort, Mobile, and Bay Minette. We do not service Gulf Shores or Orange Beach for residential projects. Call (251) 423-5855 to confirm we serve your specific area.';
} else {
reply = 'I\'m here to help with questions about painting services, materials, processes, and our service areas. For specific quotes or scheduling, please call (251) 423-5855 or use our contact form. What specific painting question can I help you with?';
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
request.headers.get('User-Agent') || '',
body.page || ''
).run();
} catch (e) {
// Log error but do not fail chat
}
return new Response(JSON.stringify({ reply }), {
headers: { ...corsHeaders, 'Content-Type': 'application/json' }
});
} else {
console.error('Chat AI error:', e); // Log the actual error
return new Response(JSON.stringify({ error: `ai_fail:${e.message}` }), {
status: 502,
headers: { ...corsHeaders, 'Content-Type': 'application/json' }
});
}
}
}

// Simplified handlers for other endpoints (keeping it minimal for this restoration)
async function handleLeads(env, url, corsHeaders) {
return new Response(JSON.stringify({ leads: [], meta: { count: 0, limit: 50, offset: 0 } }), {
headers: { ...corsHeaders, 'Content-Type': 'application/json' }
});
}

async function handleLead(leadId, env, corsHeaders) {
return new Response(JSON.stringify({ error: 'Lead not found' }), {
status: 404,
headers: { ...corsHeaders, 'Content-Type': 'application/json' }
});
}

async function handleTrack(body, env, request, corsHeaders) {
return new Response(JSON.stringify({ success: true }), {
headers: { ...corsHeaders, 'Content-Type': 'application/json' }
});
}
