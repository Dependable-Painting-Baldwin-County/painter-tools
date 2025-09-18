# Painter Tools Cloudflare Worker

API + static marketing site for Dependable Painting. Serves static assets from `public/` and exposes JSON APIs for leads, chat, analytics, etc. Backed by Cloudflare D1, KV, Email, AI, and Queues (future use). Implemented as a vanilla Cloudflare Worker (no framework) with a manual fetch router.

## Features
- Static site hosting via Workers + `public/*`
- Lead capture endpoint `/api/estimate` (stores in D1 + optional email notifications)
- Lead listing `/api/leads` (GET) with query filters q, source, city, limit, offset
- Lead fetch `/api/lead/:id` (GET)
- Chat assistant `/api/chat` using Workers AI (preferred) or OpenAI fallback
- Event tracking `/api/track` storing normalized analytics events (`lead_events` table) + optional GA4 forward
- Additional placeholder endpoints for future expansion (payments, jobs, forms, stats, etc.)
- Health check `/api/health`

## Prerequisites
- Node.js 18+
- Cloudflare account with: D1 DB(s), Email (if used), Workers AI (or OpenAI key), KV namespace, R2 bucket (optional for future), Queues (optional)
- `wrangler` authenticated: `npx wrangler login`

## Local Development
```bash
npm install
npm run dev
```
This runs `wrangler dev` (remote mode so D1 + Email + AI bindings work). Visit the printed localhost URL.

To run fully local (Miniflare where possible):
```bash
npm run dev:local
```
(Some bindings like Email/AI may require remote mode.)

## Database Migrations (D1)
Migrations live in `migrations/` and are auto-detected by Wrangler.

Apply to primary DB (binding `DB`):
```bash
npm run migrate:apply
```
List migrations:
```bash
npm run migrate:list
```
If you have the secondary DB bound as `DB_2` and want to apply the same migrations (schema must match):
```bash
npm run migrate:apply:db2
```
> Note: Secondary apply intentionally continues on error (`|| true`). Adjust if you need strict sync.

## Environment Variables / Bindings
Configured in `wrangler.jsonc`:
- D1: `DB` (required), `DB_2` (optional second replica)
- KV: `PAINTER_KV`
- AI: `AI` (Workers AI). Fallback uses `OPENAI_API_KEY` secret.
- Email: Provide `SEB` binding (Cloudflare Email) if you want email notifications.
- R2 (future): `PAINT_BUCKET`
- Queues (future expansion): various producer bindings already declared

Runtime vars (plain):
- `ENVIRONMENT` (development|production)
- `DESTINATION`, `SENDER` (legacy email fields) — code currently uses `FROM_ADDR`, `ADMIN_EMAIL`, `OWNER_EMAIL`, `TO_ADDR` if present
- Optional: `AI_MODEL`, `AI_TEMP`, `OPENAI_MODEL`, `OPENAI_TEMP`, `GA4_API_SECRET`, `THANK_YOU_URL`, `SITE_NAME`

### Add Secrets
Set secrets (not in version control):
```bash
wrangler secret put OPENAI_API_KEY
wrangler secret put GA4_API_SECRET
wrangler secret put FROM_ADDR
wrangler secret put ADMIN_EMAIL
```
Add any others similarly.

## Deploy
```bash
npm run deploy
```
This will:
- Bundle `src/index.js`
- Upload static assets in `public/`
- Apply correct bindings from `wrangler.jsonc`

Ensure migrations have been applied to production DB first if schema changed.

## Testing APIs (Examples)
```bash
# Health
curl -s https://dependablepainting.work/api/health | jq

# Lead (estimate)
curl -s -X POST https://dependablepainting.work/api/estimate \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test User","city":"Daphne","service":"Interior Painting","message":"Need a quote","email":"test@example.com"}' | jq

# Chat
curl -s -X POST https://dependablepainting.work/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"What prep is needed for cedar siding?"}' | jq
```

## Code Structure
- `src/index.js` vanilla Worker exporting `{ fetch() }` implementing all API routes.
- `src/endpoints/*.ts` (legacy chanfana OpenAPIRoute classes) are currently not wired; kept for reference. Remove them or reintroduce a router if you want OpenAPI docs generation.
- `public/` static site (HTML pages, sitemap, etc.)
- `migrations/` D1 schema migrations (auto-numbered)

## Adding a New API Route
In `src/index.js`:
```js
app.post('/api/new-endpoint', async (c) => {
  // logic
  return c.json({ ok: true });
});
```
Deploy again.

## Common Issues
- 500 Database operation failed: Ensure migrations applied & binding name matches `DB`.
- Email not sent: Ensure `SEB` binding present or remove email code blocks.
- AI error `No AI provider configured`: Add Workers AI binding OR set `OPENAI_API_KEY` secret.
- GA4 errors: Set `GA4_API_SECRET` or ignore; tracking still stored in D1.

## Roadmap Ideas
- Implement payment (Stripe) in `/api/charge`
- Add auth / dashboard analytics
- Queue-based async enrichment (geo classification, job reminders)
- R2 for image uploads

## License
Internal / Proprietary (update if you plan to publish publicly).
