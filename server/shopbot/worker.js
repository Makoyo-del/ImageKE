import { cfg } from './config.js';
import { pool, withTx, withUserTx } from './db.js';
import { Q } from './queue.js';
import { step } from './stateMachine.js';
import { sendOut, sendText, sendDocument, sendTemplate, uploadPdf } from './whatsapp.js';
import { verify } from './paystack.js';
import { buildReceiptPdf } from './receipt.js';

const kes = (n) => `KES ${Number(n).toLocaleString('en-KE')}`;

// ─── inbound message ────────────────────────────────────────────────────────
function normalizeInput(msg) {
  if (msg.type === 'text') return { kind: 'text', text: msg.text?.body ?? '' };
  if (msg.type === 'interactive') {
    const r = msg.interactive?.button_reply ?? msg.interactive?.list_reply;
    return { kind: 'choice', id: r?.id ?? '', text: r?.title ?? '' };
  }
  return { kind: 'other' }; // images, voice, stickers... -> treated as "show me the menu"
}

async function processInbound(job, boss) {
  const { msg, profileName } = job.data;
  const waId = msg.from;
  const after = [];

  await withUserTx(waId, async (c) => {
    // Idempotency: Meta retries / duplicate jobs become no-ops.
    const dedup = await c.query(
      'insert into shop.processed_messages(wamid) values ($1) on conflict do nothing returning wamid', [msg.id]);
    if (!dedup.rowCount) return;

    await c.query(
      `insert into shop.customers(wa_id, name) values ($1,$2)
       on conflict (wa_id) do update set last_seen = now(), name = coalesce(excluded.name, shop.customers.name)`,
      [waId, profileName]);

    const { rows: [s] } = await c.query('select state, ctx from shop.sessions where wa_id = $1', [waId]);
    const result = await step({
      client: c, waId, profileName,
      session: s ?? { state: 'IDLE', ctx: {} },
      input: normalizeInput(msg),
    });

    await c.query(
      `insert into shop.sessions(wa_id, state, ctx) values ($1,$2,$3)
       on conflict (wa_id) do update set state = excluded.state, ctx = excluded.ctx, updated_at = now()`,
      [waId, result.state, JSON.stringify(result.ctx)]);

    // Send inside the tx: if Meta 5xx's we throw -> rollback state+dedup -> pg-boss retries cleanly.
    for (const o of result.out) await sendOut(waId, o);
    after.push(...result.after);
  });

  for (const a of after) await boss.send(a.queue, a.data, a.opts);
}

// ─── payment confirmation (webhook OR polling both land here) ───────────────
async function releaseSession(waId, orderId) {
  await pool.query(
    `update shop.sessions set state='IDLE', ctx='{}'::jsonb, updated_at=now()
      where wa_id=$1 and state='AWAITING_PAYMENT' and ctx->>'order_id' = $2`, [waId, orderId]);
}

async function notifyPaid(orderId) {
  const { rows: [o] } = await pool.query('select * from shop.orders where id = $1', [orderId]);
  if (!o) return;
  const { rows: items } = await pool.query(
    'select name, qty, unit_price::float as unit_price from shop.order_items where order_id = $1 order by name', [orderId]);

  // 1) Thermal PDF receipt. Failure must never block the confirmation or the owner alert.
  let pdfSent = !!o.receipt_sent_at;
  if (!pdfSent) {
    try {
      const pdf = await buildReceiptPdf({ businessName: cfg.businessName, order: o, items });
      const filename = `Receipt-${o.order_no}.pdf`;
      const mediaId = await uploadPdf(pdf, filename);
      await sendDocument(o.wa_id, mediaId, filename, `Receipt ${o.order_no}`);
      await pool.query('update shop.orders set receipt_sent_at = now() where id = $1', [orderId]);
      pdfSent = true;
    } catch (e) {
      console.error('[receipt] PDF delivery failed, falling back to text:', o.order_no, e.message);
    }
  }

  // 2) Confirmation message (full text receipt only if the PDF could not be sent).
  if (!o.buyer_notified_at) {
    const lines = items.map((i) => `${i.qty} x ${i.name} - ${kes(i.qty * i.unit_price)}`).join('\n');
    const body = pdfSent
      ? `✅ *Payment received – thank you!*\nOrder *${o.order_no}* • ${kes(o.total_kes)}\nYour receipt is above. We'll update you as your order moves.`
      : `✅ *Payment received – thank you!*\n🧾 *Receipt ${o.order_no}*\n${lines}\nDelivery (${o.zone_name}): ${kes(o.delivery_fee_kes)}\n*Total paid: ${kes(o.total_kes)}*\nM-PESA ref: ${o.mpesa_receipt || '-'}`;
    await sendOut(o.wa_id, {
      type: 'buttons',
      body,
      buttons: [{ id: 'TRACK', title: '📦 Track order' }, { id: 'MENU', title: '🛍️ Shop more' }],
    });
    await pool.query('update shop.orders set buyer_notified_at = now() where id = $1', [orderId]);
  }

  // 3) Owner alert: approved template (works outside the 24h window), else plain text.
  if (cfg.ownerWa && !o.owner_notified_at) {
    const itemsLine = items.map((i) => `${i.qty} x ${i.name}`).join('; ');
    if (cfg.ownerTemplate.name) {
      await sendTemplate(cfg.ownerWa, cfg.ownerTemplate.name, cfg.ownerTemplate.lang, [
        o.order_no, o.wa_id, itemsLine, o.zone_name, Number(o.total_kes).toLocaleString('en-KE'), o.mpesa_receipt || '-',
      ]);
    } else {
      await sendText(cfg.ownerWa,
        `💰 *New paid order ${o.order_no}*\nCustomer: +${o.wa_id}\n${itemsLine}\nZone: ${o.zone_name}\nTotal: ${kes(o.total_kes)}\nM-PESA: ${o.mpesa_receipt || '-'}`);
    }
    await pool.query('update shop.orders set owner_notified_at = now() where id = $1', [orderId]);
  }
}

// Owner changed the fulfilment status in the dashboard -> tell the customer.
async function processNotify(job) {
  const { orderId, status } = job.data;
  const { rows: [o] } = await pool.query('select wa_id, order_no, fulfillment_status from shop.orders where id = $1', [orderId]);
  if (!o || o.fulfillment_status !== status) return; // superseded by a newer status
  const msg = {
    dispatched: `🚚 Good news! Order *${o.order_no}* has been *dispatched* and is on its way.`,
    delivered: `✅ Order *${o.order_no}* has been *delivered*. Thank you for shopping with us!`,
    cancelled: `✖️ Order *${o.order_no}* was cancelled. We'll contact you about your refund.`,
    pending: `⏳ Order *${o.order_no}* is being prepared.`,
  }[status];
  if (msg) await sendOut(o.wa_id, { type: 'buttons', body: msg, buttons: [{ id: 'TRACK', title: '📦 Track order' }, { id: 'MENU', title: '🛍️ Shop' }] });
}

async function processPaymentCheck(job, boss) {
  const { reference, attempt = 1 } = job.data;
  if (!reference?.startsWith('SB-')) return;

  const v = await verify(reference); // never trust webhook payloads

  if (v.status === 'success') {
    if (v.currency && v.currency !== 'KES') return console.error('[pay] unexpected currency', reference, v.currency);
    const { rows: [res] } = await pool.query('select * from shop.finalize_payment($1,$2,$3)', [reference, v.amount, v.receipt]);
    console.log(`[pay] ${reference} -> ${res?.r_outcome}`);
    if (res?.r_outcome === 'PAID') {
      const { rows: [o] } = await pool.query('select wa_id from shop.orders where id=$1', [res.r_order_id]);
      await releaseSession(o.wa_id, res.r_order_id);
      await notifyPaid(res.r_order_id);
    } else if (res?.r_outcome === 'ALREADY_PAID') {
      await notifyPaid(res.r_order_id); // resumes a half-finished notification
    } else if (res?.r_outcome === 'REFUND_DUE' || res?.r_outcome === 'AMOUNT_MISMATCH') {
      const { rows: [o] } = await pool.query('select wa_id, order_no from shop.orders where id=$1', [res.r_order_id]);
      await releaseSession(o.wa_id, res.r_order_id);
      await sendText(o.wa_id, `We received your payment for ${o.order_no} but couldn't complete the order. We'll contact you shortly to resolve it.`);
      if (cfg.ownerWa) await sendText(cfg.ownerWa, `⚠️ ${res.r_outcome} on ${o.order_no} (+${o.wa_id}). Action needed.`);
    }
    return;
  }

  if (['failed', 'abandoned', 'reversed'].includes(v.status)) {
    const r = await withTx(async (c) => {
      const u = await c.query(
        `update shop.orders set payment_status='failed', updated_at=now()
          where paystack_ref=$1 and payment_status='unpaid' returning id, wa_id, order_no`, [reference]);
      if (!u.rowCount) return null;
      await c.query(`select shop.release_order($1,'released')`, [u.rows[0].id]);
      await c.query(`insert into shop.order_events(order_id,kind,note) values ($1,'failed','Payment failed or cancelled')`, [u.rows[0].id]);
      return u.rows[0];
    });
    if (r) {
      await releaseSession(r.wa_id, r.id);
      await sendOut(r.wa_id, {
        type: 'buttons',
        body: `❌ Payment for *${r.order_no}* wasn't completed, so nothing was charged. Want to try again?`,
        buttons: [{ id: 'MENU', title: '🛍️ Try again' }],
      });
    }
    return;
  }

  // still pending/ongoing/unknown -> poll again (webhook may also arrive first; both are idempotent)
  if (attempt < 8) {
    await boss.send(Q.PAYMENT, { reference, attempt: attempt + 1 }, { startAfter: attempt < 3 ? 15 : 30 });
  }
}

// ─── reaper: expire stale holds + re-poll orphaned payments (every minute) ──
async function processReaper(boss) {
  const { rows: expired } = await pool.query('select * from shop.expire_stale_orders()');
  for (const e of expired) {
    await releaseSession(e.r_wa_id, e.r_order_id);
    await sendOut(e.r_wa_id, {
      type: 'buttons',
      body: `⌛ Your reservation for *${e.r_order_no}* expired because no payment was received.`,
      buttons: [{ id: 'MENU', title: '🛍️ Start again' }],
    });
  }
  const { rows: pending } = await pool.query(
    `select paystack_ref from shop.orders
      where payment_status='unpaid' and paystack_ref is not null
        and created_at < now() - interval '45 seconds' and hold_expires_at > now()`);
  for (const p of pending) await boss.send(Q.PAYMENT, { reference: p.paystack_ref, attempt: 6 });
}

// ─── registration ───────────────────────────────────────────────────────────
export async function startWorkers(boss) {
  // pg-boss v10 hands handlers an array; batchSize 1 keeps retry semantics per-message.
  const opts = { batchSize: 1, pollingIntervalSeconds: 0.5 };

  // N parallel pollers => N users processed simultaneously (per-user order kept by advisory lock).
  for (let i = 0; i < cfg.workerConcurrency; i++) {
    await boss.work(Q.INBOUND, opts, async ([job]) => processInbound(job, boss));
    await boss.work(Q.PAYMENT, opts, async ([job]) => processPaymentCheck(job, boss));
    await boss.work(Q.NOTIFY, opts, async ([job]) => processNotify(job));
  }
  await boss.work(Q.REAPER, { batchSize: 1 }, async () => processReaper(boss));
  await boss.schedule(Q.REAPER, '* * * * *');

  console.log(`[worker] started (concurrency ${cfg.workerConcurrency})`);
}

export const registerWorkers = startWorkers;
