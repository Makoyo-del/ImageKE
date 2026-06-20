# ImageKE & HookBunker Developer Workspace

This workspace contains two high-performance web applications designed for utility, reliability, and monetization in the Kenyan market:

1. **ImageKE**: A mobile-first passport photo resizer and compressor tailored to Kenyan government portals (e-Citizen, iTax, HELB) and international Visa applications.
2. **HookBunker**: A highly resilient webhook proxy and transaction logging engine for Safaricom M-Pesa (Daraja), Paystack, and Payhero callbacks. It absorbs gateway payloads instantly, acknowledges receipt in under 20ms, logs requests to a PostgreSQL instance, and manages automated retry loops.

---

## 🚀 ImageKE - Passport Photo Resizer

ImageKE solves the common pain point of photo rejection on Kenyan public and private portals by resizing images to exact specifications client-side.

### Key Features
- **Portal Presets**: Ready-to-use sizes for eCitizen (350x450px, <50KB), KRA iTax, HELB, and US Visa (600x600px).
- **Local Client-Side Processing**: Resizing and compression happen inside the browser (using Pica). Images are never uploaded to a server, ensuring user privacy and low bandwidth costs.
- **Paystack Checkout Integration**: Uses Paystack Inline checkout to process KES payments (STK Push, Credit Card) for watermarked vs. clean high-resolution downloads.

---

## 🛡️ HookBunker - Webhook Proxy & Queue

HookBunker protects payment integration channels against target server downtime and connection timeouts.

### Problem Solved
- **Timeout Mitigation**: Safaricom M-Pesa (Daraja) callbacks require a response in under 3 seconds. HookBunker absorbs payloads, saves them, and responds immediately in under 20ms, completely avoiding gateway drops.
- **Downtime Buffering**: If your server is down, HookBunker captures the transaction log and schedules automatic retries.
- **Local Debugging**: Inspect exact gateway JSON payloads and replay them to your local environment with a single click.

### Database Tables (Supabase)
HookBunker runs on a relational PostgreSQL database schema. The complete migration script is available in [supabase_schema.sql](file:///c:/Users/USER/Desktop/Duncan%20Makoyo/DunMak/supabase_schema.sql):
- **profiles**: Tracks subscription tiers (Developer, Team, Business) and billing references.
- **projects**: Stores client API keys and target routing endpoints.
- **webhooks**: Ingests raw transaction payloads and current delivery states.
- **deliveries**: Records every request duration, status code, and HTTP response body.
- **feedback**: Logs user feature requests, ratings, and feedback.

---

## 🛠️ Architecture & Setup

The workspace is structured as a monorepo containing a React client and an Express backend.

```
/                   <- React Client Workspace (Vite + CSS)
/server             <- Node.js + Express Backend Workspace
/supabase_schema.sql <- Database Schema Migrations
```

### 1. Database Configuration
1. Create a Supabase project.
2. Open the SQL Editor in your Supabase dashboard.
3. Copy the contents of `supabase_schema.sql` and run the script to initialize tables, Row-Level Security (RLS) policies, and indexes.

### 2. Frontend Configuration
Set up your environment values in `.env` (root directory):
```env
VITE_API_URL=http://localhost:5000
VITE_PAYSTACK_PUBLIC_KEY=your_paystack_public_key
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Run the frontend client:
```bash
# From the root directory
npm install
npm run dev
```

### 3. Backend Configuration
Set up your environment values in `server/.env`:
```env
PORT=5000
PAYSTACK_SECRET_KEY=your_paystack_secret_key
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=alerts@duncanmakoyo.com
PING_SECRET=your_cron_worker_authentication_secret
TOKEN_SECRET=your_token_signing_secret
```

Run the backend API:
```bash
# From the server directory
cd server
npm install
node index.js
```

---

## 🌐 Production Deployment (Render)

This repository contains a `render.yaml` blueprint defining the environment:

- **imageke-frontend**: Direct static build mapping client routes.
- **imageke-api**: Background Express web service mapping proxy calls.

Ensure that all production secrets are set securely in your hosting dashboard, and that the external cron URL `/api/hookbunker/jobs/process-retries` is triggered periodically by a cron runner (e.g., cron-job.org) with the `Authorization: Bearer <PING_SECRET>` header.
