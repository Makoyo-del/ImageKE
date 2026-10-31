# SUPABASE MANUAL DEPLOYMENT GUIDE — CAMPUSNET
**Project**: Makoyocart Ventures Wifi (`BN-WLSP9KP9`)  
**Supabase Project ID**: `aiyglunfwsolqsujyfsz`  
**Region**: Frankfurt / AWS (or project standard)  
**Safety Status**: 100% Non-Destructive. Zero Table Wipes. Zero Session Disconnections.

---

## Overview & Execution Order

You will execute these steps manually from the Supabase Dashboard. Follow the strict order below. **Do not skip steps.**

| Order | File / Action | Tool | Purpose | Safe to Repeat? |
|---|---|---|---|---|
| **Step 1** | `01_PRE_DEPLOYMENT_HEALTH_CHECK.sql` | Supabase SQL Editor | Read-only baseline snapshot of active students & current stock | YES (Read-Only) |
| **Step 2** | `02_SCHEMA_INDEXES_AND_PERFORMANCE.sql` | Supabase SQL Editor | Adds composite performance indexes for fast sync & polling | YES (`IF NOT EXISTS`) |
| **Step 3** | `03_ALIGN_EXISTING_POOL_PRICING.sql` | Supabase SQL Editor | Aligns prices of unassigned available vouchers to Option A | YES (Idempotent) |
| **Step 4** | **WAIT FOR ROUTER SEEDING** | MikroTik WinBox Terminal | Import `18_SEED_VOUCHERS_L009.rsc` onto L009 first | N/A |
| **Step 5** | `node restock_vouchers_v2.mjs --commit` | Laptop PowerShell Terminal | Inserts 628 newly generated vouchers into `campusnet_vouchers` | YES (Exact Batch) |
| **Step 6** | `04_POST_DEPLOYMENT_VERIFICATION.sql` | Supabase SQL Editor | Proves all active students preserved & stock targets satisfied | YES (Read-Only) |

---

## Detailed Step-by-Step Instructions

### Step 1: Pre-Deployment Health & Active Student Audit
1. Open your browser and go to [https://supabase.com/dashboard/project/aiyglunfwsolqsujyfsz](https://supabase.com/dashboard/project/aiyglunfwsolqsujyfsz).
2. Click **SQL Editor** on the left navigation bar.
3. Click **New query** (or press `Ctrl + Enter` in a blank tab).
4. Open the prepared file:
   `deployment/01_supabase_sql/01_PRE_DEPLOYMENT_HEALTH_CHECK.sql`
5. Copy the entire file content, paste it into the SQL Editor, and click **Run** (or press `Ctrl + Enter`).
6. **Inspect the Output**:
   - Note the `total_active_sessions` count in Result 1. These represent currently connected hostel students. **This count must not decrease after deployment.**
   - Inspect Result 3 to see the current stock of unassigned vouchers.

---

### Step 2: Apply Performance Indexes
1. In the Supabase **SQL Editor**, open a new tab.
2. Open the prepared file:
   `deployment/01_supabase_sql/02_SCHEMA_INDEXES_AND_PERFORMANCE.sql`
3. Copy the entire file content and paste it into the editor.
4. Click **Run**.
5. **Expected Result**:
   - `Success. No rows returned.`
   - The verification query at the bottom will return 5 index rows (`idx_campusnet_vouchers_status_expires`, `idx_campusnet_vouchers_pkg_status_avail`, `idx_campusnet_transactions_ref_status`, `idx_campusnet_transactions_receipt`, `idx_campusnet_sessions_valid_until`).

---

### Step 3: Align Existing Available Pool Vouchers to Option A Pricing
1. In the Supabase **SQL Editor**, open a new tab.
2. Open the prepared file:
   `deployment/01_supabase_sql/03_ALIGN_EXISTING_POOL_PRICING.sql`
3. Copy the entire file content and paste it into the editor.
4. Click **Run**.
5. **Expected Result**:
   - Result table displays all available packages aligned to Option A:
     - `pkg_1h`: KSh 10 (1h)
     - `pkg_3h`: KSh 20 (3h)
     - `pkg_12h`: KSh 30 (12h)
     - `pkg_24h`: KSh 50 (24h)
     - `pkg_3d`: KSh 100 (72h)
     - `pkg_7d`: KSh 180 (168h)
     - `pkg_30d`: KSh 500 (720h)
   - **Crucial**: Active assigned vouchers and existing transaction records are completely untouched.

---

### Step 4: Router Seeding Intermission (CRITICAL PREREQUISITE)
> [!IMPORTANT]
> **DO NOT PROCEED TO STEP 5 UNTIL THIS IS DONE ON THE ROUTER:**
> Before inserting new vouchers into Supabase, the MikroTik L009 must receive and load the voucher usernames and PINs. If a student buys a voucher that Supabase knows but the router doesn't know, RouterOS will reject their login!
>
> 1. In WinBox -> **Files**, upload `deployment/02_voucher_restock/18_SEED_VOUCHERS_L009.rsc`.
> 2. In WinBox -> **Terminal**, run:
>    ```routeros
>    /import file-name=18_SEED_VOUCHERS_L009.rsc
>    ```
> 3. Verify in WinBox -> **IP -> Hotspot -> Users** that total users is ~970.

---

### Step 5: Commit New Voucher Pool to Supabase (Node.js Execution)
*(This step is executed from your laptop command prompt, NOT in Supabase SQL Editor)*

1. Open PowerShell on your laptop.
2. Navigate to the voucher restock folder:
   ```powershell
   Set-Location "c:\Users\USER\Desktop\Duncan Makoyo\Y3\campus_wifi_venture"
   ```
3. Execute the commit command:
   ```powershell
   node deployment/02_voucher_restock/restock_vouchers_v2.mjs --commit
   ```
4. **Expected Terminal Output**:
   ```
   ==================================================================
     CAMPUSNET VOUCHER RESTOCK v2 (COMMIT TO SUPABASE)
   ==================================================================
   Existing Available Pool in DB: 342
   Newly Generated Vouchers:      628
   Total Vouchers in Seed .rsc:   970
   Committed to Supabase DB:      YES (628 inserted)
   RouterOS Seed File:            .../18_SEED_VOUCHERS_L009.rsc
   Pending Batch Manifest:        .../pending_vouchers_batch.json
   ```

---

### Step 6: Post-Deployment Verification & Integrity Proof
1. Return to the Supabase **SQL Editor**.
2. Open the prepared file:
   `deployment/01_supabase_sql/04_POST_DEPLOYMENT_VERIFICATION.sql`
3. Copy the entire file content, paste it into the editor, and click **Run**.
4. **Verification Criteria**:
   - **Test 1**: `preserved_active_sessions` equals or exceeds the baseline from Step 1.
   - **Test 2**: `total_available_stock` satisfies hostel targets (pkg_1h >= 150, pkg_3h >= 100, pkg_12h >= 150, pkg_24h >= 150, pkg_3d >= 80, pkg_7d >= 60, pkg_30d >= 30).
   - **Test 3**: Zero duplicate voucher codes returned (`0 rows`).
   - **Test 4**: Zero orphaned assigned vouchers returned (`0 rows`).

---

## Rollback Procedure (If Needed)
Because all operations are strictly additive (`INSERT` of new distinct codes) or index creations (`CREATE INDEX IF NOT EXISTS`), rollback is trivial and non-destructive:
- To drop performance indexes:
  ```sql
  DROP INDEX IF EXISTS idx_campusnet_vouchers_status_expires;
  DROP INDEX IF EXISTS idx_campusnet_vouchers_pkg_status_avail;
  DROP INDEX IF EXISTS idx_campusnet_transactions_ref_status;
  DROP INDEX IF EXISTS idx_campusnet_transactions_receipt;
  DROP INDEX IF EXISTS idx_campusnet_sessions_valid_until;
  ```
- Active sessions and transaction history are never touched and require no rollback.

