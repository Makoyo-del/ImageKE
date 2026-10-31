import { test, describe, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import crypto from 'crypto';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WIFI_VENTURE_DIR = path.resolve(__dirname, '../../Y3/campus_wifi_venture');

import {
  PACKAGES,
  getPackageById,
  isWithinSaleWindow,
  resolvePackageFromPayment,
  resolvePackageFromVoucherCode,
  formatPhone,
  detectMobileMoneyProvider,
  isValidRouterIdentifier
} from './campusnet/catalog.js';

import campusNetRouter, {
  setCampusNetTestDeps,
  resetCampusNetInternalState,
  activateVoucherForTransaction,
  ensureVoucherPoolStock,
  pruneExpiredRecords
} from './campusnet.js';

import { CAMPUSNET_PACKAGES, LoyaltyService, PromoService } from './WifiPromosLoyalty.js';
import {
  runVoucherRestock,
  SEED_RSC_PATH
} from '../../Y3/campus_wifi_venture/scripts/restock_vouchers_v2.mjs';
import os from 'node:os';

// ─── In-Memory Supabase Emulator ──────────────────────────────────────────────
function createInMemorySupabase(initialData = {}) {
  const tables = {
    campusnet_vouchers: [...(initialData.campusnet_vouchers || [])],
    campusnet_transactions: [...(initialData.campusnet_transactions || [])],
    campusnet_sessions: [...(initialData.campusnet_sessions || [])]
  };

  let idCounter = 1000;

  class QueryBuilder {
    constructor(tableName) {
      this.tableName = tableName;
      this.filters = [];
      this.op = 'select';
      this.payload = null;
      this.upsertConflict = null;
      this.orderBy = null;
      this.limitCount = null;
      this.singleMode = false;
      this.headOnly = false;
      this.wantCount = false;
    }

    select(_cols = '*', opts = {}) {
      if (this.op === 'select') {
        this.headOnly = Boolean(opts.head);
        this.wantCount = Boolean(opts.count);
      }
      return this;
    }

    insert(rows) {
      this.op = 'insert';
      this.payload = Array.isArray(rows) ? rows : [rows];
      return this;
    }

    update(patch) {
      this.op = 'update';
      this.payload = patch;
      return this;
    }

    upsert(row, opts = {}) {
      this.op = 'upsert';
      this.payload = Array.isArray(row) ? row : [row];
      this.upsertConflict = opts.onConflict || 'id';
      return this;
    }

    delete(opts = {}) {
      this.op = 'delete';
      this.wantCount = Boolean(opts.count);
      return this;
    }

    eq(col, val) {
      this.filters.push((r) => r[col] === val);
      return this;
    }

    gt(col, val) {
      this.filters.push((r) => r[col] !== undefined && r[col] !== null && String(r[col]) > String(val));
      return this;
    }

    gte(col, val) {
      this.filters.push((r) => r[col] !== undefined && r[col] !== null && String(r[col]) >= String(val));
      return this;
    }

    lt(col, val) {
      this.filters.push((r) => r[col] !== undefined && r[col] !== null && String(r[col]) < String(val));
      return this;
    }

    lte(col, val) {
      this.filters.push((r) => r[col] !== undefined && r[col] !== null && String(r[col]) <= String(val));
      return this;
    }

    in(col, arr) {
      const set = new Set(arr);
      this.filters.push((r) => set.has(r[col]));
      return this;
    }

    or(expr) {
      const parts = expr.split(',').map((p) => p.trim());
      this.filters.push((r) =>
        parts.some((part) => {
          const [col, op, ...rest] = part.split('.');
          const val = rest.join('.');
          if (op === 'eq') return String(r[col] || '').toUpperCase() === String(val).toUpperCase();
          return false;
        })
      );
      return this;
    }

    order(col, { ascending = true } = {}) {
      this.orderBy = { col, ascending };
      return this;
    }

    limit(n) {
      this.limitCount = n;
      return this;
    }

    maybeSingle() {
      this.singleMode = true;
      return this;
    }

    _matchRows(list) {
      return list.filter((row) => this.filters.every((fn) => fn(row)));
    }

    async _exec() {
      const list = tables[this.tableName] || (tables[this.tableName] = []);

      if (this.op === 'insert') {
        const inserted = this.payload.map((item) => {
          const row = {
            id: item.id || `row_${++idCounter}`,
            created_at: item.created_at || new Date().toISOString(),
            ...item
          };
          list.push(row);
          return { ...row };
        });
        return { data: this.singleMode ? inserted[0] || null : inserted, error: null };
      }

      if (this.op === 'upsert') {
        const upserted = this.payload.map((item) => {
          const key = this.upsertConflict || 'id';
          const existingIdx = list.findIndex((r) => r[key] && r[key] === item[key]);
          if (existingIdx !== -1) {
            list[existingIdx] = { ...list[existingIdx], ...item };
            return { ...list[existingIdx] };
          }
          const row = {
            id: item.id || `row_${++idCounter}`,
            created_at: item.created_at || new Date().toISOString(),
            ...item
          };
          list.push(row);
          return { ...row };
        });
        return { data: this.singleMode ? upserted[0] || null : upserted, error: null };
      }

      if (this.op === 'update') {
        const matched = this._matchRows(list);
        const updated = matched.map((row) => {
          Object.assign(row, this.payload);
          return { ...row };
        });
        return { data: this.singleMode ? updated[0] || null : updated, error: null };
      }

      if (this.op === 'delete') {
        const matched = new Set(this._matchRows(list));
        const before = list.length;
        tables[this.tableName] = list.filter((r) => !matched.has(r));
        const deletedCount = before - tables[this.tableName].length;
        return { data: null, count: deletedCount, error: null };
      }

      // select
      let matched = this._matchRows(list).map((r) => ({ ...r }));
      if (this.orderBy) {
        const { col, ascending } = this.orderBy;
        matched.sort((a, b) => {
          if (a[col] < b[col]) return ascending ? -1 : 1;
          if (a[col] > b[col]) return ascending ? 1 : -1;
          return 0;
        });
      }
      const totalCount = matched.length;
      if (this.limitCount !== null) {
        matched = matched.slice(0, this.limitCount);
      }
      if (this.headOnly) {
        return { data: null, count: totalCount, error: null };
      }
      if (this.singleMode) {
        return { data: matched[0] || null, count: totalCount, error: null };
      }
      return { data: matched, count: totalCount, error: null };
    }

    then(resolve, reject) {
      return this._exec().then(resolve, reject);
    }
  }

  return {
    tables,
    from: (tableName) => new QueryBuilder(tableName),
    auth: {
      getUser: async () => ({ data: { user: null }, error: new Error('Invalid JWT') })
    }
  };
}

// ─── Test HTTP Server Setup ───────────────────────────────────────────────────
const app = express();
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    }
  })
);
app.use('/api/campusnet', campusNetRouter);

const server = http.createServer(app);
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();
const BASE_URL = `http://127.0.0.1:${port}/api/campusnet`;

after(() => {
  server.close();
});

const TEST_PAYSTACK_SECRET = 'sk_test_secure_paystack_secret_key_2026';
const TEST_SYNC_SECRET = 'sync_live_random_secret_token_99887766';
const TEST_ADMIN_SECRET = 'admin_live_random_secret_token_11223344';
const TEST_WEBHOOK_SECRET = 'hookbunker_live_secret_token_55667788';

// 21:00 EAT (18:00 UTC) -> Inside Night Owl window (6PM - 6AM EAT)
const NIGHT_OPEN_DATE = new Date('2026-10-31T18:00:00.000Z');
// 14:00 EAT (11:00 UTC) -> Outside Night Owl window (2PM EAT)
const DAY_CLOSED_DATE = new Date('2026-10-31T11:00:00.000Z');

// ─── 2.1 Catalog / Price / Phone / Network Unit Tests ─────────────────────────
describe('Phase 2.1: Catalog, Pricing, Phone Normalization & Dual Network Detection', () => {
  test('Single-source catalog matches locked Option A pricing and has zero pause claims', () => {
    assert.equal(PACKAGES.length, 7);
    assert.deepEqual(
      PACKAGES.map((p) => [p.id, p.amount, p.duration_hours]),
      [
        ['pkg_1h', 10, 1],
        ['pkg_3h', 20, 3],
        ['pkg_12h', 30, 12],
        ['pkg_24h', 50, 24],
        ['pkg_3d', 100, 72],
        ['pkg_7d', 180, 168],
        ['pkg_30d', 500, 720]
      ]
    );

    // Ensure WifiPromosLoyalty re-uses the exact same catalog array reference
    assert.equal(CAMPUSNET_PACKAGES, PACKAGES);

    for (const pkg of PACKAGES) {
      assert.ok(!/pause/i.test(pkg.description), `Package ${pkg.id} must not claim pausing`);
      assert.ok(!/pause/i.test(pkg.name), `Package ${pkg.id} name must not claim pausing`);
    }

    // Night Owl has saleWindow 18 -> 6 EAT
    const nightOwl = getPackageById('pkg_12h');
    assert.deepEqual(nightOwl.saleWindow, { startHourEat: 18, endHourEat: 6 });
  });

  test('resolvePackageFromPayment requires explicit packageId and rejects underpayment or bare amount guessing', () => {
    assert.equal(resolvePackageFromPayment({ packageId: null, paidAmountKes: 500 }), null);
    assert.equal(resolvePackageFromPayment({ packageId: 'pkg_30d', paidAmountKes: 10 }), null);
    assert.equal(resolvePackageFromPayment({ packageId: 'pkg_24h', paidAmountKes: 40 }), null);
    assert.equal(resolvePackageFromPayment({ packageId: 'pkg_24h', paidAmountKes: 50 })?.id, 'pkg_24h');
    assert.equal(resolvePackageFromPayment({ packageId: 'pkg_12h', paidAmountKes: 30 })?.id, 'pkg_12h');
  });

  test('formatPhone normalizes all Kenyan mobile formats and rejects invalid numbers', () => {
    assert.deepEqual(formatPhone('0712345678'), {
      clean: '254712345678',
      formatted: '+254712345678',
      local: '0712345678',
      valid: true
    });
    assert.deepEqual(formatPhone('+254 733 987 654'), {
      clean: '254733987654',
      formatted: '+254733987654',
      local: '0733987654',
      valid: true
    });
    assert.deepEqual(formatPhone('0101234567'), {
      clean: '254101234567',
      formatted: '+254101234567',
      local: '0101234567',
      valid: true
    });
    assert.equal(formatPhone('12345').valid, false);
    assert.equal(formatPhone('').valid, false);
  });

  test('detectMobileMoneyProvider routes Safaricom -> mpesa and Airtel -> atl, with user override', () => {
    assert.equal(detectMobileMoneyProvider('0712345678').provider, 'mpesa');
    assert.equal(detectMobileMoneyProvider('0794877125').provider, 'mpesa');
    assert.equal(detectMobileMoneyProvider('0110123456').provider, 'mpesa');

    assert.equal(detectMobileMoneyProvider('0733123456').provider, 'atl');
    assert.equal(detectMobileMoneyProvider('0752123456').provider, 'atl');
    assert.equal(detectMobileMoneyProvider('0780123456').provider, 'atl');
    assert.equal(detectMobileMoneyProvider('0100123456').provider, 'atl');

    // Manual override for ported numbers
    assert.equal(detectMobileMoneyProvider('0712345678', 'atl').provider, 'atl');
    assert.equal(detectMobileMoneyProvider('0733123456', 'mpesa').provider, 'mpesa');
  });
});

// ─── 2.2 Payment Happy Path, Idempotency & 10-Payer Concurrency ───────────────
describe('Phase 2.2: Payment Happy Path (M-Pesa + Airtel), Idempotency & Concurrency', () => {
  let mockDb;
  let paystackCalls;

  beforeEach(() => {
    resetCampusNetInternalState();
    paystackCalls = [];

    const initialVouchers = [];
    for (let i = 1; i <= 15; i++) {
      initialVouchers.push({
        id: `v_1h_${i}`,
        code: `M1H_TEST${String(i).padStart(2, '0')}`,
        password: String(100000 + i),
        package_id: 'pkg_1h',
        duration_hours: 1,
        amount: 10,
        status: 'available'
      });
    }
    initialVouchers.push({
      id: 'v_12h_1',
      code: 'M12H_NIGHT1',
      password: '654321',
      package_id: 'pkg_12h',
      duration_hours: 12,
      amount: 30,
      status: 'available'
    });

    mockDb = createInMemorySupabase({ campusnet_vouchers: initialVouchers });

    setCampusNetTestDeps({
      supabase: mockDb,
      now: () => NIGHT_OPEN_DATE,
      getPaystackSecretKey: () => TEST_PAYSTACK_SECRET,
      getRouterSyncKey: () => TEST_SYNC_SECRET,
      getAdminApiKey: () => TEST_ADMIN_SECRET,
      getWebhookSecrets: () => [TEST_WEBHOOK_SECRET],
      axios: {
        post: async (url, body) => {
          paystackCalls.push({ method: 'POST', url, body });
          if (body.mobile_money?.phone === '+254700999999') {
            const err = new Error('Request failed with status code 400');
            err.response = {
              status: 400,
              data: { status: false, message: 'Unable to process mobile money charge' }
            };
            throw err;
          }
          return {
            data: {
              status: true,
              data: {
                status: 'pay_offline',
                reference: body.reference,
                display_text: `Prompt sent via ${body.mobile_money.provider}`
              }
            }
          };
        },
        get: async (url) => {
          paystackCalls.push({ method: 'GET', url });
          return { data: { status: true, data: { status: 'ongoing' } } };
        }
      }
    });
  });

  test('M-Pesa and Airtel STK push happy path, duplicate guard, and instant Paystack failure surfacing', async () => {
    // 1. M-Pesa STK Push
    const mpesaRes = await fetch(`${BASE_URL}/pay/stk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '0712345678', package_id: 'pkg_1h' })
    });
    const mpesaJson = await mpesaRes.json();
    assert.equal(mpesaRes.status, 200);
    assert.equal(mpesaJson.provider, 'mpesa');
    assert.equal(mpesaJson.amount, 10);
    assert.equal(paystackCalls[0].body.mobile_money.provider, 'mpesa');

    // 2. Duplicate click within 10s is deduplicated without calling Paystack again
    const dupRes = await fetch(`${BASE_URL}/pay/stk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '0712345678', package_id: 'pkg_1h' })
    });
    const dupJson = await dupRes.json();
    assert.equal(dupJson.deduplicated, true);
    assert.equal(dupJson.reference, mpesaJson.reference);
    assert.equal(paystackCalls.length, 1);

    // 3. Airtel Money STK Push
    const airtelRes = await fetch(`${BASE_URL}/pay/stk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '0733123456', package_id: 'pkg_12h' })
    });
    const airtelJson = await airtelRes.json();
    assert.equal(airtelRes.status, 200);
    assert.equal(airtelJson.provider, 'atl');
    assert.equal(airtelJson.amount, 30);
    assert.equal(paystackCalls[1].body.mobile_money.provider, 'atl');

    // 4. Instant failure message when Paystack rejects charge
    const failRes = await fetch(`${BASE_URL}/pay/stk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '0700999999', package_id: 'pkg_1h' })
    });
    const failJson = await failRes.json();
    assert.equal(failRes.status, 400);
    assert.equal(failJson.success, false);
    assert.match(failJson.error, /Could not trigger/i);
  });

  test('Webhook HMAC activation + idempotency + status polling throttle', async () => {
    const stkRes = await fetch(`${BASE_URL}/pay/stk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '0712345678', package_id: 'pkg_1h' })
    });
    const { reference } = await stkRes.json();

    // Poll status twice rapidly while pending -> Paystack verify called only ONCE (throttled)
    const p1 = await fetch(`${BASE_URL}/pay/status/${reference}`);
    const p2 = await fetch(`${BASE_URL}/pay/status/${reference}`);
    assert.equal((await p1.json()).status, 'pending');
    assert.equal((await p2.json()).status, 'pending');
    const verifyCalls = paystackCalls.filter((c) => c.method === 'GET' && c.url.includes('/transaction/verify/'));
    assert.equal(verifyCalls.length, 1, 'Status polling must be throttled to prevent Paystack rate-limiting');

    // Deliver signed Paystack webhook
    const webhookBody = JSON.stringify({
      event: 'charge.success',
      data: {
        id: 987654,
        reference,
        amount: 1000, // KSh 10.00
        status: 'success',
        gateway_response: 'RKT998877M'
      }
    });
    const hmac = crypto.createHmac('sha512', TEST_PAYSTACK_SECRET).update(webhookBody).digest('hex');

    const whRes1 = await fetch(`${BASE_URL}/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-paystack-signature': hmac
      },
      body: webhookBody
    });
    assert.equal(whRes1.status, 200);

    // Repeat identical webhook -> idempotent, must NOT claim a second voucher
    const whRes2 = await fetch(`${BASE_URL}/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-paystack-signature': hmac
      },
      body: webhookBody
    });
    assert.equal(whRes2.status, 200);

    const statusRes = await fetch(`${BASE_URL}/pay/status/${reference}`);
    const statusJson = await statusRes.json();
    assert.equal(statusJson.status, 'completed');
    assert.ok(statusJson.voucher_code.startsWith('M1H_TEST'));

    const assignedVouchers = mockDb.tables.campusnet_vouchers.filter((v) => v.status === 'assigned');
    assert.equal(assignedVouchers.length, 1, 'Idempotency must guarantee only 1 voucher is assigned');
  });

  test('10 parallel payers simultaneously claim 10 distinct vouchers with truthful paid amounts', async () => {
    const payers = Array.from({ length: 10 }, (_, idx) => {
      const ref = `CN_PARALLEL_${idx + 1}`;
      const phone = `2547110000${String(idx + 10).padStart(2, '0')}`;
      mockDb.tables.campusnet_transactions.push({
        id: `tx_par_${idx + 1}`,
        reference: ref,
        phone,
        mac_address: `AA:BB:CC:DD:EE:${String(idx + 10).padStart(2, '0')}`,
        package_id: 'pkg_1h',
        amount: 10,
        status: 'pending'
      });
      return { ref, phone };
    });

    const results = await Promise.all(
      payers.map((p) =>
        activateVoucherForTransaction({
          reference: p.ref,
          phone: p.phone,
          macAddress: 'AA:BB:CC:DD:EE:FF',
          packageId: 'pkg_1h',
          paidAmountKes: 10,
          mpesaReceipt: `RCP_${p.ref}`,
          paystackId: `PS_${p.ref}`
        })
      )
    );

    const claimedCodes = results.map((r) => r.voucherCode);
    const uniqueCodes = new Set(claimedCodes);
    assert.equal(uniqueCodes.size, 10, 'All 10 parallel payers must receive 10 distinct vouchers');
    for (const code of claimedCodes) {
      assert.match(code, /^M1H_TEST\d{2}$/, 'All 10 parallel payers should claim from the pre-seeded pool');
    }
  });

  test('Auto-top-up replenishes low stock and 72h pruner preserves recent expired rows', async () => {
    const topUpRes = await ensureVoucherPoolStock('pkg_12h', 5, 10);
    assert.equal(topUpRes.toppedUp, 10);

    // Insert an expired voucher from 24h ago (should be kept) and 80h ago (should be pruned)
    const exp24hAgo = new Date(NIGHT_OPEN_DATE.getTime() - 24 * 3600 * 1000).toISOString();
    const exp80hAgo = new Date(NIGHT_OPEN_DATE.getTime() - 80 * 3600 * 1000).toISOString();

    mockDb.tables.campusnet_vouchers.push(
      { id: 'v_exp_24h', code: 'M1H_EXP24', password: '111111', package_id: 'pkg_1h', status: 'expired', expires_at: exp24hAgo },
      { id: 'v_exp_80h', code: 'M1H_EXP80', password: '222222', package_id: 'pkg_1h', status: 'expired', expires_at: exp80hAgo }
    );

    const pruneRes = await pruneExpiredRecords();
    assert.equal(pruneRes.success, true);
    assert.equal(pruneRes.pruned_vouchers, 1);
    assert.ok(mockDb.tables.campusnet_vouchers.some((v) => v.id === 'v_exp_24h'), '24h old expired row must be kept');
    assert.ok(!mockDb.tables.campusnet_vouchers.some((v) => v.id === 'v_exp_80h'), '80h old expired row must be pruned');
  });
});

// ─── 2.3 Security Tests ───────────────────────────────────────────────────────
describe('Phase 2.3: Security (Forged Webhook, Default Keys, Unauth Admin/Sync, Anti-Replay, 410 Free Endpoints)', () => {
  let mockDb;

  beforeEach(() => {
    resetCampusNetInternalState();
    mockDb = createInMemorySupabase({
      campusnet_vouchers: [
        {
          id: 'v_sec_1',
          code: 'M30D_VIP01',
          password: '999888',
          package_id: 'pkg_30d',
          duration_hours: 720,
          amount: 500,
          status: 'available'
        },
        {
          id: 'v_sec_2',
          code: 'M1H_ASSIGNED1',
          password: '777666',
          package_id: 'pkg_1h',
          duration_hours: 1,
          amount: 10,
          status: 'assigned',
          assigned_phone: '254712345678',
          expires_at: new Date(NIGHT_OPEN_DATE.getTime() + 3600 * 1000).toISOString()
        }
      ],
      campusnet_transactions: [
        {
          id: 'tx_vip',
          reference: 'CN_VIP_500',
          phone: '254712345678',
          package_id: 'pkg_30d',
          amount: 500,
          status: 'pending'
        },
        {
          id: 'tx_done',
          reference: 'CN_DONE_1',
          phone: '254712345678',
          package_id: 'pkg_1h',
          amount: 10,
          status: 'completed',
          mpesa_receipt: 'QWE1234567',
          voucher_code: 'M1H_ASSIGNED1'
        }
      ]
    });

    setCampusNetTestDeps({
      supabase: mockDb,
      now: () => NIGHT_OPEN_DATE,
      getPaystackSecretKey: () => TEST_PAYSTACK_SECRET,
      getRouterSyncKey: () => TEST_SYNC_SECRET,
      getAdminApiKey: () => TEST_ADMIN_SECRET,
      getWebhookSecrets: () => [TEST_WEBHOOK_SECRET]
    });
  });

  test('Forged webhook signature and underpaid webhook are rejected (400)', async () => {
    // 1. Forged signature
    const forgedRes = await fetch(`${BASE_URL}/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-paystack-signature': 'deadbeef_forged_signature'
      },
      body: JSON.stringify({
        event: 'charge.success',
        data: { reference: 'CN_VIP_500', amount: 50000, status: 'success' }
      })
    });
    assert.equal(forgedRes.status, 400);

    // 2. Valid signature, but paid KSh 10 for a KSh 500 transaction -> rejected, never guesses pkg_1h
    const underpaidBody = JSON.stringify({
      event: 'charge.success',
      data: { reference: 'CN_VIP_500', amount: 1000, status: 'success' }
    });
    const validHmac = crypto.createHmac('sha512', TEST_PAYSTACK_SECRET).update(underpaidBody).digest('hex');
    const underpaidRes = await fetch(`${BASE_URL}/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-paystack-signature': validHmac
      },
      body: underpaidBody
    });
    assert.equal(underpaidRes.status, 400);

    // 3. Valid signature, but unknown reference not in DB -> rejected (package must come from DB tx)
    const unknownTxBody = JSON.stringify({
      event: 'charge.success',
      data: { reference: 'CN_NOT_IN_DB', amount: 5000, status: 'success' }
    });
    const unknownHmac = crypto.createHmac('sha512', TEST_PAYSTACK_SECRET).update(unknownTxBody).digest('hex');
    const unknownRes = await fetch(`${BASE_URL}/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-paystack-signature': unknownHmac
      },
      body: unknownTxBody
    });
    assert.equal(unknownRes.status, 400);
  });

  test('Default hardcoded keys and unauthenticated requests are rejected (401)', async () => {
    // Unauthenticated sync & admin
    assert.equal((await fetch(`${BASE_URL}/sync/live`)).status, 401);
    assert.equal((await fetch(`${BASE_URL}/stats`)).status, 401);
    assert.equal((await fetch(`${BASE_URL}/admin/overview`)).status, 401);

    // Legacy hardcoded keys rejected even if caller passes them
    assert.equal((await fetch(`${BASE_URL}/sync/live?token=makoyocart_sync_secret_2026`)).status, 401);
    assert.equal(
      (
        await fetch(`${BASE_URL}/admin/overview`, {
          headers: { Authorization: 'Bearer campusnet_secret_admin_2026' }
        })
      ).status,
      401
    );

    //Even if env is misconfigured with legacy default keys, server fails closed
    setCampusNetTestDeps({
      getRouterSyncKey: () => 'makoyocart_sync_secret_2026',
      getAdminApiKey: () => 'campusnet_secret_admin_2026'
    });
    assert.equal((await fetch(`${BASE_URL}/sync/live?token=makoyocart_sync_secret_2026`)).status, 401);
    assert.equal(
      (
        await fetch(`${BASE_URL}/admin/overview`, {
          headers: { Authorization: 'Bearer campusnet_secret_admin_2026' }
        })
      ).status,
      401
    );
  });

  test('verify-code blocks cross-user receipt/voucher replay (403)', async () => {
    // Different user (0799888777) attempts to use 0712345678's receipt QWE1234567
    const replayRes = await fetch(`${BASE_URL}/pay/verify-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'QWE1234567', phone: '0799888777' })
    });
    assert.equal(replayRes.status, 403);

    // Owner (0712345678) can restore their unexpired pass
    const ownerRes = await fetch(`${BASE_URL}/pay/verify-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'QWE1234567', phone: '0712345678' })
    });
    assert.equal(ownerRes.status, 200);
  });

  test('All free-internet endpoints return 410 Gone and services refuse free passes', async () => {
    for (const [method, path] of [
      ['POST', '/loyalty/redeem'],
      ['POST', '/admin/claim-reward'],
      ['POST', '/admin/setup-db'],
      ['POST', '/promo/verify'],
      ['POST', '/referrals/verify'],
      ['GET', '/loyalty/status/0712345678']
    ]) {
      const res = await fetch(`${BASE_URL}${path}`, { method });
      assert.equal(res.status, 410, `${method} ${path} must return 410 Gone`);
    }

    const loyaltySvc = new LoyaltyService(mockDb);
    const claimRes = await loyaltySvc.claimFreePass('0712345678');
    assert.equal(claimRes.success, false);

    const promoSvc = new PromoService(mockDb);
    assert.equal(await promoSvc.getPromoByCode('FRESHER2026'), null);
  });
});

// ─── 2.4 Night Owl Sale Window Tests ──────────────────────────────────────────
describe('Phase 2.4: Night Owl (6 PM -> 6 AM EAT) Sale Window Enforcement', () => {
  test('Night Owl STK push is refused during daytime (14:00 EAT) and accepted at night (21:00 EAT)', async () => {
    resetCampusNetInternalState();
    const mockDb = createInMemorySupabase();

    // 1. Daytime (14:00 EAT) -> Refused
    setCampusNetTestDeps({
      supabase: mockDb,
      now: () => DAY_CLOSED_DATE,
      getPaystackSecretKey: () => TEST_PAYSTACK_SECRET,
      axios: {
        post: async () => ({ data: { status: true, data: { status: 'pay_offline' } } })
      }
    });

    const closedRes = await fetch(`${BASE_URL}/pay/stk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '0712345678', package_id: 'pkg_12h' })
    });
    const closedJson = await closedRes.json();
    assert.equal(closedRes.status, 400);
    assert.equal(closedJson.code, 'SALE_WINDOW_CLOSED');

    // Standard daytime packages still work at 14:00 EAT
    const studyRes = await fetch(`${BASE_URL}/pay/stk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '0712345678', package_id: 'pkg_3h' })
    });
    assert.equal(studyRes.status, 200);

    // 2. Nighttime (21:00 EAT) -> Accepted
    setCampusNetTestDeps({
      now: () => NIGHT_OPEN_DATE
    });

    const openRes = await fetch(`${BASE_URL}/pay/stk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '0712345678', package_id: 'pkg_12h' })
    });
    const openJson = await openRes.json();
    assert.equal(openRes.status, 200);
    assert.equal(openJson.package_id, 'pkg_12h');
    assert.equal(openJson.amount, 30);
  });
});

// ─── 2.5 Router Sync Validation & Expired Cleanup Tests ───────────────────────
describe('Phase 2.5: Router Sync Script Validation & Expired Session Removal', () => {
  test('/sync/live and /sync/pool emit only validated RouterOS lines and remove expired vouchers', async () => {
    resetCampusNetInternalState();
    const futureIso = new Date(NIGHT_OPEN_DATE.getTime() + 2 * 3600 * 1000).toISOString();
    const pastIso = new Date(NIGHT_OPEN_DATE.getTime() - 600 * 1000).toISOString();

    const mockDb = createInMemorySupabase({
      campusnet_vouchers: [
        {
          id: 'v_valid_active',
          code: 'M3H_VALID1',
          password: '123456',
          package_id: 'pkg_3h',
          status: 'assigned',
          expires_at: futureIso
        },
        {
          id: 'v_malicious',
          code: 'BAD"; /system reboot; #',
          password: '123456',
          package_id: 'pkg_3h',
          status: 'assigned',
          expires_at: futureIso
        },
        {
          id: 'v_expired_1',
          code: 'M1H_EXPIRED9',
          password: '654321',
          package_id: 'pkg_1h',
          status: 'assigned',
          expires_at: pastIso
        },
        {
          id: 'v_pool_1',
          code: 'M24H_POOL01',
          password: '888999',
          package_id: 'pkg_24h',
          status: 'available'
        }
      ]
    });

    setCampusNetTestDeps({
      supabase: mockDb,
      now: () => NIGHT_OPEN_DATE,
      getRouterSyncKey: () => TEST_SYNC_SECRET,
      getAdminApiKey: () => TEST_ADMIN_SECRET
    });

    const liveRes = await fetch(`${BASE_URL}/sync/live?token=${TEST_SYNC_SECRET}`);
    assert.equal(liveRes.status, 200);
    const liveScript = await liveRes.text();

    // Valid active session is present
    assert.match(liveScript, /name="M3H_VALID1" password="123456" profile="pkg_3h"/);
    // Malicious injection string is stripped out completely
    assert.ok(!liveScript.includes('/system reboot'), 'Injection attempt must be blocked');
    // Expired voucher is listed for removal across active, cookie, mac-cookie, and user
    assert.match(liveScript, /\/ip hotspot active remove \[find user="M1H_EXPIRED9"\]/);
    assert.match(liveScript, /\/ip hotspot cookie remove \[find user="M1H_EXPIRED9"\]/);
    assert.match(liveScript, /\/ip hotspot mac-cookie remove \[find user="M1H_EXPIRED9"\]/);
    assert.match(liveScript, /\/ip hotspot user remove \[find name="M1H_EXPIRED9"\]/);

    // Expired voucher status in DB was updated to 'expired'
    const expRow = mockDb.tables.campusnet_vouchers.find((v) => v.id === 'v_expired_1');
    assert.equal(expRow.status, 'expired');

    // Pool sync emits available pool vouchers
    const poolRes = await fetch(`${BASE_URL}/sync/pool?token=${TEST_SYNC_SECRET}`);
    assert.equal(poolRes.status, 200);
    const poolScript = await poolRes.text();
    assert.match(poolScript, /name="M24H_POOL01" password="888999" profile="pkg_24h"/);
  });
});

// ─── Phase 3: Captive Portal Static Verification ──────────────────────────────
describe('Phase 3: Captive Portal Static Verification (3.1 - 3.5)', () => {
  const loginPath = path.join(WIFI_VENTURE_DIR, 'hotspot', 'login.html');
  const statusPath = path.join(WIFI_VENTURE_DIR, 'hotspot', 'status.html');
  const portalLoginPath = path.join(WIFI_VENTURE_DIR, 'portal', 'login.html');
  const portalStatusPath = path.join(WIFI_VENTURE_DIR, 'portal', 'status.html');

  const loginHtml = fs.readFileSync(loginPath, 'utf8');
  const statusHtml = fs.readFileSync(statusPath, 'utf8');

  test('3.1 Single self-contained files < 40 KB with zero external fonts/scripts', () => {
    const loginSize = Buffer.byteLength(loginHtml, 'utf8');
    const statusSize = Buffer.byteLength(statusHtml, 'utf8');

    assert.ok(loginSize < 40000, `login.html must be < 40 KB (got ${loginSize} bytes)`);
    assert.ok(statusSize < 40000, `status.html must be < 40 KB (got ${statusSize} bytes)`);

    // Must match portal mirror
    assert.equal(loginHtml, fs.readFileSync(portalLoginPath, 'utf8'));
    assert.equal(statusHtml, fs.readFileSync(portalStatusPath, 'utf8'));

    // No external font or CDN script links that hang before authentication
    assert.ok(!/fonts\.googleapis\.com/i.test(loginHtml), 'No Google Fonts allowed in login.html');
    assert.ok(!/fonts\.gstatic\.com/i.test(loginHtml), 'No gstatic fonts allowed in login.html');
    assert.ok(!/fonts\.googleapis\.com/i.test(statusHtml), 'No Google Fonts allowed in status.html');
    assert.ok(!/<script[^>]+src=/i.test(loginHtml), 'No external script tags allowed in login.html');
    assert.ok(!/<link[^>]+rel=["']stylesheet["']/i.test(loginHtml), 'No external stylesheet links allowed in login.html');
  });

  test('3.2 Welcome-back one-tap reconnect remembers phone number', () => {
    assert.match(loginHtml, /id="welcome-banner"/);
    assert.match(loginHtml, /cn_saved_phone/);
    assert.match(loginHtml, /function handleOneTapReconnect\(/);
    assert.match(loginHtml, /Tap to Reconnect Now/i);
  });

  test('3.3 3-step flow, M-Pesa + Airtel network pills, resend prompt, and receipt-code fallback', () => {
    assert.match(loginHtml, /3 simple taps/i);
    assert.match(loginHtml, /Tap a Wi-Fi Pass/i);
    assert.match(loginHtml, /Select Network & Phone Number/i);

    // Network pills for M-Pesa & Airtel Money
    assert.match(loginHtml, /id="pill-mpesa"/);
    assert.match(loginHtml, /id="pill-airtel"/);
    assert.match(loginHtml, /setProviderManual\('mpesa'\)/);
    assert.match(loginHtml, /setProviderManual\('atl'\)/);

    // Resend prompt button + receipt fallback
    assert.match(loginHtml, /id="btn-resend-stk"/);
    assert.match(loginHtml, /function resendStkPrompt\(/);
    assert.match(loginHtml, /function verifyManualCode\(/);
  });

  test('3.4 & 3.5 Zero loyalty/referral/free UI, honest 50 Mbps copy, and all MikroTik $(...) variables intact', () => {
    // No free/loyalty/promo/pause elements
    assert.ok(!/loyalty-modal/i.test(loginHtml));
    assert.ok(!/claimRewardFromModal/i.test(loginHtml));
    assert.ok(!/FRESHER2026/i.test(loginHtml));
    assert.ok(!/pausable/i.test(loginHtml));

    // Honest 50 Mbps copy & all 7 Option A packages
    assert.match(loginHtml, /50\s*Mbps/i);
    for (const pkgId of ['pkg_1h', 'pkg_3h', 'pkg_12h', 'pkg_24h', 'pkg_3d', 'pkg_7d', 'pkg_30d']) {
      assert.ok(loginHtml.includes(`'${pkgId}'`), `Portal must include ${pkgId}`);
    }

    // Required MikroTik variables in login.html
    for (const v of ['$(mac)', '$(ip)', '$(username)', '$(link-login-only)', '$(link-orig)', '$(error)']) {
      assert.ok(loginHtml.includes(v), `login.html missing MikroTik variable ${v}`);
    }

    // Required MikroTik variables in status.html
    for (const v of ['$(username)', '$(ip)', '$(mac)', '$(uptime)', '$(session-time-left)', '$(bytes-out-nice)', '$(link-logout)']) {
      assert.ok(statusHtml.includes(v), `status.html missing MikroTik variable ${v}`);
    }
  });
});

// ─── Phase 4: RouterOS Scripts Static Verification (4.1 - 4.6) ────────────────
describe('Phase 4: RouterOS L009 & hAP lite Scripts Verification (4.1 - 4.6)', () => {
  const diagPath = path.join(WIFI_VENTURE_DIR, 'mikrotik', '00_DIAGNOSTICS_READONLY.rsc');
  const upgradePath = path.join(WIFI_VENTURE_DIR, 'mikrotik', '16_L009_UPGRADE_50MBPS_NO_SIGNOUT_AND_REMOTE.rsc');
  const hapPath = path.join(WIFI_VENTURE_DIR, 'mikrotik', '17_HAP_LITE_OPTIMIZED_AP.rsc');

  const diagRsc = fs.readFileSync(diagPath, 'utf8');
  const upgradeRsc = fs.readFileSync(upgradePath, 'utf8');
  const hapRsc = fs.readFileSync(hapPath, 'utf8');

  test('4.1 Upgrade script is idempotent and never wipes active users or seeded vouchers', () => {
    assert.ok(!/\/ip hotspot active remove/i.test(upgradeRsc), 'Must not remove active hotspot sessions');
    assert.ok(!/\/ip hotspot user remove/i.test(upgradeRsc), 'Must not remove hotspot users');
    assert.ok(!/\/ip hotspot cookie remove/i.test(upgradeRsc), 'Must not remove hotspot cookies');
    assert.ok(!/\/ip hotspot mac-cookie remove/i.test(upgradeRsc), 'Must not remove hotspot mac-cookies');
  });

  test('4.2 Sign-out fixes: mac-cookie on (30d), idle-timeout=none, keepalive-timeout=10m, 12h lease, parent-queue set, cleared limit-uptime/session-timeout', () => {
    assert.match(upgradeRsc, /login-by=mac-cookie,http-chap,http-pap,cookie/);
    assert.match(upgradeRsc, /add-mac-cookie=yes/);
    assert.match(upgradeRsc, /mac-cookie-timeout=30d/);
    assert.match(upgradeRsc, /http-cookie-lifetime=30d/);
    assert.match(upgradeRsc, /parent-queue=WAN-Bandwidth-Manager/);
    assert.match(upgradeRsc, /keepalive-timeout=10m/);
    assert.match(upgradeRsc, /idle-timeout=none/);
    assert.match(upgradeRsc, /lease-time=12h/);
    assert.match(upgradeRsc, /\/ip hotspot user unset \[find\] limit-uptime/);
    assert.match(upgradeRsc, /unset \[find[^\]]*\] session-timeout/);

    // Ensures all 7 Option A profiles are configured
    for (const prof of ['pkg_1h', 'pkg_3h', 'pkg_12h', 'pkg_24h', 'pkg_3d', 'pkg_7d', 'pkg_30d']) {
      assert.ok(upgradeRsc.includes(`"${prof}"`), `Upgrade script must configure profile ${prof}`);
    }
  });

  test('4.3 Real 50 Mbps shaping (PCQ) with tunable variables at the top', () => {
    assert.match(upgradeRsc, /:local wanDown "48M"/);
    assert.match(upgradeRsc, /:local wanUp "20M"/);
    assert.match(upgradeRsc, /:local userDown "8M"/);
    assert.match(upgradeRsc, /:local userUp "3M"/);
    assert.match(upgradeRsc, /name="campusnet-pcq-down" kind=pcq pcq-rate=\$userDown/);
    assert.match(upgradeRsc, /name="campusnet-pcq-up" kind=pcq pcq-rate=\$userUp/);
    assert.match(upgradeRsc, /name="WAN-Bandwidth-Manager" target=10\.10\.0\.0\/22 max-limit=\$wanMaxLimit/);
  });

  test('4.4 Firewall blocks students on bridge-hotspot from WinBox/SSH/API/REST and restricts admin to ether8 + VPN', () => {
    assert.match(upgradeRsc, /in-interface=bridge-hotspot protocol=tcp dst-port=21,22,23,8291,8443,8728,8729 action=drop/);
    assert.match(upgradeRsc, /address=192\.168\.88\.0\/24/);
    assert.match(upgradeRsc, /address=192\.168\.216\.0\/24/);
    assert.match(upgradeRsc, /\/ip service set winbox port=8291 address=192\.168\.88\.0\/24,192\.168\.216\.0\/24 disabled=no/);
  });

  test('4.5 Remote access: Back-To-Home VPN + HTTPS REST API + 2m/30m sync schedulers + Airtel Walled Garden', () => {
    assert.match(upgradeRsc, /ddns-enabled=yes/);
    assert.match(upgradeRsc, /back-to-home-vpn=enabled/);
    assert.match(upgradeRsc, /\/ip service set www-ssl certificate="campusnet-rest-ssl" port=8443/);
    assert.match(upgradeRsc, /name="campusnet-sync-live" interval=2m/);
    assert.match(upgradeRsc, /name="campusnet-sync-pool" interval=30m/);
    assert.match(upgradeRsc, /\*\.airtel\.com/);
    assert.match(hapRsc, /channel-width=20mhz/);
  });

  test('4.6 Diagnostics script is strictly read-only (no set/add/remove/unset commands)', () => {
    const codeLines = diagRsc
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#') && !l.startsWith(':put'));

    for (const line of codeLines) {
      assert.ok(
        !/\b(set|add|remove|unset|reset-configuration)\b/i.test(line),
        `Diagnostics script must be strictly read-only, found mutating line: ${line}`
      );
    }
  });
});

// ─── Phase 5: Voucher Restock Generator & Seed Script Verification (5.1) ──────
describe('Phase 5: Voucher Restock Generator & Two-Stage Commit Verification (5.1)', () => {
  test('5.1 Generator creates seed .rsc without touching DB on Stage 1, and inserts only on --commit (Stage 2)', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cn-restock-test-'));
    const tmpRsc = path.join(tmpDir, 'test_seed.rsc');
    const tmpBatch = path.join(tmpDir, 'test_batch.json');

    const mockDb = createInMemorySupabase({
      campusnet_vouchers: [
        {
          id: 'v_existing_24h',
          code: 'M24H_EXIST1',
          password: '112233',
          package_id: 'pkg_24h',
          duration_hours: 24,
          amount: 40, // Legacy price before Option A alignment
          status: 'available'
        }
      ]
    });

    const smallTargets = {
      pkg_1h: 2,
      pkg_3h: 2,
      pkg_12h: 2,
      pkg_24h: 2,
      pkg_3d: 2,
      pkg_7d: 2,
      pkg_30d: 2
    };

    // Stage 1: commit = false (generate .rsc + batch JSON only, zero DB writes)
    const stage1 = await runVoucherRestock({
      supabaseClient: mockDb,
      commit: false,
      targets: smallTargets,
      rscOutPath: tmpRsc,
      batchJsonPath: tmpBatch
    });

    assert.equal(stage1.committed, false);
    assert.equal(stage1.existingPoolCount, 1);
    assert.equal(stage1.generatedCount, 13); // 7 * 2 - 1 existing = 13
    assert.equal(stage1.insertedCount, 0);
    assert.equal(mockDb.tables.campusnet_vouchers.length, 1, 'Stage 1 must NOT insert into Supabase before router is seeded');

    // Stage 2: commit = true (commits the exact batch from Stage 1 into Supabase)
    const stage2 = await runVoucherRestock({
      supabaseClient: mockDb,
      commit: true,
      targets: smallTargets,
      rscOutPath: tmpRsc,
      batchJsonPath: tmpBatch
    });

    assert.equal(stage2.committed, true);
    assert.equal(stage2.insertedCount, 13);
    assert.equal(mockDb.tables.campusnet_vouchers.length, 14);

    // Verify legacy pkg_24h voucher amount was aligned to Option A KSh 50
    const alignedRow = mockDb.tables.campusnet_vouchers.find((v) => v.id === 'v_existing_24h');
    assert.equal(alignedRow.amount, 50);

    // Also verify the production 18_SEED_VOUCHERS_L009.rsc file generated for Monday
    const prodSeedRsc = fs.readFileSync(SEED_RSC_PATH, 'utf8');
    assert.ok(!/limit-uptime=/i.test(prodSeedRsc), 'Seed .rsc must never set limit-uptime');
    assert.ok(!/\/ip hotspot active remove/i.test(prodSeedRsc), 'Seed .rsc must never disconnect active sessions');
    for (const pkgId of ['pkg_1h', 'pkg_3h', 'pkg_12h', 'pkg_24h', 'pkg_3d', 'pkg_7d', 'pkg_30d']) {
      assert.ok(prodSeedRsc.includes(`profile="${pkgId}"`), `Seed .rsc must include vouchers for ${pkgId}`);
    }

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});



