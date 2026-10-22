import express from 'express';
import { cfg } from './config.js';
import { pool, withTx } from './db.js';
import { Q } from './queue.js';

// ─── CORS ───────────────────────────────────────────────────────────────────
const DEFAULT_ORIGINS = [
  'https://duncanmakoyo.com',
  'https://www.duncanmakoyo.com',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://imageke-api.onrender.com'
];

function cors(req, res, next) {
  const origin = req.get('origin');
  const allowed = [...DEFAULT_ORIGINS, ...cfg.admin.origins];
  if (origin && (allowed.includes(origin) || allowed.includes('*'))) {
    res.set({
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Allow-Methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
      Vary: 'Origin',
    });
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
}

// ─── Auth: validate the Supabase session JWT, or server service secrets ──────
const tokenCache = new Map(); // token -> { email, exp }
const DEFAULT_ADMIN_EMAILS = [
  'duncan@duncanmakoyo.com',
  'duncanmakoyo@gmail.com',
  'makoyoduncan@gmail.com',
  'duncanmakoyo30@gmail.com',
  'duncan@duncanmakoyo30.com'
];

async function auth(req, res, next) {
  const h = req.get('authorization') || '';
  const token = h.startsWith('Bearer ') ? h.slice(7).trim() : (req.query.token || '').trim();
  if (!token) return res.status(401).json({ error: 'Missing token' });

  // Direct secret match fallback (TOKEN_SECRET / PING_SECRET / ADMIN_API_KEY)
  const masterSecret = (process.env.ADMIN_API_KEY || process.env.TOKEN_SECRET || process.env.PING_SECRET || '').trim();
  if (masterSecret && token === masterSecret) {
    req.admin = 'master_admin';
    return next();
  }

  const supabaseUrl = cfg.admin.supabaseUrl || process.env.SUPABASE_URL || 'https://aiyglunfwsolqsujyfsz.supabase.co';
  const supabaseKey = cfg.admin.supabaseAnonKey || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(503).json({ error: 'Admin auth provider not configured.' });
  }

  let hit = tokenCache.get(token);
  if (!hit || hit.exp < Date.now()) {
    try {
      const r = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: { apikey: supabaseKey, Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) return res.status(401).json({ error: 'Invalid session' });
      const u = await r.json();
      hit = { email: String(u.email || '').toLowerCase(), exp: Date.now() + 60_000 };
      tokenCache.set(token, hit);
      if (tokenCache.size > 200) tokenCache.clear();
    } catch {
      return res.status(502).json({ error: 'Auth provider unreachable' });
    }
  }

  const allowedEmails = [...DEFAULT_ADMIN_EMAILS, ...cfg.admin.emails];
  if (!allowedEmails.includes(hit.email)) {
    return res.status(403).json({ error: 'Not an authorized owner account' });
  }

  req.admin = hit.email;
  next();
}

const wrap = (fn) => (req, res) =>
  fn(req, res).catch((e) => {
    if (e.code === '23514') return res.status(409).json({ error: 'Stock cannot be set below units currently reserved by open checkouts.' });
    if (e.code === '23505') return res.status(409).json({ error: 'Duplicate value (name or SKU already exists).' });
    if (e.code === '22P02' || e.code === '23503') return res.status(400).json({ error: 'Invalid reference.' });
    if (/ORDER_NOT_PAID|BAD_STATUS|ORDER_NOT_FOUND/.test(e.message)) return res.status(400).json({ error: e.message.replace(/^.*?:\s*/, '') });
    console.error('[admin]', e);
    res.status(500).json({ error: e.message || 'Server error' });
  });

const num = (v, min = 0) => (Number.isFinite(Number(v)) && Number(v) >= min ? Number(v) : null);
const str = (v) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 200) : null);

export function adminRouter(boss) {
  const r = express.Router();
  r.use(cors, express.json({ limit: '100kb' }), auth);

  // ── Dashboard snapshot ────────────────────────────────────────────────────
  r.get('/overview', wrap(async (_req, res) => {
    const [m, orders, products, zones] = await Promise.all([
      pool.query(`select count(*) filter (where payment_status='paid')::int as paid_orders,
                         coalesce(sum(total_kes) filter (where payment_status='paid'),0)::float as revenue_kes,
                         count(*) filter (where payment_status='paid' and fulfillment_status in ('pending','dispatched'))::int as open_orders,
                         count(*) filter (where payment_status in ('refund_due','mismatch'))::int as needs_attention
                    from shop.orders`),
      pool.query(`select o.id, o.order_no, o.wa_id, c.name as customer_name, o.zone_name, o.total_kes::float as total_kes,
                         o.payment_status, o.fulfillment_status, o.mpesa_receipt, o.created_at, o.paid_at,
                         (select string_agg(oi.qty || ' x ' || oi.name, '; ') from shop.order_items oi where oi.order_id = o.id) as items
                    from shop.orders o left join shop.customers c on c.wa_id = o.wa_id
                   order by o.created_at desc limit 150`),
      pool.query(`select p.id, p.name, p.description, coalesce(p.category, 'General') as category, p.image_url, p.active,
                         coalesce(json_agg(json_build_object('id', v.id, 'label', v.label, 'sku', v.sku, 'price_kes', v.price_kes::float,
                                  'active', v.active, 'on_hand', coalesce(i.on_hand,0), 'reserved', coalesce(i.reserved,0))
                                  order by v.label) filter (where v.id is not null), '[]') as variants
                    from shop.products p
                    left join shop.variants v on v.product_id = p.id
                    left join shop.inventory i on i.variant_id = v.id
                   group by p.id, p.name, p.description, p.category, p.image_url, p.active, p.sort order by p.sort, p.name`),
      pool.query(`select id, name, fee_kes::float as fee_kes, active from shop.delivery_zones order by sort, name`),
    ]);
    const lowStock = products.rows.flatMap((p) => p.variants).filter((v) => v.active && v.on_hand - v.reserved <= 3).length;
    res.json({ metrics: { ...m.rows[0], low_stock: lowStock }, orders: orders.rows, products: products.rows, zones: zones.rows });
  }));

  // ── Orders: Pending -> Dispatched -> Delivered (customer is notified in chat) ──
  r.patch('/orders/:id/status', wrap(async (req, res) => {
    const status = str(req.body?.status);
    const o = await withTx(async (c) => {
      const { rows } = await c.query('select * from shop.set_fulfillment_status($1,$2,$3)', [req.params.id, status, str(req.body?.note)]);
      return rows[0];
    });
    await boss.send(Q.NOTIFY, { orderId: o.id, status: o.fulfillment_status });
    res.json({ ok: true, order: { id: o.id, fulfillment_status: o.fulfillment_status } });
  }));

  // ── Catalog ───────────────────────────────────────────────────────────────
  r.post('/products', wrap(async (req, res) => {
    const name = str(req.body?.name);
    const description = str(req.body?.description);
    const category = str(req.body?.category) || 'General';
    const imageUrl = str(req.body?.image_url);
    if (!name) return res.status(400).json({ error: 'Name required' });
    const { rows } = await pool.query(
      'insert into shop.products(name, description, category, image_url) values ($1,$2,$3,$4) returning id',
      [name, description, category, imageUrl]);
    res.json({ ok: true, id: rows[0].id });
  }));

  r.patch('/products/:id', wrap(async (req, res) => {
    const { name, description, category, image_url, active } = req.body || {};
    await pool.query(
      `update shop.products
          set name = coalesce($2, name),
              description = coalesce($3, description),
              category = coalesce($4, category),
              image_url = coalesce($5, image_url),
              active = coalesce($6, active)
        where id = $1`,
      [req.params.id, str(name), str(description), str(category), str(image_url), typeof active === 'boolean' ? active : null]);
    res.json({ ok: true });
  }));

  r.post('/variants', wrap(async (req, res) => {
    const { product_id } = req.body || {};
    const label = str(req.body?.label), price = num(req.body?.price_kes), stock = num(req.body?.stock) ?? 0;
    if (!product_id || !label || price === null) return res.status(400).json({ error: 'product_id, label and price_kes required' });
    const id = await withTx(async (c) => {
      const { rows } = await c.query('insert into shop.variants(product_id,label,sku,price_kes) values ($1,$2,$3,$4) returning id',
        [product_id, label, str(req.body?.sku), price]);
      await c.query('insert into shop.inventory(variant_id,on_hand) values ($1,$2)', [rows[0].id, Math.floor(stock)]);
      return rows[0].id;
    });
    res.json({ ok: true, id });
  }));

  r.patch('/variants/:id', wrap(async (req, res) => {
    const { label, price_kes, active } = req.body || {};
    await pool.query(
      `update shop.variants set label = coalesce($2,label), price_kes = coalesce($3,price_kes), active = coalesce($4,active) where id = $1`,
      [req.params.id, str(label), num(price_kes), typeof active === 'boolean' ? active : null]);
    res.json({ ok: true });
  }));

  // ── Inventory: absolute set. Row lock + CHECK constraint stop it dropping below reserved. ──
  r.put('/inventory/:variantId', wrap(async (req, res) => {
    const onHand = num(req.body?.on_hand);
    if (onHand === null) return res.status(400).json({ error: 'on_hand must be a non-negative number' });
    await pool.query(
      `insert into shop.inventory(variant_id,on_hand) values ($1,$2)
       on conflict (variant_id) do update set on_hand = excluded.on_hand, updated_at = now()`,
      [req.params.variantId, Math.floor(onHand)]);
    res.json({ ok: true });
  }));

  // ── Delivery zones ────────────────────────────────────────────────────────
  r.post('/zones', wrap(async (req, res) => {
    const name = str(req.body?.name), fee = num(req.body?.fee_kes);
    if (!name || fee === null) return res.status(400).json({ error: 'name and fee_kes required' });
    await pool.query('insert into shop.delivery_zones(name, fee_kes) values ($1,$2)', [name, fee]);
    res.json({ ok: true });
  }));

  r.patch('/zones/:id', wrap(async (req, res) => {
    const { name, fee_kes, active } = req.body || {};
    await pool.query(
      `update shop.delivery_zones set name = coalesce($2,name), fee_kes = coalesce($3,fee_kes), active = coalesce($4,active) where id = $1`,
      [req.params.id, str(name), num(fee_kes), typeof active === 'boolean' ? active : null]);
    res.json({ ok: true });
  }));

  return r;
}
