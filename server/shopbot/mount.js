import { cfg } from './config.js';
import { pool } from './db.js';
import { createBoss } from './queue.js';
import { registerWorkers } from './worker.js';
import { shopBotRouter } from './server.js';

let bossInstance = null;
let lastError = null;

async function ensureSchema() {
  try {
    await pool.query('create schema if not exists shop;');
    try {
      await pool.query("alter table shop.products add column if not exists category text default 'General'");
    } catch (e) {
      console.warn('[shopbot db] category column warning:', e.message);
    }
    try {
      await pool.query('alter table shop.products add column if not exists image_url text');
    } catch (e) {
      console.warn('[shopbot db] image_url column warning:', e.message);
    }
    try {
      await pool.query('create index if not exists products_category_idx on shop.products(category) where active');
    } catch (e) {}
    console.log('✅ [shopbot db] Verified schema & product columns (category, image_url)');

    // Seed default delivery zones if table is empty
    const { rows: [zCount] } = await pool.query('select count(*)::int as count from shop.delivery_zones');
    if (zCount?.count === 0) {
      await pool.query(`
        insert into shop.delivery_zones (name, fee_kes, sort) values
        ('Campus Hostel Room Delivery', 30, 10),
        ('Campus Gate / Library Pickup', 0, 20),
        ('Outside Campus / Town', 80, 30)
        on conflict do nothing;
      `);
      console.log('✅ [shopbot db] Seeded default delivery zones.');
    }

    // Seed 5 core products with variants & stock if not already seeded
    const { rows: [{ count: pCount }] } = await pool.query(
      `select count(*)::int as count from shop.products where name in (
        'Campus Holographic Sticker Pack',
        'Braided 65W Fast-Charging USB-C Cable',
        'Insulated Stainless Steel Flask (750ml)',
        'Minimalist LED Eye-Care Desk Lamp',
        'Wireless ANC Studio Over-Ear Headphones'
      )`
    );

    if (pCount === 0) {
      console.log('📦 [shopbot db] Seeding 5 initial products with clean commercial images & variants (including KES 10 test product)...');

      // 1. Campus Holographic Sticker Pack (10 KES - exactly matches user request for testing)
      const { rows: [p1] } = await pool.query(
        `insert into shop.products (name, category, description, image_url, sort)
         values ($1, $2, $3, $4, 10) returning id`,
        [
          'Campus Holographic Sticker Pack',
          'Accessories',
          'Durable waterproof holographic vinyl stickers. Perfect for laptops, phone cases, and water bottles.',
          'https://imageke-api.onrender.com/products/sticker_pack.jpg'
        ]
      );
      const { rows: [v1a] } = await pool.query(
        `insert into shop.variants (product_id, label, sku, price_kes) values ($1, $2, $3, $4) returning id`,
        [p1.id, 'Single Sticker Pack', 'STICKER-SGL', 10]
      );
      await pool.query('insert into shop.inventory (variant_id, on_hand) values ($1, 100) on conflict do nothing', [v1a.id]);

      const { rows: [v1b] } = await pool.query(
        `insert into shop.variants (product_id, label, sku, price_kes) values ($1, $2, $3, $4) returning id`,
        [p1.id, '3-Pack Collector Bundle', 'STICKER-3PK', 25]
      );
      await pool.query('insert into shop.inventory (variant_id, on_hand) values ($1, 50) on conflict do nothing', [v1b.id]);

      // 2. Braided 65W Fast-Charging USB-C Cable (250 KES)
      const { rows: [p2] } = await pool.query(
        `insert into shop.products (name, category, description, image_url, sort)
         values ($1, $2, $3, $4, 20) returning id`,
        [
          'Braided 65W Fast-Charging USB-C Cable',
          'Electronics',
          'Heavy-duty nylon braided cable supporting 65W Power Delivery and high-speed data sync.',
          'https://imageke-api.onrender.com/products/usb_cable.jpg'
        ]
      );
      const { rows: [v2a] } = await pool.query(
        `insert into shop.variants (product_id, label, sku, price_kes) values ($1, $2, $3, $4) returning id`,
        [p2.id, '1 Meter (Black)', 'CABLE-1M', 250]
      );
      await pool.query('insert into shop.inventory (variant_id, on_hand) values ($1, 40) on conflict do nothing', [v2a.id]);

      const { rows: [v2b] } = await pool.query(
        `insert into shop.variants (product_id, label, sku, price_kes) values ($1, $2, $3, $4) returning id`,
        [p2.id, '2 Meter (Heavy Duty)', 'CABLE-2M', 350]
      );
      await pool.query('insert into shop.inventory (variant_id, on_hand) values ($1, 30) on conflict do nothing', [v2b.id]);

      // 3. Insulated Stainless Steel Flask (750ml) (499 KES)
      const { rows: [p3] } = await pool.query(
        `insert into shop.products (name, category, description, image_url, sort)
         values ($1, $2, $3, $4, 30) returning id`,
        [
          'Insulated Stainless Steel Flask (750ml)',
          'Lifestyle',
          'Double-wall vacuum insulated flask. Keeps cold for 24h, hot for 12h. Leakproof lid.',
          'https://imageke-api.onrender.com/products/water_bottle.jpg'
        ]
      );
      const { rows: [v3a] } = await pool.query(
        `insert into shop.variants (product_id, label, sku, price_kes) values ($1, $2, $3, $4) returning id`,
        [p3.id, 'Matte Midnight Black', 'FLASK-BLK', 499]
      );
      await pool.query('insert into shop.inventory (variant_id, on_hand) values ($1, 25) on conflict do nothing', [v3a.id]);

      const { rows: [v3b] } = await pool.query(
        `insert into shop.variants (product_id, label, sku, price_kes) values ($1, $2, $3, $4) returning id`,
        [p3.id, 'Glacier Silver', 'FLASK-SLV', 499]
      );
      await pool.query('insert into shop.inventory (variant_id, on_hand) values ($1, 20) on conflict do nothing', [v3b.id]);

      // 4. Minimalist LED Eye-Care Desk Lamp (650 KES)
      const { rows: [p4] } = await pool.query(
        `insert into shop.products (name, category, description, image_url, sort)
         values ($1, $2, $3, $4, 40) returning id`,
        [
          'Minimalist LED Eye-Care Desk Lamp',
          'Study & Tech',
          'Foldable architectural desk lamp with flicker-free anti-blue-light LEDs and touch controls.',
          'https://imageke-api.onrender.com/products/desk_lamp.jpg'
        ]
      );
      const { rows: [v4a] } = await pool.query(
        `insert into shop.variants (product_id, label, sku, price_kes) values ($1, $2, $3, $4) returning id`,
        [p4.id, 'Warm White (Touch)', 'LAMP-WHT', 650]
      );
      await pool.query('insert into shop.inventory (variant_id, on_hand) values ($1, 15) on conflict do nothing', [v4a.id]);

      const { rows: [v4b] } = await pool.query(
        `insert into shop.variants (product_id, label, sku, price_kes) values ($1, $2, $3, $4) returning id`,
        [p4.id, 'Dimmable 3-Color Mode', 'LAMP-RGB', 750]
      );
      await pool.query('insert into shop.inventory (variant_id, on_hand) values ($1, 15) on conflict do nothing', [v4b.id]);

      // 5. Wireless ANC Studio Over-Ear Headphones (1,200 KES)
      const { rows: [p5] } = await pool.query(
        `insert into shop.products (name, category, description, image_url, sort)
         values ($1, $2, $3, $4, 50) returning id`,
        [
          'Wireless ANC Studio Over-Ear Headphones',
          'Audio',
          'Active noise cancelling over-ear headphones with deep bass, memory foam cushions, and 40h battery.',
          'https://imageke-api.onrender.com/products/headphones.jpg'
        ]
      );
      const { rows: [v5a] } = await pool.query(
        `insert into shop.variants (product_id, label, sku, price_kes) values ($1, $2, $3, $4) returning id`,
        [p5.id, 'Stealth Matte Black', 'HP-BLK', 1200]
      );
      await pool.query('insert into shop.inventory (variant_id, on_hand) values ($1, 12) on conflict do nothing', [v5a.id]);

      const { rows: [v5b] } = await pool.query(
        `insert into shop.variants (product_id, label, sku, price_kes) values ($1, $2, $3, $4) returning id`,
        [p5.id, 'Arctic White', 'HP-WHT', 1200]
      );
      await pool.query('insert into shop.inventory (variant_id, on_hand) values ($1, 10) on conflict do nothing', [v5b.id]);

      console.log('✅ [shopbot db] Seeded 5 initial products with images & variants successfully.');
    }
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

  try {
    await ensureSchema();
  } catch (err) {
    console.warn('[shopbot db] ensureSchema non-fatal:', err.message);
  }

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
