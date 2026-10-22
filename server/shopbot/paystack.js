import { cfg } from './config.js';

const api = (path, init = {}) =>
  fetch(`https://api.paystack.co${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${cfg.paystackSecret}`,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(15_000),
  });

/** Trigger STK push. phone = 2547XXXXXXXX. Throws with a user-safe message on failure. */
export async function chargeMpesa({ reference, amountKes, phone, waId, orderNo }) {
  const res = await api('/charge', {
    method: 'POST',
    body: JSON.stringify({
      email: `${waId}@customers.shopbot.app`,
      amount: Math.round(amountKes * 100),
      currency: 'KES',
      reference,
      mobile_money: { phone: `+${phone}`, provider: 'mpesa' },
      metadata: { tenant: 'shopbot', order_no: orderNo },
    }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || j.status === false || j.data?.status === 'failed') {
    throw new Error(j.message || j.data?.message || `Paystack charge failed (${res.status})`);
  }
  return j.data; // data.status is typically "pay_offline" (prompt sent)
}

/** Source of truth for payment state. */
export async function verify(reference) {
  const res = await api(`/transaction/verify/${encodeURIComponent(reference)}`);
  if (res.status === 404) return { status: 'unknown' };
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.data) throw new Error(`Paystack verify ${res.status}: ${j.message || ''}`);
  const d = j.data;
  return {
    status: d.status, // success | failed | abandoned | ongoing | pending | reversed
    amount: Number(d.amount), // subunits
    currency: d.currency,
    receipt: d.receipt_number || d.authorization?.receipt_number || String(d.id ?? ''),
  };
}
