import { cfg } from './config.js';
import { createBoss } from './queue.js';
import { registerWorkers } from './worker.js';
import { shopBotRouter } from './server.js';

let bossInstance = null;

export async function mountShopBot(app) {
  // Always mount the shopBotRouter so Meta GET webhook handshake and health checks are immediately responsive
  app.use('/api/shopbot', shopBotRouter(() => bossInstance));

  if (!cfg.databaseUrl || !cfg.wa.token) {
    console.warn('[shopbot] DATABASE_URL or WHATSAPP_API_TOKEN not set. WhatsApp Commerce Bot is in dormant mode.');
    return null;
  }

  const tryStartBoss = async () => {
    try {
      bossInstance = await createBoss();
      await registerWorkers(bossInstance);
      console.log('✅ [shopbot] pg-boss queue & workers successfully connected.');
      return bossInstance;
    } catch (err) {
      console.error('❌ [shopbot] pg-boss connection error (will retry in 15s):', err.message);
      setTimeout(tryStartBoss, 15_000);
      return null;
    }
  };

  return await tryStartBoss();
}

export function getBoss() {
  return bossInstance;
}
