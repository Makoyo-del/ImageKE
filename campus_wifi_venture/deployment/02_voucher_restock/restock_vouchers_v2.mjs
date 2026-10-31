import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { PACKAGES, isValidRouterIdentifier } from '../../../DunMak/server/campusnet/catalog.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverPkgPath = path.resolve(__dirname, '../../../DunMak/server/package.json');
const serverRequire = createRequire(serverPkgPath);
const { createClient } = serverRequire('@supabase/supabase-js');

// Load .env from DunMak/server/.env without external dependency
const envPath = path.resolve(__dirname, '../../../DunMak/server/.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
}

// Target pool stock per package for Monday student return
export const STOCK_TARGETS = {
  pkg_1h: 200,
  pkg_3h: 150,
  pkg_12h: 200,
  pkg_24h: 200,
  pkg_3d: 100,
  pkg_7d: 80,
  pkg_30d: 40
};

const MIKROTIK_DIR = path.resolve(__dirname, '../mikrotik');
export const SEED_RSC_PATH = path.join(MIKROTIK_DIR, '18_SEED_VOUCHERS_L009.rsc');
export const PENDING_BATCH_PATH = path.join(MIKROTIK_DIR, 'pending_vouchers_batch.json');

const SAFE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateVoucherCode(prefix, existingCodes = new Set()) {
  for (let attempt = 0; attempt < 50; attempt++) {
    let suffix = '';
    for (let i = 0; i < 5; i++) {
      suffix += SAFE_CHARS[crypto.randomInt(0, SAFE_CHARS.length)];
    }
    const candidate = `${prefix}_${suffix}`;
    if (!existingCodes.has(candidate) && isValidRouterIdentifier(candidate)) {
      existingCodes.add(candidate);
      return candidate;
    }
  }
  throw new Error(`Failed to generate unique voucher code for prefix ${prefix}`);
}

export function generatePin() {
  return String(crypto.randomInt(100000, 999999));
}

/**
 * Builds the safe, idempotent RouterOS .rsc file that seeds vouchers WITHOUT:
 * - wiping active users or cookies
 * - setting limit-uptime or session-timeout
 * - downgrading profile speeds
 */
export function buildSeedRscContent(vouchers) {
  const validVouchers = vouchers.filter(
    (v) =>
      isValidRouterIdentifier(v.code) &&
      isValidRouterIdentifier(v.password) &&
      isValidRouterIdentifier(v.package_id)
  );

  const lines = [
    '# ==============================================================================',
    '# MAKOYOCART VENTURES (CAMPUSNET) - ZERO-DOWNTIME VOUCHER POOL SEED (5.1)',
    `# Generated: ${new Date().toISOString()}`,
    `# Total Validated Pool Vouchers: ${validVouchers.length}`,
    '#',
    '# GUARANTEES:',
    '# 1. NEVER removes active sessions (/ip hotspot active) or cookies.',
    '# 2. NEVER sets limit-uptime or session-timeout (wall-clock expiry is enforced by DB sync).',
    '# 3. Safe to import BEFORE committing new rows to Supabase so router always knows codes first.',
    '# ==============================================================================',
    '',
    ':log info ">>> [CampusNet Seed] Loading voucher pool onto L009 (Zero Downtime)... <<<"',
    '/ip hotspot user'
  ];

  for (const v of validVouchers) {
    lines.push(
      `:do { add name="${v.code}" password="${v.password}" profile="${v.package_id}" comment="CN-Pool-2026" } on-error={ :do { set [find name="${v.code}"] password="${v.password}" profile="${v.package_id}" } on-error={} }`
    );
  }

  lines.push(':do { /ip hotspot user unset [find] limit-uptime } on-error={}');
  lines.push(`:log info ">>> [CampusNet Seed] Successfully loaded ${validVouchers.length} pool vouchers! <<<"`);
  lines.push('');

  return lines.join('\n');
}

/**
 * Generates restock batch and RouterOS seed script.
 * Does NOT insert into Supabase unless commit === true.
 */
export async function runVoucherRestock({
  supabaseClient = null,
  commit = false,
  targets = STOCK_TARGETS,
  rscOutPath = SEED_RSC_PATH,
  batchJsonPath = PENDING_BATCH_PATH
} = {}) {
  let existingAvailable = [];
  const existingCodes = new Set();

  if (supabaseClient) {
    const { data, error } = await supabaseClient
      .from('campusnet_vouchers')
      .select('id, code, password, package_id, amount, duration_hours, status')
      .eq('status', 'available');

    if (error) {
      throw new Error(`Supabase read error: ${error.message}`);
    }
    existingAvailable = data || [];
    for (const row of existingAvailable) {
      if (row.code) existingCodes.add(row.code);
    }
  }

  // Count current available stock per package
  const stockByPkg = {};
  for (const pkg of PACKAGES) {
    stockByPkg[pkg.id] = 0;
  }
  for (const v of existingAvailable) {
    stockByPkg[v.package_id] = (stockByPkg[v.package_id] || 0) + 1;
  }

  let newVouchers = [];

  // If committing and a pending batch file already exists from Stage 1, commit that exact batch
  if (commit && fs.existsSync(batchJsonPath)) {
    const savedBatch = JSON.parse(fs.readFileSync(batchJsonPath, 'utf8'));
    if (Array.isArray(savedBatch) && savedBatch.length > 0) {
      newVouchers = savedBatch.filter((v) => !existingCodes.has(v.code));
    }
  } else {
    // Stage 1: Generate new vouchers to meet targets across all 7 Option A packages
    for (const pkg of PACKAGES) {
      const targetCount = targets[pkg.id] ?? 50;
      const currentCount = stockByPkg[pkg.id] || 0;
      const needed = Math.max(0, targetCount - currentCount);

      for (let i = 0; i < needed; i++) {
        newVouchers.push({
          code: generateVoucherCode(pkg.prefix, existingCodes),
          password: generatePin(),
          package_id: pkg.id,
          duration_hours: pkg.duration_hours,
          amount: pkg.amount,
          status: 'available'
        });
      }
    }
    fs.mkdirSync(path.dirname(batchJsonPath), { recursive: true });
    fs.writeFileSync(batchJsonPath, JSON.stringify(newVouchers, null, 2), 'utf8');
  }

  // Combine existing available + newly generated vouchers for the RouterOS seed script
  const combinedPool = [...existingAvailable, ...newVouchers];
  const rscContent = buildSeedRscContent(combinedPool);
  fs.mkdirSync(path.dirname(rscOutPath), { recursive: true });
  fs.writeFileSync(rscOutPath, rscContent, 'utf8');

  let insertedCount = 0;
  if (commit && supabaseClient) {
    // Align any legacy available pool voucher amounts with Option A catalog pricing
    for (const pkg of PACKAGES) {
      await supabaseClient
        .from('campusnet_vouchers')
        .update({ amount: pkg.amount, duration_hours: pkg.duration_hours })
        .eq('package_id', pkg.id)
        .eq('status', 'available');
    }

    // Insert new batch into Supabase
    for (let i = 0; i < newVouchers.length; i += 100) {
      const chunk = newVouchers.slice(i, i + 100);
      const { error: insErr } = await supabaseClient.from('campusnet_vouchers').insert(chunk);
      if (insErr) {
        throw new Error(`Failed inserting voucher batch at index ${i}: ${insErr.message}`);
      }
      insertedCount += chunk.length;
    }
  }

  return {
    committed: commit,
    existingPoolCount: existingAvailable.length,
    generatedCount: newVouchers.length,
    insertedCount,
    totalInSeedRsc: combinedPool.length,
    stockByPkg,
    rscOutPath,
    batchJsonPath
  };
}

// CLI Entrypoint
if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const isCommit = process.argv.includes('--commit');
  const isOffline = process.argv.includes('--offline');

  let supabaseClient = null;
  if (!isOffline && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    supabaseClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  }

  console.log('==================================================================');
  console.log(`  CAMPUSNET VOUCHER RESTOCK v2 (${isCommit ? 'COMMIT TO SUPABASE' : 'STAGE 1: GENERATE .RSC ONLY - NO DB WRITES'})`);
  console.log('==================================================================');

  runVoucherRestock({ supabaseClient, commit: isCommit })
    .then((summary) => {
      console.log('Existing Available Pool in DB:', summary.existingPoolCount);
      console.log('Newly Generated Vouchers:     ', summary.generatedCount);
      console.log('Total Vouchers in Seed .rsc:  ', summary.totalInSeedRsc);
      console.log('Committed to Supabase DB:     ', summary.committed ? `YES (${summary.insertedCount} inserted)` : 'NO (Run with --commit AFTER seeding L009 router)');
      console.log('RouterOS Seed File:           ', summary.rscOutPath);
      console.log('Pending Batch Manifest:       ', summary.batchJsonPath);
    })
    .catch((err) => {
      console.error('Voucher restock failed:', err.message);
      process.exit(1);
    });
}
