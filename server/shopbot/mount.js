import { cfg } from './config.js';
import { pool } from './db.js';
import { createBoss } from './queue.js';
import { registerWorkers } from './worker.js';
import { shopBotRouter } from './server.js';

let bossInstance = null;
let lastError = null;

async function ensureSchema() {
  try {
    await pool.query(`
      create schema if not exists shop;
      alter table shop.products add column if not exists category text default 'General';
      alter table shop.products add column if not exists image_url text;
      create index if not exists products_category_idx on shop.products(category) where active;
    `);
    console.log('✅ [shopbot db] Verified schema & product columns (category, image_url)');
  } catch (e) {
    console.error('⚠️ [shopbot db] ensureSchema:', e.message);
  }
}

export async function mountShopBot(app) {
  // Always mount the shopBotRouter so Meta GET webhook handshake and health checks are immediately responsive
  app.use('/api/shopbot', shopBotRouter(() => bossInstance, () => lastError));

  if (!cfg.databaseUrl || !cfg.wa.token) {
    console.warn('[shopbot] DATABASE_URL or WHATSAPP_API_TOKEN not set. WhatsApp Commerce Bot is in dormant mode.');
    return null;
  }

  ensureSchema().catch(() => {});

  const tryStartBoss = async () => {
    try {
      bossInstance = await createBoss();
      await registerWorkers(bossInstance);
      lastError = null;
      console.log('✅ [shopbot] pg-boss queue & workers successfully connected.');
      return bossInstance;
    } catch (err) {
      lastError = err.message;
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

export function getLastError() {
  return lastError;
}
