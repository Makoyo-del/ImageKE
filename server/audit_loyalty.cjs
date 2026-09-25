// FULL LOYALTY AUDIT SCRIPT for phone 0141426876 (CommonJS)
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TARGET_PHONE = '254141426876'; // normalized from 0141426876

async function audit() {
  console.log(`\n====== LOYALTY AUDIT: ${TARGET_PHONE} ======\n`);

  // 1. ALL transactions - see everything
  const { data: allTxs } = await supabase
    .from('campusnet_transactions')
    .select('id, phone, amount, package_id, status, promo_code, created_at')
    .eq('phone', TARGET_PHONE)
    .order('created_at', { ascending: true });

  console.log(`[ALL TRANSACTIONS] Count: ${allTxs?.length ?? 0}`);
  if (allTxs) {
    allTxs.forEach((t, i) => {
      console.log(
        `  #${i + 1} | amount=${t.amount} | status=${t.status} | pkg=${t.package_id} | promo=${t.promo_code || '-'} | date=${new Date(t.created_at).toLocaleString()}`
      );
    });
  }

  // 2. Transactions that loyalty counts (status in ['completed','SUCCESS'], amount >= 10)
  const { data: paidTxs } = await supabase
    .from('campusnet_transactions')
    .select('id, amount, package_id, status, created_at')
    .eq('phone', TARGET_PHONE)
    .in('status', ['completed', 'SUCCESS'])
    .gte('amount', 10)
    .order('created_at', { ascending: true });

  console.log(`\n[QUALIFYING PURCHASES (status=completed/SUCCESS, amount>=10)] Count: ${paidTxs?.length ?? 0}`);
  if (paidTxs) {
    paidTxs.forEach((t, i) => {
      console.log(`  #${i + 1} | amount=${t.amount} | status=${t.status} | pkg=${t.package_id} | date=${new Date(t.created_at).toLocaleString()}`);
    });
  }

  const totalPaid = paidTxs?.length ?? 0;
  const milestonesEarned = Math.floor(totalPaid / 5);
  const currentStamps = totalPaid % 5;
  console.log(`\n  → Total Qualifying: ${totalPaid}`);
  console.log(`  → Milestones Earned: ${milestonesEarned} (every 5 purchases = 1 free 24h)`);
  console.log(`  → Current Stamps: ${currentStamps}/5`);

  // 3. Claimed vouchers for this phone
  const { data: vouchers } = await supabase
    .from('campusnet_vouchers')
    .select('id, code, package_id, amount, assigned_phone, activated_at, expires_at, created_at')
    .eq('assigned_phone', TARGET_PHONE);

  console.log(`\n[VOUCHERS ASSIGNED TO THIS PHONE] Count: ${vouchers?.length ?? 0}`);
  if (vouchers) {
    vouchers.forEach((v, i) => {
      console.log(`  #${i + 1} | pkg=${v.package_id} | amount=${v.amount} | code=${v.code} | activated=${v.activated_at || 'NOT YET'} | expires=${v.expires_at || '-'} | created=${new Date(v.created_at).toLocaleString()}`);
    });
  }

  // 4. Zero-amount transactions
  const { data: freeTxs } = await supabase
    .from('campusnet_transactions')
    .select('id, amount, status, package_id, created_at')
    .eq('phone', TARGET_PHONE)
    .eq('amount', 0);

  console.log(`\n[ZERO-AMOUNT TRANSACTIONS (free redemptions)] Count: ${freeTxs?.length ?? 0}`);
  if (freeTxs) {
    freeTxs.forEach((t, i) => {
      console.log(`  #${i + 1} | amount=${t.amount} | status=${t.status} | pkg=${t.package_id} | date=${new Date(t.created_at).toLocaleString()}`);
    });
  }

  // 5. DIAGNOSIS
  console.log('\n====== DIAGNOSIS ======');
  if (milestonesEarned === 0 && totalPaid < 5) {
    console.log('❌ BUG CONFIRMED: System shows reward but only', totalPaid, 'qualifying purchases exist (need 5)');
    console.log('   POSSIBLE CAUSES:');
    console.log('   1. Transactions with unexpected status values (not completed/SUCCESS) being counted elsewhere');
    console.log('   2. Front-end login.html JS may have a hard-coded demo/fallback reward state');
    console.log('   3. The portal is showing stale cached data from a previous session');
  } else if (milestonesEarned >= 1) {
    console.log(`✅ Reward is LEGITIMATE: ${totalPaid} paid purchases → ${milestonesEarned} free pass(es) earned`);
    console.log('   The purchase count is correct. User may have forgotten prior purchases.');
  }
}

audit().catch(console.error);
