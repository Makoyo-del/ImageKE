import { chargeMpesa } from './paystack.js';
import { cfg } from './config.js';
import { Q } from './queue.js';

// ─── helpers ─────────────────────────────────────────────────────────────────
const kes = (n) => `KES ${Number(n).toLocaleString('en-KE')}`;
const GREETING = /^(hi|hello|hey|hallo|start|menu|restart|order|shop|jambo|mambo|hii)\b/i;
const HUMAN_TRIGGER = /^(human|agent|support|help|owner|talk to human|speak to human|talk to agent|customer care|issue|problem|admin)\b/i;

const nairobi = (d) =>
  new Date(d).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', dateStyle: 'short', timeStyle: 'short' });

export function normalizePhone(raw) {
  const d = String(raw || '').replace(/\D/g, '');
  if (/^254[71]\d{8}$/.test(d)) return d;
  if (/^0[71]\d{8}$/.test(d)) return '254' + d.slice(1);
  if (/^[71]\d{8}$/.test(d)) return '254' + d;
  return null;
}

export function statusLabel(o) {
  switch (o.payment_status) {
    case 'unpaid': return '💳 Awaiting payment';
    case 'expired': return '⌛ Expired (not paid)';
    case 'cancelled': return '✖️ Cancelled';
    case 'failed': return '❌ Payment failed';
    case 'refund_due': return '↩️ Refund in progress';
    case 'mismatch': return '⚠️ Payment under review';
    default:
      return { pending: '⏳ Confirmed – being prepared', dispatched: '🚚 Dispatched', delivered: '✅ Delivered', cancelled: '✖️ Cancelled' }[o.fulfillment_status];
  }
}

// ─── views: each returns an array of outbound messages ──────────────────────
const view = {
  async menu(client, name, filterCategory = null) {
    const hello = `Hi${name ? ' ' + name.split(' ')[0] : ''}! 👋 Welcome to *${cfg.businessName}*.`;
    const trackRow = { id: 'TRACK', title: '📦 Track my order' };
    const humanRow = { id: 'HUMAN', title: '💬 Talk to Agent' };

    // 1. Check if we should present Category Hierarchy (if store has multiple categories & > 6 items)
    if (!filterCategory) {
      const { rows: stats } = await client.query(`
        select count(distinct p.category)::int as cat_count, count(distinct p.id)::int as prod_count
          from shop.products p
          join shop.variants v on v.product_id = p.id and v.active
          join shop.inventory i on i.variant_id = v.id
         where p.active and i.on_hand - i.reserved > 0`);

      if (stats[0]?.cat_count > 1 && stats[0]?.prod_count > 6) {
        const { rows: cats } = await client.query(`
          select p.category, count(distinct p.id)::int as item_count
            from shop.products p
            join shop.variants v on v.product_id = p.id and v.active
            join shop.inventory i on i.variant_id = v.id
           where p.active and i.on_hand - i.reserved > 0
           group by p.category
           order by p.category
           limit 8`);

        return [{
          type: 'list',
          body: `${hello}\nWhat are you shopping for today? Browse by category 👇`,
          button: 'Categories',
          sections: [
            {
              title: 'Categories',
              rows: [
                ...cats.map((c) => ({ id: `CAT:${c.category}`, title: c.category.slice(0, 24), description: `${c.item_count} items available` })),
                { id: 'CAT:ALL', title: 'View All Products', description: 'See complete catalog' }
              ]
            },
            { title: 'Support & Orders', rows: [trackRow, humanRow] }
          ]
        }];
      }
    }

    // 2. Display Products (filtered by category if chosen, else flat list)
    const categoryClause = filterCategory && filterCategory !== 'ALL' ? 'and p.category = $1' : '';
    const params = filterCategory && filterCategory !== 'ALL' ? [filterCategory] : [];

    const { rows } = await client.query(`
      select p.id, p.name, p.image_url, p.category, min(v.price_kes) as from_price, sum(i.on_hand - i.reserved)::int as avail
        from shop.products p
        join shop.variants v  on v.product_id = p.id and v.active
        join shop.inventory i on i.variant_id = v.id
       where p.active and i.on_hand - i.reserved > 0 ${categoryClause}
       group by p.id
      having sum(i.on_hand - i.reserved) > 0
       order by min(p.sort), p.name
       limit 8`, params);

    if (!rows.length) {
      return [{
        type: 'buttons',
        body: `${hello}\nItems in this category are currently sold out. Check back soon!`,
        buttons: [{ id: 'MENU', title: '🛍️ All Categories' }, trackRow, humanRow]
      }];
    }

    const titlePrefix = filterCategory && filterCategory !== 'ALL' ? `*${filterCategory}*\n` : `${hello}\n`;
    return [{
      type: 'list',
      body: `${titlePrefix}Pick a product to view sizes & options 👇`,
      button: 'View Products',
      sections: [
        {
          title: filterCategory ? filterCategory.slice(0, 24) : 'Products',
          rows: rows.map((r) => ({ id: `P:${r.id}`, title: r.name.slice(0, 24), description: `From ${kes(r.from_price)} • ${r.avail} in stock` }))
        },
        { title: 'Support & Orders', rows: [trackRow, humanRow] }
      ]
    }];
  },

  variants(rows, product) {
    const messages = [];

    // If product has an image, send the high-res photo first so the buyer sees it!
    if (product.image_url) {
      messages.push({
        type: 'image',
        url: product.image_url,
        caption: `*${product.name}*\n${product.description || ''}`
      });
    }

    messages.push({
      type: 'list',
      body: `*${product.name}*\nSelect your preferred size/variant:`,
      button: 'Select Option',
      sections: [{
        title: 'Available Options',
        rows: rows.slice(0, 10).map((r) => ({ id: `V:${r.id}`, title: r.label.slice(0, 24), description: `${kes(r.price_kes)} • ${r.avail} in stock` }))
      }]
    });

    return messages;
  },

  qty(ctx, note) {
    const max = Math.min(ctx.avail, 20);
    return [{
      type: 'buttons',
      body: `${note ? note + '\n\n' : ''}*${ctx.product_name} – ${ctx.variant_label}*\nPrice: ${kes(ctx.price)} each\n\nHow many would you like? Tap a quantity below or type any number (1-${max}):`,
      buttons: [1, 2, 3].filter((n) => n <= max).map((n) => ({ id: `Q:${n}`, title: `${n} pcs` })),
    }];
  },

  async zones(client) {
    const { rows } = await client.query(`select id, name, fee_kes from shop.delivery_zones where active order by sort, name limit 10`);
    return [{
      type: 'list',
      body: '📍 *Delivery Location*\nWhere should we deliver your order?',
      button: 'Select Area',
      sections: [{ title: 'Delivery Areas', rows: rows.map((z) => ({ id: `Z:${z.id}`, title: z.name.slice(0, 24), description: `Delivery fee: ${kes(z.fee_kes)}` })) }],
    }];
  },

  confirm(ctx) {
    const phone = ctx.mpesa_phone ?? ctx.wa_id;
    const isAlternate = ctx.mpesa_phone && ctx.mpesa_phone !== ctx.wa_id;
    return [{
      type: 'buttons',
      body:
        `🧾 *Order Summary*\n` +
        `• ${ctx.qty} × ${ctx.product_name} (${ctx.variant_label}): ${kes(ctx.subtotal)}\n` +
        `• Delivery (${ctx.zone_name}): ${kes(ctx.fee)}\n` +
        `━━━━━━━━━━━━━━━\n` +
        `*Grand Total: ${kes(ctx.total)}*\n\n` +
        `📲 *M-PESA STK Prompt to:* +${phone}` +
        (isAlternate
          ? `\n_(⚠️ Prompt sent to alternate phone. Receipt and updates stay in this WhatsApp chat)_`
          : `\n_(Receipt and tracking will be sent to this WhatsApp)_`),
      buttons: [
        { id: 'PAY', title: `Pay ${kes(ctx.total)}` },
        { id: 'PHONE', title: 'Other M-PESA No.' },
        { id: 'CANCEL', title: 'Cancel Order' },
      ],
    }];
  },
};

export async function trackView(client, waId) {
  const { rows } = await client.query(
    `select o.id, o.order_no, o.total_kes, o.payment_status, o.fulfillment_status, o.created_at,
            (select string_agg(oi.qty || '× ' || oi.name, ', ') from shop.order_items oi where oi.order_id = o.id) as items
       from shop.orders o where o.wa_id = $1 order by o.created_at desc limit 3`, [waId]);
  const nav = [{ id: 'TRACK', title: '🔄 Refresh' }, { id: 'MENU', title: '🛍️ Shop' }, { id: 'HUMAN', title: '💬 Support' }];
  if (!rows.length) return [{ type: 'buttons', body: "You don't have any orders yet.", buttons: [{ id: 'MENU', title: '🛍️ Shop Now' }] }];

  const latest = rows[0];
  const ev = (await client.query(
    `select kind, note, created_at from shop.order_events where order_id = $1 order by created_at desc limit 4`, [latest.id])).rows;

  let body = `📦 *Order ${latest.order_no}*\n${latest.items}\nTotal: ${kes(latest.total_kes)}\nStatus: *${statusLabel(latest)}*`;
  if (ev.length) body += '\n\n' + ev.map((e) => `• ${nairobi(e.created_at)} – ${e.note || e.kind}`).join('\n');
  if (rows.length > 1) body += '\n\nEarlier orders:\n' + rows.slice(1).map((o) => `${o.order_no} – ${statusLabel(o)}`).join('\n');
  return [{ type: 'buttons', body, buttons: nav }];
}

// ─── the state machine ──────────────────────────────────────────────────────
/**
 * step() executes inside a per-user advisory-locked PostgreSQL transaction.
 * States: IDLE/BROWSING -> PICK_VARIANT -> ASK_QTY -> PICK_AREA -> CONFIRM (-> ASK_PHONE)
 *         -> AWAITING_PAYMENT -> (payment webhook / worker) -> IDLE
 *         HUMAN_SUPPORT: stops bot automation and routes to human operator.
 */
export async function step({ client, waId, session, input, profileName }) {
  const state = session.state || 'IDLE';
  const ctx = { ...(session.ctx || {}), wa_id: waId };
  const id = input.id || '';
  const text = (input.text || '').trim();
  const R = (s, c, out, after = []) => ({ state: s, ctx: c, out, after });
  const toMenu = async (cat = null) => R('BROWSING', { wa_id: waId }, await view.menu(client, profileName, cat));

  // ── Global: Human Support Handover ──────────────────────────────────────────
  if (id === 'HUMAN' || HUMAN_TRIGGER.test(text)) {
    const alertJob = cfg.ownerWa ? [{
      queue: Q.NOTIFY,
      data: {
        type: 'human_handover',
        waId,
        customerName: profileName || 'Customer',
        message: text || 'Customer tapped Talk to Agent'
      }
    }] : [];

    return R('HUMAN_SUPPORT', ctx, [{
      type: 'buttons',
      body: `👋 You are connected to our support desk.\n\nDuncan / our team has been alerted and will message you directly in this chat shortly.\n\nTap below anytime if you wish to return to shopping 👇`,
      buttons: [{ id: 'MENU', title: '🛍️ Back to Shopping' }, { id: 'TRACK', title: '📦 Track My Order' }]
    }], alertJob);
  }

  // If in HUMAN_SUPPORT, bot stays paused unless user explicitly restarts or tracks
  if (state === 'HUMAN_SUPPORT') {
    if (id === 'MENU' || GREETING.test(text)) return toMenu();
    if (id === 'TRACK' || /^track\b/i.test(text)) return R(state, ctx, await trackView(client, waId));
    // Let human converse freely without bot interference
    return R(state, ctx, []);
  }

  // ── Global: Tracking ────────────────────────────────────────────────────────
  if (id === 'TRACK' || /^track\b/i.test(text)) {
    return R(state, session.ctx || {}, await trackView(client, waId));
  }

  // ── AWAITING_PAYMENT ────────────────────────────────────────────────────────
  if (state === 'AWAITING_PAYMENT') {
    if (id === 'CANCEL') {
      const r = await client.query(
        `update shop.orders set payment_status='cancelled', updated_at=now()
          where id=$1 and payment_status='unpaid' returning id`, [ctx.order_id]);
      if (r.rowCount) {
        await client.query(`select shop.release_order($1,'released')`, [ctx.order_id]);
        await client.query(`insert into shop.order_events(order_id,kind,note) values ($1,'cancelled','Cancelled by customer')`, [ctx.order_id]);
      }
      const menu = await view.menu(client, profileName);
      return R('BROWSING', { wa_id: waId }, [{ type: 'text', text: 'Order cancelled.' }, ...menu]);
    }
    return R(state, ctx, [{
      type: 'buttons',
      body: `⏳ Waiting for your M-PESA payment for *${ctx.order_no}*.\nCheck your phone and enter your PIN.`,
      buttons: [{ id: 'TRACK', title: '📦 Track order' }, { id: 'CANCEL', title: '❌ Cancel order' }],
    }]);
  }

  if (id === 'MENU' || id === 'CANCEL' || GREETING.test(text)) return toMenu();

  switch (state) {
    // ── Browsing & Category Selection ─────────────────────────────────────────
    case 'IDLE':
    case 'BROWSING': {
      if (id.startsWith('CAT:')) {
        const cat = id.slice(4);
        return toMenu(cat);
      }

      if (!id.startsWith('P:')) return toMenu();

      const { rows: prodRows } = await client.query(
        `select id, name, description, image_url from shop.products where id = $1 and active`, [id.slice(2)]);
      if (!prodRows.length) return toMenu();
      const product = prodRows[0];

      const { rows: varRows } = await client.query(
        `select v.id, v.label, v.price_kes, (i.on_hand - i.reserved)::int as avail
           from shop.variants v
           join shop.inventory i on i.variant_id = v.id
          where v.product_id = $1 and v.active and i.on_hand - i.reserved > 0
          order by v.price_kes, v.label`, [product.id]);

      if (!varRows.length) {
        return R('BROWSING', { wa_id: waId }, [
          { type: 'text', text: `Sorry, *${product.name}* just sold out 😕` },
          ...(await view.menu(client, profileName))
        ]);
      }

      const base = {
        wa_id: waId,
        product_id: product.id,
        product_name: product.name,
        image_url: product.image_url
      };

      if (varRows.length === 1) {
        const v = varRows[0];
        const c = { ...base, variant_id: v.id, variant_label: v.label, price: Number(v.price_kes), avail: v.avail };
        const qtyView = view.qty(c);
        if (product.image_url) {
          qtyView.unshift({ type: 'image', url: product.image_url, caption: `*${product.name}*\n${product.description || ''}` });
        }
        return R('ASK_QTY', c, qtyView);
      }

      return R('PICK_VARIANT', base, view.variants(varRows, product));
    }

    // ── Variant Selection ─────────────────────────────────────────────────────
    case 'PICK_VARIANT': {
      const reprompt = async (note) => {
        const { rows: [p] } = await client.query(`select id, name, description, image_url from shop.products where id = $1`, [ctx.product_id]);
        const { rows } = await client.query(
          `select v.id, v.label, v.price_kes, (i.on_hand - i.reserved)::int as avail
             from shop.variants v join shop.inventory i on i.variant_id = v.id
            where v.product_id = $1 and v.active and i.on_hand - i.reserved > 0 order by v.price_kes, v.label`, [ctx.product_id]);
        if (!rows.length) return toMenu();
        return R('PICK_VARIANT', ctx, [...(note ? [{ type: 'text', text: note }] : []), ...view.variants(rows, p)]);
      };

      if (!id.startsWith('V:')) return reprompt('Please pick an option from the list 👇');
      const { rows: [v] } = await client.query(
        `select v.id, v.label, v.price_kes, (i.on_hand - i.reserved)::int as avail
           from shop.variants v join shop.inventory i on i.variant_id = v.id
          where v.id = $1 and v.active`, [id.slice(2)]);
      if (!v || v.avail < 1) return reprompt('That option just sold out 😕 Pick another:');
      const c = { ...ctx, variant_id: v.id, variant_label: v.label, price: Number(v.price_kes), avail: v.avail };
      return R('ASK_QTY', c, view.qty(c));
    }

    // ── Quantity ─────────────────────────────────────────────────────────────
    case 'ASK_QTY': {
      const n = id.startsWith('Q:') ? parseInt(id.slice(2), 10) : /^\d{1,3}$/.test(text) ? parseInt(text, 10) : NaN;
      const { rows: [inv] } = await client.query(
        `select (on_hand - reserved)::int as avail from shop.inventory where variant_id = $1`, [ctx.variant_id]);
      const avail = inv?.avail ?? 0;
      if (avail < 1) return toMenu();
      const c = { ...ctx, avail };
      const max = Math.min(avail, 20);
      if (!Number.isInteger(n) || n < 1) return R('ASK_QTY', c, view.qty(c, 'Please enter a valid number.'));
      if (n > max) return R('ASK_QTY', c, view.qty(c, `Only ${max} available in stock right now.`));
      return R('PICK_AREA', { ...c, qty: n }, await view.zones(client));
    }

    // ── Delivery Area ────────────────────────────────────────────────────────
    case 'PICK_AREA': {
      if (!id.startsWith('Z:')) return R(state, ctx, [{ type: 'text', text: 'Please choose your delivery location 👇' }, ...(await view.zones(client))]);
      const { rows: [z] } = await client.query(`select id, name, fee_kes from shop.delivery_zones where id = $1 and active`, [id.slice(2)]);
      if (!z) return R(state, ctx, await view.zones(client));
      const subtotal = ctx.price * ctx.qty;
      const c = { ...ctx, zone_id: z.id, zone_name: z.name, fee: Number(z.fee_kes), subtotal, total: subtotal + Number(z.fee_kes) };
      return R('CONFIRM', c, view.confirm(c));
    }

    // ── Alternate M-PESA Phone Input ─────────────────────────────────────────
    case 'ASK_PHONE': {
      const p = normalizePhone(text);
      if (!p) {
        return R(state, ctx, [{
          type: 'text',
          text: '❌ Invalid number. Please enter a valid Safaricom phone number, e.g. 0712345678 or 254712345678:'
        }]);
      }
      const c = { ...ctx, mpesa_phone: p };
      return R('CONFIRM', c, [
        { type: 'text', text: `✅ M-PESA prompt will be sent to +${p}. (Order remains saved to this WhatsApp chat).` },
        ...view.confirm(c)
      ]);
    }

    // ── Checkout & STK Push ──────────────────────────────────────────────────
    case 'CONFIRM': {
      if (id === 'PHONE') {
        return R('ASK_PHONE', ctx, [{
          type: 'text',
          text: `📱 Type the Safaricom number that should receive the M-PESA PIN prompt (e.g. 0712345678):`
        }]);
      }
      if (id !== 'PAY') return R(state, ctx, view.confirm(ctx));

      const phone = ctx.mpesa_phone ?? waId;
      let order;
      await client.query('savepoint hold');
      try {
        ({ rows: [order] } = await client.query(
          `select * from shop.create_order_with_hold($1,$2,$3,$4,$5,5)`,
          [waId, ctx.variant_id, ctx.qty, ctx.zone_id, phone]));
        await client.query('release savepoint hold');
      } catch (e) {
        await client.query('rollback to savepoint hold');
        if (/OUT_OF_STOCK/.test(e.message)) {
          return R('BROWSING', { wa_id: waId }, [
            { type: 'text', text: 'Sorry, someone just checked out the last available stock 😕' },
            ...(await view.menu(client, profileName))
          ]);
        }
        if (/VARIANT_UNAVAILABLE|ZONE_UNAVAILABLE|BAD_QTY/.test(e.message)) return toMenu();
        throw e;
      }

      try {
        await chargeMpesa({ reference: order.paystack_ref, amountKes: Number(order.total_kes), phone, waId, orderNo: order.order_no });
      } catch (e) {
        console.error('[charge]', order.order_no, e.message);
        await client.query(`update shop.orders set payment_status='failed', updated_at=now() where id=$1`, [order.id]);
        await client.query(`select shop.release_order($1,'released')`, [order.id]);
        return R('CONFIRM', ctx, [
          { type: 'text', text: `❌ M-PESA prompt could not be dispatched: ${e.message}. Please check the number and tap Pay again.` },
          ...view.confirm(ctx)
        ]);
      }

      return R(
        'AWAITING_PAYMENT',
        { wa_id: waId, order_id: order.id, order_no: order.order_no },
        [{
          type: 'buttons',
          body: `📲 *M-PESA prompt sent to +${phone}!* \n\nEnter your M-PESA PIN to pay *${kes(order.total_kes)}* for order *${order.order_no}*.\n\nYour items are reserved for 5 minutes. As soon as you pay, your receipt will be sent here!`,
          buttons: [{ id: 'TRACK', title: '📦 Track Order' }, { id: 'CANCEL', title: '❌ Cancel Order' }],
        }],
        [{ queue: Q.PAYMENT, data: { reference: order.paystack_ref, attempt: 1 }, opts: { startAfter: 15 } }],
      );
    }

    default:
      return toMenu();
  }
}
