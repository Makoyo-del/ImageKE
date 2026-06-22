# HookBunker — Resilient Webhook Proxy for African Payment Gateways

HookBunker is a production-grade webhook proxy and delivery engine built for developers integrating Safaricom M-Pesa (Daraja), Paystack, and Payhero into their applications.

It absorbs payment gateway callbacks instantly, logs every payload to a persistent database, forwards to your server with automatic retries, and alerts you on failure — all behind a clean developer dashboard.

**Live:** [hookbunker.duncanmakoyo.com](https://duncanmakoyo.com/#/hookbunker) · **API:** [api.duncanmakoyo.com](https://api.duncanmakoyo.com/health)

---

## What Problem Does It Solve?

Payment gateways fire webhooks once and move on. If your server is down, cold-starting, or slow to respond, the callback is **lost forever**. HookBunker sits in front of your server and:

- Returns `HTTP 200` to the gateway in **< 20ms** (before M-Pesa's 3-second timeout)
- Stores the full JSON payload in PostgreSQL
- Forwards asynchronously to your real server
- Retries automatically if your server is down (up to configurable max)
- Sends email alerts on first failure and when retries are exhausted

---

## Architecture

```
Payment Gateway (M-Pesa / Paystack / Payhero)
        │
        ▼
api.duncanmakoyo.com/api/hookbunker/webhooks/<api_key>
        │  ← responds 200 in < 20ms
        │
   HookBunker Engine (Express / Node.js on Render)
        │
        ├── Logs to Supabase PostgreSQL (webhooks + deliveries tables)
        ├── Forwards to developer's target_url asynchronously
        └── Retry cron (every 5 min) re-attempts failed deliveries
```

```
/                        ← React Frontend (Vite, deployed to Hostinger)
/server                  ← Express Backend (deployed to Render)
/supabase_schema.sql     ← Full database schema with RLS policies
```

---

## Security Model

| Layer | Implementation |
|---|---|
| **Authentication** | All developer API calls use Supabase JWT (RS256) |
| **Ingestion Rate Limiting** | 60 req/min per IP on the public ingestion endpoint |
| **General API Rate Limiting** | 50 req/15 min per IP on all other API routes |
| **Payment Validation** | Server-side amount verification — client cannot override pricing |
| **Subscription Replay Prevention** | `last_payment_reference` stored on profile; same reference rejected |
| **Billing Webhook Verification** | HMAC-SHA512 signature checked on all Paystack billing events |
| **Ingestion URL Masking** | Real backend URL hidden behind `api.duncanmakoyo.com` (custom Render domain) |
| **Ownership Verification** | Every webhook/project operation verifies `user_id` against JWT |
| **No Secrets on Frontend** | All keys are `VITE_`-prefixed (public-safe: anon key, public Paystack key only) |
| **Row-Level Security** | Supabase RLS isolates all data by `auth.uid()` |

### What is Safe to Expose on the Frontend?
- `VITE_SUPABASE_ANON_KEY` — Supabase design: this is intentionally public. RLS policies enforce isolation.
- `VITE_PAYSTACK_PUBLIC_KEY` — Paystack design: public key is for client-side checkout only.
- `VITE_API_URL` / `VITE_INGESTION_BASE_URL` — URLs, not secrets.

### What Must NEVER Be on the Frontend?
- `PAYSTACK_SECRET_KEY` — backend only (server/.env)
- `SUPABASE_SERVICE_ROLE_KEY` — backend only (server/.env), bypasses RLS
- `RESEND_API_KEY` — backend only
- `PING_SECRET` — backend only

---

## Database Schema (Supabase PostgreSQL)

Run `supabase_schema.sql` in your Supabase SQL Editor. It creates:

| Table | Purpose |
|---|---|
| `profiles` | Subscription tier, billing references, payment replay guard |
| `projects` | Developer API keys, target URLs, max retry config |
| `webhooks` | Captured gateway payloads, delivery status, currency, headers |
| `deliveries` | Per-attempt delivery logs (status code, response body, latency) |
| `feedback` | Feature requests and user ratings |

All tables have Row-Level Security (RLS) enabled. The backend uses the `service_role` key which bypasses RLS for operational writes (ingestion, retry jobs).

---

## Subscription Tiers & Limits

| Feature | Developer (Free) | Team | Business |
|---|---|---|---|
| Monthly Webhooks | 500 | 25,000 | 150,000 |
| Active Projects | 1 | 5 | Unlimited |
| Data Retention | 3 days | 14 days | 30 days |
| Max Retries | 1–10 (configurable) | 1–10 | 1–10 |
| Price | KES 0 | KES 3,400/mo | KES 11,500/mo |

Limits are enforced server-side on every ingestion request and project creation. Downgrade enforcement runs automatically on `subscription.disable` Paystack events.

---

## Local Development Setup

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [Paystack](https://paystack.com) account (for billing features)
- A [Resend](https://resend.com) account (for email alerts)

### 1. Database

```sql
-- Run in Supabase SQL Editor:
-- Paste the full contents of supabase_schema.sql
```

### 2. Frontend

```bash
# Root directory
cp .env.example .env
# Fill in your values (see .env.example for all required keys)
npm install
npm run dev
```

**Frontend `.env` keys:**
```env
VITE_API_URL=http://localhost:5000
VITE_INGESTION_BASE_URL=http://localhost:5000   # Use API_URL locally
VITE_PAYSTACK_PUBLIC_KEY=pk_test_...            # Your Paystack public key
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...                   # Supabase anon (safe to expose)
```

### 3. Backend

```bash
cd server
cp .env.example .env
# Fill in your values
npm install
node index.js
```

**Backend `server/.env` keys:**
```env
PORT=5000
PAYSTACK_SECRET_KEY=sk_test_...                 # NEVER expose on frontend
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...                # NEVER expose on frontend
RESEND_API_KEY=re_...                           # NEVER expose on frontend
RESEND_FROM_EMAIL=alerts@yourdomain.com
PING_SECRET=your_strong_random_secret           # For cron job authentication
TOKEN_SECRET=your_strong_random_secret          # For subscription token signing
ALLOWED_ORIGINS=https://yourdomain.com
HOOKBUNKER_DASHBOARD_URL=https://yourdomain.com/#/hookbunker/dashboard
```

---

## Production Deployment

### Frontend (Hostinger / Static Host)
```bash
npm run build
# Upload the /dist folder to your Hostinger file manager
```

### Backend (Render)
- Connect the GitHub repository to Render
- Set all `server/.env` keys as Environment Variables in the Render dashboard
- The `render.yaml` blueprint defines the service configuration
- Add `api.yourdomain.com` as a Custom Domain in Render settings
- Create a CNAME DNS record: `api` → `your-service.onrender.com`

### Cron Jobs (Required for Retry Processing)

Two cron jobs must run to keep HookBunker operational:

| Job | Endpoint | Frequency | Auth |
|---|---|---|---|
| **Keep-Alive** | `GET /api/ping?token=<PING_SECRET>` | Every 5 min | `?token=` query param |
| **Retry Worker** | `POST /api/hookbunker/jobs/process-retries?token=<PING_SECRET>` | Every 5 min | `?token=` query param |

Use [cron-job.org](https://cron-job.org) (free) or any cron runner.

---

## API Reference (HookBunker Backend)

### Public (No Auth Required)
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/hookbunker/webhooks/:apiKey` | Ingest a gateway webhook payload |
| `GET` | `/health` | Service health check |

### Authenticated (Supabase JWT Required)
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/hookbunker/projects` | List developer's projects |
| `POST` | `/api/hookbunker/projects` | Create a new ingestion project |
| `PUT` | `/api/hookbunker/projects/:id` | Update project name, URL, max retries |
| `DELETE` | `/api/hookbunker/projects/:id` | Delete a project and all its data |
| `PATCH` | `/api/hookbunker/projects/:id/toggle` | Activate / suspend a project |
| `GET` | `/api/hookbunker/projects/:id/logs` | Fetch webhook logs for a project |
| `POST` | `/api/hookbunker/webhooks/:id/retry` | Force-redeliver a single webhook |
| `DELETE` | `/api/hookbunker/webhooks/:id` | Delete a webhook log and its delivery attempts |
| `POST` | `/api/hookbunker/verify-subscription` | Verify Paystack payment and upgrade tier |
| `POST` | `/api/hookbunker/feedback` | Submit feedback or feature request |

---

## Contributing

This is a private commercial project. If you have found a security vulnerability, please disclose responsibly to `duncan@duncanmakoyo.com`.

---

## License

All rights reserved. © 2026 Duncan Makoyo. Unauthorized copying, distribution, or modification of this software is strictly prohibited.
