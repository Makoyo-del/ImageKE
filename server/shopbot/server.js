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

export function shopBotRouter(boss) {
  const router = express.Router();
  const resolveBoss = () => (typeof boss === 'function' ? boss() : boss);

  router.get('/health', (_req, res) => {
    const b = resolveBoss();
    res.json({
      ok: true,
      service: 'shopbot',
      queue: b ? 'connected' : 'initializing',
      timestamp: new Date().toISOString(),
    });
  });

  // Owner dashboard API (workspace portal -> bot). Isolated, auth-gated router.
  router.use('/admin', adminRouter(resolveBoss));

  // ── Meta verification handshake ────────────────────────────────────────────
  router.get('/webhook', (req, res) => {
    if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === cfg.wa.verifyToken) {
      return res.status(200).send(req.query['hub.challenge']);
    }
    return res.sendStatus(403);
  });

  // ── Meta inbound messages ──────────────────────────────────────────────────
  router.post('/webhook', express.raw({ type: '*/*', limit: '1mb' }), async (req, res) => {
    try {
      if (cfg.wa.appSecret) {
        const raw = Buffer.isBuffer(req.body) ? req.body : req.rawBody || Buffer.from(JSON.stringify(req.body));
        const expected =
          'sha256=' + crypto.createHmac('sha256', cfg.wa.appSecret).update(raw).digest('hex');
        if (!safeEq(expected, req.get('x-hub-signature-256'))) return res.sendStatus(401);
      }

      const body = Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString('utf8')) : req.body;
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
        }
      }

      const b = resolveBoss();
      if (!b) {
        console.warn('[webhook] pg-boss queue not ready yet. Inbound message held/acknowledged.');
        return res.sendStatus(200);
      }

      await Promise.all(jobs.map((j) => b.send(Q.INBOUND, j)));
      return res.sendStatus(200);
    } catch (e) {
      console.error('[webhook] enqueue failed:', e.message);
      return res.sendStatus(500);
    }
  });

  // ── Paystack webhook (optional accelerator; polling is the safety net) ─────
  router.post('/paystack/webhook', express.raw({ type: '*/*', limit: '1mb' }), async (req, res) => {
    try {
      const raw = Buffer.isBuffer(req.body) ? req.body : req.rawBody || Buffer.from(JSON.stringify(req.body));
      const sig = crypto.createHmac('sha512', cfg.paystackSecret).update(raw).digest('hex');
      if (!safeEq(sig, req.get('x-paystack-signature'))) return res.sendStatus(401);

      const evt = Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString('utf8')) : req.body;
      const ref = evt?.data?.reference;
      if (typeof ref === 'string' && ref.startsWith('SB-') && String(evt.event).startsWith('charge.')) {
        const b = resolveBoss();
        if (b) {
          await b.send(Q.PAYMENT, { reference: ref, attempt: 1 });
        }
      }
      return res.sendStatus(200);
    } catch (e) {
      console.error('[paystack webhook]', e.message);
      return res.sendStatus(500);
    }
  });

  return router;
}

export function startServer(boss) {
  const app = express();
  app.disable('x-powered-by');
  app.use('/', shopBotRouter(boss));
  const server = app.listen(cfg.port, () => console.log(`[web] listening on :${cfg.port}`));
  return server;
}
