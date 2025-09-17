# Painter Tools - Dependable Painting Website & API

A comprehensive Cloudflare Workers application for Dependable Painting, featuring enhanced contact forms, AI chat, Stripe payments, and analytics.

## Features

- **Enhanced Contact Forms**: Multi-format support (JSON, form-data, multipart) with spam protection
- **AI Paint Guru Chat**: Intelligent assistant with comprehensive painting knowledge base
- **Stripe Payment Processing**: Modern Payment Intents API with order tracking
- **Advanced Analytics**: GA4 integration with optional secondary logging
- **SEO Optimized**: Structured data, meta tags, and performance optimizations

## Required Wrangler Secrets & Environment Variables

### Core Configuration
```bash
# Site Information
SITE_NAME="Dependable Painting"
BUSINESS_PHONE="(251) 525-4405"
BUSINESS_PHONE_HREF="tel:+12515254405"
THANK_YOU_URL="/thank-you"

# Email Configuration
FROM_ADDR="no-reply@dependablepainting.work"
ADMIN_EMAIL="just-paint-it@dependablepainting.work"
OWNER_EMAIL="alexdimmler@dependablepainting.work"
TO_ADDR="just-paint-it@dependablepainting.work"
```

### Payment Processing (Stripe)
```bash
# Required for payment functionality
STRIPE_SECRET_KEY="sk_live_..."  # or sk_test_... for testing
STRIPE_PUBLISHABLE_KEY="pk_live_..."  # or pk_test_... for testing
```

### AI Chat System
```bash
# Option 1: Cloudflare Workers AI (recommended)
AI_MODEL="@cf/meta/llama-3.2-11b-vision-instruct"  # or other supported model
AI_TEMP="0.3"

# Option 2: OpenAI API (fallback)
OPENAI_API_KEY="sk-..."
OPENAI_MODEL="gpt-4o"
OPENAI_TEMP="0.3"
```

### Analytics & Tracking
```bash
# Google Analytics 4
GA4_MEASUREMENT_ID="G-XXXXXXXXXX"
GA4_API_SECRET="abc123..."

# Optional Secondary Analytics
SECONDARY_ANALYTICS_URL="https://your-analytics-endpoint.com"
SECONDARY_ANALYTICS_KEY="your-api-key"
```

## Required Cloudflare Bindings

### D1 Databases
- `DB`: Primary database for leads, orders, chat logs
- `DB_2`: Optional secondary database for redundancy

### KV Namespace
- `PAINTER_KV`: Key-value storage for rate limiting and caching

### Email Sending
- `SEB`: Simple Email Binding for sending notifications and receipts

### AI Binding
- `AI`: Cloudflare Workers AI for the chat system

### Queues (Optional - for advanced processing)
- `LEAD_QUEUE`: Lead processing queue
- `CHAT_QUEUE`: Chat interaction logging
- `ORDER_SAVE_QUEUE`: Order processing queue
- `ORDER_RECEIPT_QUEUE`: Receipt sending queue

### R2 Storage (Optional)
- `PAINT_BUCKET`: File storage for images and documents

### Analytics Engine (Optional)
- `ANALYTICS_EVENTS`: Advanced analytics dataset

## Database Schema

The application uses the following database tables:

### leads
- Contact form submissions with spam protection
- Fields: name, email, phone, city, zip, service, message, etc.

### orders  
- Stripe payment tracking and order management
- Fields: stripe_payment_intent_id, amount, customer details, status

### chat_log
- AI chat interactions for quality monitoring
- Fields: timestamp, session, question, answer, ai_provider

### lead_events
- Analytics events and user interactions
- Fields: timestamp, type, page, source, utm parameters, etc.

## Setup Instructions

1. **Clone the repository**
   ```bash
   git clone https://github.com/Dependable-Painting-Baldwin-County/painter-tools
   cd painter-tools
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Wrangler secrets**
   ```bash
   # Add each secret individually
   wrangler secret put STRIPE_SECRET_KEY
   wrangler secret put STRIPE_PUBLISHABLE_KEY
   wrangler secret put OPENAI_API_KEY  # if using OpenAI
   wrangler secret put GA4_API_SECRET
   # ... etc for all secrets
   ```

4. **Configure wrangler.toml**
   - Update database IDs to match your D1 databases
   - Configure KV namespace IDs
   - Set up any other bindings you need

5. **Run database migrations**
   ```bash
   wrangler d1 migrations apply --env production
   ```

6. **Deploy**
   ```bash
   wrangler deploy
   ```

## Development

```bash
# Start development server
npm run dev

# Deploy to production
npm run deploy

# Run with remote bindings for testing
npm run preview
```

## API Endpoints

### Contact & Lead Management
- `POST /api/estimate` - Enhanced contact form with spam protection
- `POST /api/track` - Analytics event tracking

### AI Chat System  
- `POST /api/chat` - Paint Guru AI assistant

### Payment Processing
- `POST /api/charge` - Stripe Payment Intents processing
- `GET /config.js` - Dynamic client configuration

### Analytics & Monitoring
- `POST /api/analytics/ping` - Heartbeat and version tracking
- `GET /api/health` - Health check endpoint

## Security Features

- **Rate Limiting**: IP-based rate limiting using KV storage
- **Spam Protection**: Honeypot fields and timing validation
- **Input Validation**: Comprehensive form validation
- **SQL Injection Protection**: Prepared statements for all database queries
- **CORS Protection**: Proper origin validation

## Performance Optimizations

- **Preconnect Links**: Fast loading of external resources
- **Critical CSS**: Inline critical styles for faster rendering
- **Image Optimization**: Cloudflare Image Resizing
- **Lazy Loading**: Images load as needed
- **CDN Caching**: Static assets cached at edge

## Monitoring & Logging

- **Error Logging**: Comprehensive error tracking
- **Chat Logging**: All AI interactions logged for quality
- **Analytics Events**: Detailed user interaction tracking  
- **Payment Logging**: Complete audit trail for transactions

## Support

For technical support or questions:
- Email: alexdimmler@dependablepainting.work
- Phone: (251) 525-4405

## License

Private repository - All rights reserved by Dependable Painting, Baldwin County, AL.