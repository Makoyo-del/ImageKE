import crypto from 'node:crypto';
import express from 'express';
import { cfg } from './config.js';
import { Q } from './queue.js';
import { adminRouter } from './admin.js';

const safeEq = (a, b) => {
  const x = Buffer.from(a || '');
  const y = Buffer.from(b || '');
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

export function startServer(boss) {
  const app = express();
  app.disable('x-powered-by');

  app.get('/health', (_req, res) => res.json({ ok: true }));

  // Owner dashboard API (workspace portal -> bot). Isolated, auth-gated router.
  app.use('/admin', adminRouter(boss));

  // ── Meta verification handshake ────────────────────────────────────────────
  app.get('/webhook', (req, res) => {
    if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === cfg.wa.verifyToken) {
      return res.status(200).send(req.query['hub.challenge']);
    }
    return res.sendStatus(403);
  });

  // ── Meta inbound messages ──────────────────────────────────────────────────
  // Raw body is required for HMAC verification.
  app.post('/webhook', express.raw({ type: '*/*', limit: '1mb' }), async (req, res) => {
    try {
      if (cfg.wa.appSecret) {
        const expected =
          'sha256=' + crypto.createHmac('sha256', cfg.wa.appSecret).update(req.body).digest('hex');
        if (!safeEq(expected, req.get('x-hub-signature-256'))) return res.sendStatus(401);
      }

      const body = JSON.parse(req.body.toString('utf8'));
      if (body.object !== 'whatsapp_business_account') return res.sendStatus(200);

      const jobs = [];
      for (const entry of body.entry ?? []) {
        for (const change of entry.changes ?? []) {
          const v = change.value ?? {};
          // Shared-app safety: only handle OUR number.
          if (v.metadata?.phone_number_id !== cfg.wa.phoneNumberId) continue;
          const names = Object.fromEntries((v.contacts ?? []).map((c) => [c.wa_id, c.profile?.name]));
          for (const msg of v.messages ?? []) {
            jobs.push({ msg, profileName: names[msg.from] ?? null });
          }
          // v.statuses (delivery receipts) intentionally ignored.
        }
      }

      // One tiny INSERT per message (~ms). Enqueue BEFORE acking so nothing is lost;
      // if Postgres is down we return 500 and Meta retries.
      await Promise.all(jobs.map((j) => boss.send(Q.INBOUND, j)));
      return res.sendStatus(200);
    } catch (e) {
      console.error('[webhook] enqueue failed:', e.message);
      return res.sendStatus(500);
    }
  });

  // ── Paystack webhook (optional accelerator; polling is the safety net) ─────
  app.post('/paystack/webhook', express.raw({ type: '*/*', limit: '1mb' }), async (req, res) => {
    try {
      const sig = crypto.createHmac('sha512', cfg.paystackSecret).update(req.body).digest('hex');
      if (!safeEq(sig, req.get('x-paystack-signature'))) return res.sendStatus(401);

      const evt = JSON.parse(req.body.toString('utf8'));
      const ref = evt?.data?.reference;
      // Ignore Wi-Fi billing events that share the same Paystack account.
      if (typeof ref === 'string' && ref.startsWith('SB-') && String(evt.event).startsWith('charge.')) {
        // Payload is never trusted: the worker re-verifies with Paystack's API.
        await boss.send(Q.PAYMENT, { reference: ref, attempt: 1 });
      }
      return res.sendStatus(200);
    } catch (e) {
      console.error('[paystack webhook]', e.message);
      return res.sendStatus(500);
    }
  });

  const server = app.listen(cfg.port, () => console.log(`[web] listening on :${cfg.port}`));
  return server;
}
