import { cfg } from './config.js';
import { createBoss } from './queue.js';
import { registerWorkers } from './worker.js';
import { shopBotRouter } from './server.js';

let bossInstance = null;

export async function mountShopBot(app) {
  if (!cfg.databaseUrl || !cfg.wa.token) {
    console.warn('[shopbot] DATABASE_URL or WHATSAPP_API_TOKEN not set. WhatsApp Commerce Bot is in dormant mode.');
    app.use('/api/shopbot', (_req, res) => {
      res.status(503).json({ error: 'ShopBot is not configured. Please set DATABASE_URL and WHATSAPP_API_TOKEN in Render environment.' });
    });
    return null;
  }

  try {
    bossInstance = await createBoss();
    await registerWorkers(bossInstance);
    app.use('/api/shopbot', shopBotRouter(bossInstance));
    console.log('✅ [shopbot] WhatsApp Commerce Bot mounted at /api/shopbot (Webhook & Admin API active)');
    return bossInstance;
  } catch (err) {
    console.error('❌ [shopbot] Failed to initialize pg-boss or mount shopbot:', err.message);
    app.use('/api/shopbot', (_req, res) => {
      res.status(500).json({ error: 'ShopBot service failed to initialize', details: err.message });
    });
    return null;
  }
}

export function getBoss() {
  return bossInstance;
}
