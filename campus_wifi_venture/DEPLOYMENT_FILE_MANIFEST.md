# DEPLOYMENT FILE MANIFEST: CAMPUSNET UPGRADE
**Venture**: Makoyocart Ventures Wifi (`BN-WLSP9KP9`)  
**Target Environment**: MikroTik L009 Core Gateway, MikroTik hAP lite AP, Supabase, Render Backend  
**Directory Base**: `c:\Users\USER\Desktop\Duncan Makoyo\Y3\campus_wifi_venture\deployment\`

---

## 1. Directory Structure

```
c:\Users\USER\Desktop\Duncan Makoyo\Y3\campus_wifi_venture\deployment\
├── 01_supabase_sql/
│   ├── 01_PRE_DEPLOYMENT_HEALTH_CHECK.sql
│   ├── 02_SCHEMA_INDEXES_AND_PERFORMANCE.sql
│   ├── 03_ALIGN_EXISTING_POOL_PRICING.sql
│   └── 04_POST_DEPLOYMENT_VERIFICATION.sql
├── 02_voucher_restock/
│   ├── 18_SEED_VOUCHERS_L009.rsc
│   ├── pending_vouchers_batch.json
│   └── restock_vouchers_v2.mjs
├── 03_router_l009/
│   ├── 00_DIAGNOSTICS_READONLY.rsc
│   └── 16_L009_UPGRADE_50MBPS_NO_SIGNOUT_AND_REMOTE.rsc
├── 04_router_hap_lite/
│   └── 17_HAP_LITE_OPTIMIZED_AP.rsc
├── 05_captive_portal/
│   ├── alogin.html
│   ├── error.html
│   ├── flogin.html
│   ├── login.html
│   ├── logout.html
│   ├── redirect.html
│   ├── rlogin.html
│   └── status.html
├── 06_backend/
│   ├── campusnet.js
│   ├── campusnetCatalog.js
│   ├── index.js
│   ├── WifiPromosLoyalty.js
│   └── campusnet/
│       └── catalog.js
└── 07_verification/
    └── test_campusnet_upgrade.mjs
```

---

## 2. File-by-File Deployment Manifest

| File Path | Target Destination | Execution Method | Execution Order | Safety Guarantee |
|---|---|---|---|---|
| `01_supabase_sql/01_PRE_DEPLOYMENT_HEALTH_CHECK.sql` | Supabase SQL Editor | Paste & Run in Web UI | Step 1 | 100% Read-only; establishes baseline |
| `01_supabase_sql/02_SCHEMA_INDEXES_AND_PERFORMANCE.sql` | Supabase SQL Editor | Paste & Run in Web UI | Step 2 | Non-destructive `CREATE INDEX IF NOT EXISTS` |
| `01_supabase_sql/03_ALIGN_EXISTING_POOL_PRICING.sql` | Supabase SQL Editor | Paste & Run in Web UI | Step 3 | Updates only `available` unassigned vouchers |
| `03_router_l009/00_DIAGNOSTICS_READONLY.rsc` | MikroTik L009 Terminal | Paste into WinBox Terminal | Step 4 | 100% Read-only; snapshots router state |
| `03_router_l009/16_L009_UPGRADE_50MBPS_NO_SIGNOUT_AND_REMOTE.rsc` | MikroTik L009 Terminal | Paste into WinBox Terminal (Safe Mode) | Step 5 | Idempotent; preserves active users & cookies |
| `04_router_hap_lite/17_HAP_LITE_OPTIMIZED_AP.rsc` | MikroTik hAP lite Terminal | Paste into WinBox Terminal | Step 6 | Pure Layer-2 bridge; 20 MHz radio optimization |
| `02_voucher_restock/18_SEED_VOUCHERS_L009.rsc` | MikroTik L009 Files -> `/hotspot` | `/import file-name=18_SEED_VOUCHERS_L009.rsc` | Step 7 | Adds 970 pool vouchers; unsets limit-uptime |
| `02_voucher_restock/restock_vouchers_v2.mjs` | Laptop PowerShell | `node restock_vouchers_v2.mjs --commit` | Step 8 | Inserts 628 newly generated vouchers into Supabase |
| `06_backend/` (all files) | GitHub Repository -> Render | `git commit` & `git push origin main` | Step 9 | Automated Render build; requires env keys |
| `05_captive_portal/login.html` & `status.html` | MikroTik L009 Files -> `hotspot/` | Drag-and-drop into WinBox Files | Step 10 | Zero external assets (< 40 KB); 50 Mbps copy |
| `01_supabase_sql/04_POST_DEPLOYMENT_VERIFICATION.sql` | Supabase SQL Editor | Paste & Run in Web UI | Step 11 | Proves active sessions preserved & targets met |

---

## 3. Environment Variables Reference (Render Dashboard)

Ensure the following variables are set in the Render Dashboard (`imageke-api`) prior to deployment:

| Variable Name | Required Value Description | Example / Current Setting |
|---|---|---|
| `PORT` | Node.js listening port | `5000` |
| `SUPABASE_URL` | Supabase API URL | `https://aiyglunfwsolqsujyfsz.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Secret Service Key | `eyJhbGciOiJIUzI1NiIsInR5cCI6Ikp...` |
| `PAYSTACK_SECRET_KEY` | Live Paystack Secret Key | `sk_live_...` |
| `ROUTER_SYNC_SECRET_KEY` | Non-default secret matching L009 scheduler | Custom high-entropy token |
| `CAMPUSNET_ADMIN_KEY` | Non-default admin API token | Custom high-entropy token |

