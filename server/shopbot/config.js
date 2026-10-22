import 'dotenv/config';

const required = [
  'DATABASE_URL',
  'WHATSAPP_PHONE_NUMBER_ID',
  'WHATSAPP_API_TOKEN',
  'WHATSAPP_VERIFY_TOKEN',
  'PAYSTACK_SECRET_KEY',
];

const missing = required.filter((k) => !process.env[k]);
export const isConfigured = missing.length === 0;

if (!isConfigured) {
  console.warn(`[shopbot config] Dormant mode. Missing env vars: ${missing.join(', ')}`);
}
if (!process.env.META_APP_SECRET) {
  console.warn('[shopbot config] META_APP_SECRET not set -> webhook signatures NOT verified (dev only!)');
}

export const cfg = {
  isConfigured,
  port: Number(process.env.PORT || 10000),
  role: process.env.ROLE || 'all',
  businessName: process.env.BUSINESS_NAME || 'Makoyocart Ventures',
  ownerWa: (process.env.OWNER_WA_NUMBER || '').replace(/\D/g, ''),
  databaseUrl: process.env.DATABASE_URL,
  wa: {
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    token: process.env.WHATSAPP_API_TOKEN,
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN,
    appSecret: process.env.META_APP_SECRET || '',
    graph: 'https://graph.facebook.com/v21.0',
  },
  paystackSecret: process.env.PAYSTACK_SECRET_KEY,
  workerConcurrency: Number(process.env.WORKER_CONCURRENCY || 4),
  ownerTemplate: {
    name: process.env.OWNER_TEMPLATE_NAME || '',
    lang: process.env.OWNER_TEMPLATE_LANG || 'en',
  },
  // Dashboard API: verifies the Supabase session of the logged-in workspace user.
  admin: {
    supabaseUrl: (process.env.SUPABASE_URL || '').replace(/\/$/, ''),
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    emails: (process.env.ADMIN_EMAILS || 'duncan@duncanmakoyo.com,duncanmakoyo@gmail.com').toLowerCase().split(',').map((s) => s.trim()).filter(Boolean),
    origins: (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,https://duncanmakoyo.com').split(',').map((s) => s.trim()).filter(Boolean),
  },
};
