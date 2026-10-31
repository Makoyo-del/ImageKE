# MANDATORY POST-IMPLEMENTATION FORENSIC AUDIT: CAMPUSNET (MAKOYOCART VENTURES)
**Document Version**: 1.0.0-FORENSIC-AUDIT  
**Date**: October 31, 2026 (21:55 EAT)  
**Location**: Kisii, Kenya (Hostel Wi-Fi Installation BN-WLSP9KP9)  
**Auditor**: Antigravity Autonomous Systems Engineering (Pair Programming with Duncan Makoyo)  
**Scope**: `DunMak/server`, `campus_wifi_venture` (`hotspot`, `portal`, `mikrotik`, `scripts`), Supabase schema, RouterOS v7 configurations, Paystack integrations.

---

## 1. Executive Verdict

### Verdict: **PARTIALLY COMPLIANT** (Critical Architectural Incompatibility & Production Staging Blockers)

### Justification:
1. **Strengths Built & Verified (Compliant)**:
   - The backend payment engine, single-source catalog (`campusnet/catalog.js`), Option A pricing, dual mobile money provider detection (`mpesa` + `atl`), atomic voucher claim concurrency, anti-replay verification, zero free internet endpoints (all 410 Gone), and the compact `< 40 KB` zero-asset captive portal are 100% verified via automated test suites (25/25 passing tests across 8 suites).
2. **Critical Architectural Conflict (Requirement 3.B - Pausable Voucher Logic)**:
   - **Conflict**: The audit rubric strictly specifies: *"Verify that pkg_1h and pkg_3h genuinely provide purchased usage time that pauses when the student disconnects, within the agreed validity window... A 24-hour valid_until value alone is NOT proof of a working pause-on-disconnect implementation."*
   - **Finding**: In the previous user prompt, the instruction was explicitly given: *"option A and model 1 and there is no pausing, if you pay for 3 hours, the voucher is valid for the next threee hours, we do not sell what we can not support."*
   - Consequently, the system was implemented as **Model 1 (Continuous Wall-Clock from Purchase)**. The Supabase schema (`campusnet_sessions`) has only `valid_until TIMESTAMPTZ` and contains **no** columns for tracking accumulated uptime, pause timestamps, or remaining banked seconds. Furthermore, RouterOS running standalone behind CGNAT without a RADIUS accounting server or active-session polling daemon cannot natively enforce "banked uptime within a fixed wall-clock validity window". If pausable uptime banking is required, the system is **NON-COMPLIANT** with requirement 3.B.
3. **Hardware Staging Status**:
   - The RouterOS upgrade scripts (`16_L009_...rsc`, `17_HAP_...rsc`), seed voucher files (`18_SEED_...rsc`), and database commits (`--commit`) have **not** been applied to the live hardware or live Supabase database yet. They reside as validated local artifacts awaiting sequential go-live confirmation. The live router is currently still running the legacy 18 Mbps bottleneck, disabled MAC-cookie, and 1-hour DHCP lease.
4. **Discovered Technical Defects**:
   - **MAC-Cookie Lifetime Bug**: `16_L009_UPGRADE_50MBPS_NO_SIGNOUT_AND_REMOTE.rsc` sets `mac-cookie-timeout=3d`. This prematurely kicks 7-day (`pkg_7d`) and 30-day (`pkg_30d`) students off MAC-cookie auto-login after 3 days.
   - **RouterOS Simple Queue Priority Collision**: Profiles configure `rate-limit="3M/8M"`, which creates dynamic simple queues in RouterOS placed above `WAN-Bandwidth-Manager` without setting `parent-queue=WAN-Bandwidth-Manager`, potentially bypassing the global PCQ bufferbloat manager.

---

## 2. Original Requirements Compliance Matrix

| Requirement | Original Expectation | Implementation Found | Verification Evidence | Status |
|---|---|---|---|---|
| **A.1 Sign-Out Prevention (Keepalive / Idle)** | Prevent random disconnects on phone screen lock | `keepalive-timeout=10m`, `idle-timeout=none`, DHCP `lease-time=12h` in `16_L009_...rsc` | Static parsing in `test_campusnet_upgrade.mjs` (Suite 4.2). Unapplied on physical router. | **PARTIALLY VERIFIED** |
| **A.2 MAC-Cookie Session Persistence** | Auto-login returning devices without captive portal popup | `login-by=mac-cookie,http-chap,http-pap,cookie`, `add-mac-cookie=yes`, `mac-cookie-timeout=3d` | Script verified; however `3d` timeout creates a defect for `pkg_7d` and `pkg_30d`. | **PARTIALLY VERIFIED** |
| **A.3 Welcome-Back 1-Tap Reconnect** | 1-tap re-login on portal for returning students | `localStorage.getItem('cn_saved_phone')` checks `/session/status` & auto-populates `document.sendin` | `login.html` lines 452–492 & 545–560; Suite 3.2. | **PASS** |
| **A.4 Multiple-Device / Ghost Session Prevention** | One voucher must not authenticate multiple devices | `shared-users=1` on all profiles; `/sync/live` cleans `/ip hotspot active` on expiry | Verified in RouterOS profile definitions & `/sync/live` generator (Suite 2.5). | **PASS** |
| **B.1 Pausable Voucher Logic (`pkg_1h`, `pkg_3h`)** | Uptime pauses on disconnect; resumes upon reconnect within validity window | System uses Model 1 continuous wall-clock (`now + 3h`) per previous directive. No pause fields exist in DB schema. | Supabase schema (`campusnet_sessions` only has `valid_until`); `catalog.js` has zero pause logic. | **FAIL / CONFLICT** |
| **B.2 Multi-Session Remaining Time Banking** | Disconnect after 30m of 3h pass, return 2h later with 2h30m left | Not supported. Expiration is fixed timestamp `purchase_time + 3h`. User returning after 3h finds pass expired. | `activateVoucherForTransaction` sets `valid_until = now + durationHours * 3600 * 1000`. | **FAIL / CONFLICT** |
| **C.1 Continuous Packages (`24h`, `3d`, `7d`, `30d`)** | Exact continuous wall-clock duration from payment | Strictly enforced in `catalog.js`, `campusnet.js`, and portal | Suite 2.1 & 2.2 passing; database timestamps authoritative. | **PASS** |
| **C.2 Night Owl Pass (`pkg_12h`)** | 6 PM → 6 AM EAT sale window; 12 hours validity from payment; KSh 30 | `saleWindow: { startHourEat: 18, endHourEat: 6 }` enforced on backend `/pay/stk` and portal UI | Suite 2.4 passed (Daytime 14:00 EAT rejected with 400 `SALE_WINDOW_CLOSED`, 21:00 EAT accepted). | **PASS** |
| **C.3 Long-Term MAC Retention (7d / 30d)** | Student stays connected for full duration without manual re-login | Router profile has `mac-cookie-timeout=3d` | Script line 99 caps cookie at 3 days. After 3 days, student must tap 1-tap reconnect on portal. | **FAIL** |
| **D.1 Real 50 Mbps WAN Bandwidth** | Eliminate 18 Mbps throttle; allocate Safaricom 50 Mbps pipe | `wanDown="48M"`, `wanUp="20M"`, `userDown="8M"`, `userUp="3M"` in `16_L009_...rsc` | Script verified in Suite 4.3. Not yet imported into physical L009. | **PARTIALLY VERIFIED** |
| **D.2 Queue Hierarchy & Bufferbloat (PCQ)** | Fair-share per-user shaping; zero starvation when multi-streaming | PCQ queue types `campusnet-pcq-down` / `up` in Simple Queue `WAN-Bandwidth-Manager` | Tunable variables verified in Suite 4.3; potential collision with dynamic hotspot queues noted. | **PARTIALLY VERIFIED** |
| **D.3 Safaricom 4G/5G TCP MSS Clamping** | Prevent packet drops & stalled web pages on cellular/fiber | `action=change-mss new-mss=clamp-to-pmtu` for tcp-flags=syn tcp-mss=1400-65535 | Verified in `16_L009_...rsc` line 125 and Suite 4.3. | **PARTIALLY VERIFIED** |
| **D.4 Dedicated Admin Port & Firewall Isolation** | Block students from WinBox/SSH/API/REST; isolate admin to Port 8 & VPN | `ether8` configured as `192.168.88.1/24`; ports 21, 22, 23, 8291, 8443, 8728, 8729 dropped on `bridge-hotspot` | Verified in `16_L009_...rsc` lines 147–152 and Suite 4.4. | **PARTIALLY VERIFIED** |
| **D.5 Remote Management (Back-To-Home)** | Access L009 behind Safaricom CGNAT | `/ip cloud set ddns-enabled=yes back-to-home-vpn=enabled` + HTTPS REST on port 8443 | Verified in `16_L009_...rsc` lines 166–180 and Suite 4.5. | **PARTIALLY VERIFIED** |
| **E.1 Safaricom M-Pesa STK Push** | Reliable STK prompt dispatch via Paystack | Normalized `254...` format; `provider="mpesa"`; awaits Paystack; duplicate guard (10s) | Verified in `test_campusnet_upgrade.mjs` Suite 2.2. | **PASS** |
| **E.2 Airtel Money STK Push** | Add Airtel Money STK prompt support | Prefix detection (`073`, `075`, `078`, `010`); manual switch pill; `provider="atl"` | Verified in `test_campusnet_upgrade.mjs` Suite 2.1 & 2.2. | **PASS** |
| **E.3 Duplicate Callback & Idempotency** | Prevent duplicate vouchers if webhook races status polling | In-process lock `inFlightVoucherClaims` + DB status guard + transaction reference check | Suite 2.2 verified (repeated webhook returns same voucher without claiming second). | **PASS** |
| **E.4 Concurrency (10 Parallel Payers)** | 10 simultaneous payers receive 10 distinct vouchers | Atomic query `.eq('id', candidate.id).eq('status', 'available').select()` | Suite 2.2 verified (10 parallel promises yield 10 unique codes). | **PASS** |
| **E.5 Anti-Replay / Phone Ownership** | Block students from reusing another student's M-Pesa receipt code | `POST /pay/verify-code` checks `tx.phone === cleanPhone`; returns 403 on mismatch | Suite 2.3 verified (`0799888777` using `0712345678`'s receipt gets 403 Forbidden). | **PASS** |
| **E.6 Webhook Security & Tampering** | Reject forged signatures & underpayments | HMAC-SHA512 verification; non-default env secret; package resolved strictly from DB tx | Suite 2.3 verified (forged signature = 400; KSh 10 paid for KSh 500 pkg = 400). | **PASS** |
| **F.1 Captive Portal Overhead (< 40 KB)** | Fast loading before phone disconnects; zero external assets | `login.html` is 39,787 bytes (< 40 KB); `status.html` is 9,386 bytes; zero Google Fonts/CDNs | Suite 3.1 passed. Single-file self-contained HTML/CSS/JS. | **PASS** |
| **F.2 Resend Prompt & Receipt Fallback** | Instant recovery if student misses USSD PIN prompt | "Resend PIN Prompt" button (`resendStkPrompt`) + SMS receipt code verification input | `login.html` lines 616–633, 702–741; Suite 3.3. | **PASS** |
| **F.3 Zero Free Internet Removal** | Remove loyalty, referrals, rewards, promo codes, fallback phone | Endpoints `/loyalty/redeem`, `/promo/verify`, `/admin/claim-reward` return 410 Gone | Suite 2.3 passed. Promo JSON cleared; fallback phone removed. | **PASS** |
| **G.1 Voucher Inventory Restocking** | Stock all 7 Option A packages for Monday return without duplicates | `restock_vouchers_v2.mjs` generated 628 vouchers; total pool 970 vouchers in `18_SEED_...rsc` | Suite 5.1 passed. Safe prefix generator (`generateVoucherCode`) with crypto entropy. | **PASS** |
| **G.2 Two-Stage Commit Safety** | Router must receive vouchers BEFORE database marks them available | Dry-run by default; `--commit` required to touch Supabase | Suite 5.1 passed. Stage 1 leaves DB untouched; Stage 2 commits exact batch. | **PASS** |

---

## 3. Complete Change Audit

### 3.1 `DunMak/server/campusnet/catalog.js` (NEW)
- **Modifications**: Created unified catalog defining `PACKAGES` array (7 Option A packages: `pkg_1h`=10, `pkg_3h`=20, `pkg_12h`=30, `pkg_24h`=50, `pkg_3d`=100, `pkg_7d`=180, `pkg_30d`=500). Implemented helper functions: `getPackageById`, `isWithinSaleWindow`, `resolvePackageFromPayment`, `resolvePackageFromVoucherCode`, `formatPhone`, `detectMobileMoneyProvider`, `isValidRouterIdentifier`.
- **Purpose**: Eliminates duplicate, conflicting pricing arrays scattered across `campusnet.js` and `WifiPromosLoyalty.js`. Ensures client price tampering is impossible.
- **Dependencies**: Imported by `campusnet.js`, `campusnetCatalog.js`, `WifiPromosLoyalty.js`, and `test_campusnet_upgrade.mjs`.

### 3.2 `DunMak/server/campusnet.js` (MODIFIED)
- **Modifications**:
  - Rewrote secrets check: `FORBIDDEN_DEFAULT_SECRETS` rejects default keys (`makoyocart_sync_secret_2026`, etc.). Fails closed (401) if keys are missing or defaulted.
  - Rewrote `POST /pay/stk`: Awaits Paystack response, detects Airtel vs M-Pesa, rejects Night Owl outside 18:00–06:00 EAT, guards against duplicate prompts within 10s.
  - Rewrote `activateVoucherForTransaction`: Atomic voucher claim loop using `inFlightVoucherClaims` Set + Supabase `.eq('id', candidate.id).eq('status', 'available').select()`. Records truthful `amount`.
  - Rewrote `POST /webhook`: Accepts only valid HMAC-SHA512, non-default HookBunker secret, or verified Paystack API call. Rejects underpayments and unknown transactions without guessing packages.
  - Rewrote `GET /pay/status/:reference`: Throttled to max 1 Paystack verification per 4.5 seconds per reference.
  - Rewrote `POST /pay/verify-code`: Enforces `tx.phone === cleanPhone` to block cross-user receipt replay (403).
  - Disabled all free-internet endpoints: `/loyalty/redeem`, `/admin/claim-reward`, `/admin/setup-db`, `/referrals/verify`, `/promo/verify` all return HTTP 410 Gone.
  - Rewrote router sync (`/sync`, `/sync/live`, `/sync/pool`): Generates valid RouterOS syntax only (`isValidRouterIdentifier`). Expired assigned vouchers are listed for removal across `/ip hotspot active`, `cookie`, `mac-cookie`, and `user`.
  - Added `ensureVoucherPoolStock` auto-topup and 72-hour pruner (`pruneExpiredRecords`).
- **Dependencies**: Consumed by captive portal `login.html` and MikroTik `/system scheduler` jobs.

### 3.3 `DunMak/server/WifiPromosLoyalty.js` (MODIFIED)
- **Modifications**: Replaced hardcoded package array with `export const CAMPUSNET_PACKAGES = PACKAGES` from `catalog.js`. Replaced phone normalizer with `formatPhone`. Stripped `FRESHER2026` promotional fallback. Replaced loyalty reward passes with disabled stubs.
- **Purpose**: Prevents pricing drift and stops legacy routes from dispensing free 24-hour passes.

### 3.4 `DunMak/server/index.js` (MODIFIED)
- **Modifications**: Enhanced CORS regex to allow origins matching `10.10.x.x`, `192.168.x.x`, and `campusnet.local`. Added `X-Router-Token` to allowed CORS headers.
- **Purpose**: Enables the captive portal to communicate with the Render API without CORS rejections.

### 3.5 `DunMak/server/data/campusnet_promos.json` (MODIFIED)
- **Modifications**: Wiped contents to `[]`.
- **Purpose**: Eliminates legacy promotional discount codes that allowed free or reduced-price internet.

### 3.6 `Y3/campus_wifi_venture/hotspot/login.html` & `status.html` (REWRITTEN & COMPACTED)
- **Modifications**:
  - Rewrote `login.html`: Single-file HTML/CSS/JS (39,787 bytes). Zero external fonts (`fonts.googleapis.com` removed), zero CDN scripts.
  - Added Welcome-Back banner for returning students using `localStorage.getItem('cn_saved_phone')` to query `/session/status` and trigger 1-tap login.
  - Added M-Pesa / Airtel Money 1-tap network switcher pills (`#pill-mpesa`, `#pill-airtel`).
  - Added 60-second countdown timer with "Resend PIN Prompt" button (`#btn-resend-stk`).
  - Added SMS receipt code verification input (`#manual-code-input`) calling `/pay/verify-code`.
  - Preserved all MikroTik variables: `$(mac)`, `$(ip)`, `$(username)`, `$(link-login-only)`, `$(link-orig)`, `$(error)`.
  - Rewrote `status.html` (9,386 bytes): Displays live countdown, connected time (`$(uptime)`), data used (`$(bytes-out-nice)`), device MAC (`$(mac)`), and tip for disabling randomized MAC.
- **Dependencies**: Uploaded to MikroTik router `hotspot/` directory.

### 3.7 `Y3/campus_wifi_venture/mikrotik/` Scripts
- **`00_DIAGNOSTICS_READONLY.rsc`**: 100% read-only diagnostic script inspecting resources, clock, WAN, Hotspot, active sessions, DHCP leases, queues, firewall, and Cloud status. Zero mutating commands.
- **`16_L009_UPGRADE_50MBPS_NO_SIGNOUT_AND_REMOTE.rsc`**:
  - Idempotent: Never wipes `/ip hotspot active`, `user`, or `cookie`.
  - Sign-out fixes: `login-by=mac-cookie,http-chap,http-pap,cookie`, `add-mac-cookie=yes`, `mac-cookie-timeout=3d`, `keepalive-timeout=10m`, `idle-timeout=none`, DHCP `lease-time=12h`. Unsets `limit-uptime` and `session-timeout` on profiles and users.
  - 50 Mbps PCQ shaping: `wanDown="48M"`, `wanUp="20M"`, `userDown="8M"`, `userUp="3M"`. TCP MSS Clamping to PMTU.
  - Firewall hardening: Dedicated Admin Port 8 (`192.168.88.1/24`); blocks students on `bridge-hotspot` from WinBox (8291), SSH (22), API (8728/8729), and REST (8443).
  - Remote access: Back-To-Home VPN enabled, HTTPS REST API enabled on port 8443, 2m live sync scheduler + 30m pool sync scheduler.
- **`17_HAP_LITE_OPTIMIZED_AP.rsc`**: Pure Layer-2 bridge AP; sets 2.4 GHz radio to strict `20mhz` on clean channel with `disconnect-timeout=15s` and RAM-only logging.
- **`18_SEED_VOUCHERS_L009.rsc`**: 970 pool vouchers generated without `limit-uptime`. Safe to import before database commit.
- **`pending_vouchers_batch.json`**: Local manifest of the 628 new vouchers to be inserted into Supabase upon `--commit`.

---

## 4. Critical Hotspots Investigation

### Hotspot 1: Payment-to-Voucher Activation
- **Components**: `POST /pay/stk` -> Paystack Charge API -> `POST /webhook` / `GET /pay/status/:reference` -> `activateVoucherForTransaction` -> Supabase (`campusnet_transactions`, `campusnet_vouchers`, `campusnet_sessions`).
- **Dependencies**: Paystack network latency, Supabase connection pool.
- **Failure Modes**: Webhook arrives before transaction insert finishes; status polling races webhook; Paystack Charge API timeout.
- **Evidence of Correct Behavior**: Transaction is inserted *before* calling Paystack; `activateVoucherForTransaction` checks transaction status atomically; `inFlightVoucherClaims` prevents concurrent race conditions (verified in Suite 2.2).
- **Remaining Risk**: If Supabase is completely unreachable during payment callback, the transaction remains pending until the student enters their receipt code or status polling recovers.

### Hotspot 2: Voucher-to-MikroTik Authentication
- **Components**: Captive portal `handlePaymentSuccess()` -> `document.sendin.submit()` -> MikroTik Hotspot `/login` -> RouterOS User Database (`/ip hotspot user`).
- **Dependencies**: Voucher code and PIN must already exist in `/ip hotspot user` on the router before the phone submits credentials.
- **Failure Modes**: If a student pays for a voucher that exists in Supabase but has not yet been seeded onto the router, RouterOS rejects login with *"invalid username or password"*.
- **Evidence of Correct Behavior**: The two-stage restocking architecture ensures `18_SEED_VOUCHERS_L009.rsc` is imported into the router *before* `--commit` inserts them into Supabase. Furthermore, `/sync/pool` syncs newly topped-up pool vouchers every 30 minutes, and fallback vouchers generated on-the-fly are synced via `/sync/live` within 2 minutes.
- **Remaining Risk**: If a student is assigned an on-the-fly generated fallback voucher and submits login within seconds before the 2-minute sync scheduler runs, login will fail until the sync occurs or the student taps Reconnect. **Remediation**: Keep pool stock abundant (targets set to 150–200 per package) so fallback generation never triggers.

### Hotspot 3: Router Disconnection-to-Database Session Synchronization
- **Components**: Student walks out of range / locks phone -> RouterOS keepalive / lease -> Backend `/sync/live` -> Supabase `campusnet_sessions`.
- **Dependencies**: RouterOS does not emit webhook events on disconnect without RADIUS.
- **Failure Modes**: In a continuous wall-clock model (Model 1), this is safe because the database timestamp (`valid_until`) keeps running regardless of router state. In a pausable model (Model 2), the system cannot know when the student disconnected, causing time accounting to fail.
- **Evidence of Correct Behavior**: Continuous model functions reliably without disconnection synchronization because `valid_until` is authoritative.
- **Remaining Risk**: If pausable vouchers are reintroduced, a synchronization mechanism (RADIUS accounting or RouterOS script posting active MACs) must be built.

### Hotspot 4: Database-to-Portal Session Restoration
- **Components**: Portal `initWelcomeBackAndPackages()` -> `GET /session/status?phone=...` -> `POST /session/restore` -> `handlePaymentSuccess()`.
- **Dependencies**: `localStorage` persistence across browser closures; phone number normalization.
- **Failure Modes**: Mobile Safari / Chrome clearing `localStorage` when user clears history; private browsing mode.
- **Evidence of Correct Behavior**: If `localStorage` is empty, the portal displays standard package cards and provides a manual "Restore Active Pass" modal where the student enters their phone number.
- **Remaining Risk**: If the student enters a different phone number from the one used at payment, restoration fails.

### Hotspot 5: MAC-Cookie-to-Device Identity
- **Components**: RouterOS Hotspot Server Profile (`login-by=mac-cookie`, `mac-cookie-timeout=3d`) -> Client MAC Address.
- **Dependencies**: Android/iOS Private Wi-Fi MAC Address feature.
- **Failure Modes**:
  1. If student device rotates its MAC address, the router treats it as a brand-new device and shows the portal.
  2. The `mac-cookie-timeout=3d` setting kicks weekly and monthly subscribers off MAC-cookie auto-login after 72 hours.
- **Evidence of Correct Behavior**: The portal displays a persistent tip advising students to set Private Wi-Fi to "Fixed/Off". If the MAC rotates, the Welcome-Back 1-Tap Reconnect banner uses the phone number in `localStorage` to restore the session immediately.
- **Remaining Risk**: `mac-cookie-timeout=3d` must be increased to `30d` so monthly subscribers do not experience portal popups every 3 days.

### Hotspot 6: Voucher Expiration-to-Router Timeout
- **Components**: Supabase `expires_at` -> Backend `GET /sync/live` -> RouterOS commands:
  ```routeros
  /ip hotspot active remove [find user="<code>"]
  /ip hotspot cookie remove [find user="<code>"]
  /ip hotspot mac-cookie remove [find user="<code>"]
  /ip hotspot user remove [find name="<code>"]
  ```
- **Dependencies**: Scheduled task `campusnet-sync-live` running every 2 minutes on the router.
- **Failure Modes**: If router internet or sync scheduler fails, an active student whose pass has expired might continue browsing until the next sync.
- **Evidence of Correct Behavior**: Tested in Suite 2.5: Expired vouchers are immediately identified and formatted into exact RouterOS removal commands while updating Supabase status to `'expired'`.
- **Remaining Risk**: Up to 2 minutes of grace browsing if the sync runs on a 2-minute interval. This is standard and acceptable.

### Hotspot 7: Concurrent Payment Callbacks
- **Components**: Paystack Webhook (`POST /webhook`) + Client Status Polling (`GET /pay/status/:reference`).
- **Dependencies**: Database transaction state.
- **Failure Modes**: Both webhook and polling handler detect `status === 'success'` simultaneously and attempt to claim two vouchers for a single payment.
- **Evidence of Correct Behavior**: `activateVoucherForTransaction` checks whether `existingTx.status === 'completed'` and `existingTx.voucher_code` is already set. If so, it returns the existing voucher immediately (`idempotent: true`). Tested in Suite 2.2.
- **Remaining Risk**: None. Idempotency is verified.

### Hotspot 8: Concurrent Voucher Restoration Requests
- **Components**: Multiple browser tabs or rapid tapping on "Restore Active Pass".
- **Dependencies**: `POST /session/restore` and `campusnet_sessions` unique constraint on `phone`.
- **Failure Modes**: Duplicate session rows; database deadlocks.
- **Evidence of Correct Behavior**: `campusnet_sessions` enforces `UNIQUE(phone)` and operations use `.upsert(..., { onConflict: 'phone' })`.
- **Remaining Risk**: None.

### Hotspot 9: Router Configuration Scripts That Overlap
- **Components**: `13_L009_DEFINITIVE_PRODUCTION_MASTER.rsc`, `14_FINAL_PRODUCTION_LOCK_IN.rsc`, `15_CRITICAL_SPEED_AND_LATENCY_FIX.rsc`, `16_L009_UPGRADE_50MBPS_NO_SIGNOUT_AND_REMOTE.rsc`.
- **Dependencies**: Prior configurations left in RouterOS memory.
- **Failure Modes**: Older scripts had conflicting rules (`session-timeout=1h`, `keepalive-timeout=2m`, `mac-cookie` disabled, `max-limit=6M/18M`). If an administrator runs an old script after the new upgrade, the old bugs are reintroduced.
- **Evidence of Correct Behavior**: `16_L009_UPGRADE_50MBPS_NO_SIGNOUT_AND_REMOTE.rsc` explicitly cleans conflicting mangle, filter, and queue settings, and unsets `limit-uptime` across all users.
- **Remaining Risk**: High if an operator manually executes old files (`13_...`, `14_...`, or `HARDENED_VOUCHER_RESTOCK_2026.rsc`). Old files must be archived or marked deprecated.

### Hotspot 10: Frontend-to-Backend API Contracts
- **Components**: Captive portal JavaScript (`login.html`) <-> Backend endpoints (`/pay/stk`, `/pay/status/:ref`, `/session/status`, `/session/restore`, `/pay/verify-code`, `/packages`).
- **Dependencies**: Render backend URL (`https://imageke-api.onrender.com/api/campusnet`).
- **Failure Modes**: Payload field mismatches (`package_id` vs `packageId`, `provider_label`, `valid_until`).
- **Evidence of Correct Behavior**: Full contract compatibility tested in Suite 3.2, 3.3, and 3.4. Field names align with the unified catalog.
- **Remaining Risk**: Render free/starter instance sleep latency (cold start). If the backend is asleep, initial STK requests can take 15–25 seconds. **Mitigation**: The portal fetch uses an `AbortController` timeout of 20 seconds and graceful retry prompts.

---

## 5. Test Results

### Automated Regression Gate Execution
**Command**: `npm run test:campusnet` (in `DunMak/server`)  
**Runner**: Node.js v24.13.1 Native Test Runner (`node:test`)  
**Execution Timestamp**: 2026-10-31T18:37:05+03:00  
**Results**: **25 tests passing, 0 failed, 8 test suites**

```
▶ Phase 2.1: Catalog, Pricing, Phone Normalization & Dual Network Detection
  ✔ Single-source catalog matches locked Option A pricing and has zero pause claims (3.48ms)
  ✔ resolvePackageFromPayment requires explicit packageId and rejects underpayment or bare amount guessing (0.44ms)
  ✔ formatPhone normalizes all Kenyan mobile formats and rejects invalid numbers (0.73ms)
  ✔ detectMobileMoneyProvider routes Safaricom -> mpesa and Airtel -> atl, with user override (0.54ms)
✔ Phase 2.1: Catalog, Pricing, Phone Normalization & Dual Network Detection (7.32ms)

▶ Phase 2.2: Payment Happy Path (M-Pesa + Airtel), Idempotency & Concurrency
  ✔ M-Pesa and Airtel STK push happy path, duplicate guard, and instant Paystack failure surfacing (157.40ms)
  ✔ Webhook HMAC activation + idempotency + status polling throttle (38.95ms)
  ✔ 10 parallel payers simultaneously claim 10 distinct vouchers with truthful paid amounts (12.96ms)
  ✔ Auto-top-up replenishes low stock and 72h pruner preserves recent expired rows (1.72ms)
✔ Phase 2.2: Payment Happy Path (M-Pesa + Airtel), Idempotency & Concurrency (212.20ms)

▶ Phase 2.3: Security (Forged Webhook, Default Keys, Unauth Admin/Sync, Anti-Replay, 410 Free Endpoints)
  ✔ Forged webhook signature and underpaid webhook are rejected (400) (23.12ms)
  ✔ Default hardcoded keys and unauthenticated requests are rejected (401) (41.18ms)
  ✔ verify-code blocks cross-user receipt/voucher replay (403) (22.47ms)
  ✔ All free-internet endpoints return 410 Gone and services refuse free passes (29.29ms)
✔ Phase 2.3: Security (Forged Webhook, Default Keys, Unauth Admin/Sync, Anti-Replay, 410 Free Endpoints) (119.26ms)

▶ Phase 2.4: Night Owl (6 PM -> 6 AM EAT) Sale Window Enforcement
  ✔ Night Owl STK push is refused during daytime (14:00 EAT) and accepted at night (21:00 EAT) (23.83ms)
✔ Phase 2.4: Night Owl (6 PM -> 6 AM EAT) Sale Window Enforcement (24.54ms)

▶ Phase 2.5: Router Sync Script Validation & Expired Session Removal
  ✔ /sync/live and /sync/pool emit only validated RouterOS lines and remove expired vouchers (22.30ms)
✔ Phase 2.5: Router Sync Script Validation & Expired Session Removal (22.83ms)

▶ Phase 3: Captive Portal Static Verification (3.1 - 3.5)
  ✔ 3.1 Single self-contained files < 40 KB with zero external fonts/scripts (2.17ms)
  ✔ 3.2 Welcome-back one-tap reconnect remembers phone number (0.51ms)
  ✔ 3.3 3-step flow, M-Pesa + Airtel network pills, resend prompt, and receipt-code fallback (0.54ms)
  ✔ 3.4 & 3.5 Zero loyalty/referral/free UI, honest 50 Mbps copy, and all MikroTik $(...) variables intact (1.34ms)
✔ Phase 3: Captive Portal Static Verification (3.1 - 3.5) (5.33ms)

▶ Phase 4: RouterOS L009 & hAP lite Scripts Verification (4.1 - 4.6)
  ✔ 4.1 Upgrade script is idempotent and never wipes active users or seeded vouchers (1.77ms)
  ✔ 4.2 Sign-out fixes: mac-cookie on, idle-timeout=none, keepalive-timeout=10m, 12h lease, cleared limit-uptime/session-timeout (0.86ms)
  ✔ 4.3 Real 50 Mbps shaping (PCQ) with tunable variables at the top (0.30ms)
  ✔ 4.4 Firewall blocks students on bridge-hotspot from WinBox/SSH/API/REST and restricts admin to ether8 + VPN (0.43ms)
  ✔ 4.5 Remote access: Back-To-Home VPN + HTTPS REST API + 2m/30m sync schedulers + Airtel Walled Garden (0.74ms)
  ✔ 4.6 Diagnostics script is strictly read-only (no set/add/remove/unset commands) (0.73ms)
✔ Phase 4: RouterOS L009 & hAP lite Scripts Verification (4.1 - 4.6) (6.35ms)

▶ Phase 5: Voucher Restock Generator & Two-Stage Commit Verification (5.1)
  ✔ 5.1 Generator creates seed .rsc without touching DB on Stage 1, and inserts only on --commit (Stage 2) (12.71ms)
✔ Phase 5: Voucher Restock Generator & Two-Stage Commit Verification (5.1) (12.86ms)

Total: 25 passing, 0 failing, 0 skipped. Duration: 1282ms.
```

### Categorization of Verification State:
- **Tested Successfully in Isolation / Emulation**:
  - Catalog pricing, Night Owl window, phone normalization, provider routing.
  - Paystack Charge API dispatch, duplicate prompt debounce, error message extraction.
  - Webhook HMAC-SHA512 verification, rejection of underpayments, rejection of unknown references.
  - Concurrency: 10 parallel payers claiming 10 unique vouchers.
  - Replay protection: Cross-phone code reuse blocked with 403.
  - Two-stage commit safety: Stage 1 creates `.rsc` without DB writes; Stage 2 commits exact batch.
  - Captive portal file size, script isolation, and HTML variable syntax.
- **Inspected Statically (Router Scripts)**:
  - `00_DIAGNOSTICS_READONLY.rsc`, `16_L009_UPGRADE_...rsc`, `17_HAP_LITE_...rsc`.
- **Not Verified on Live Physical Hardware**:
  - Live Mikrotik L009 and hAP lite execution (requires physical terminal paste).
  - Real SIM card STK push delivery on Safaricom and Airtel (requires real handset payment).
  - Physical Wi-Fi signal propagation through hostel concrete walls.

---

## 6. Outstanding Defects & Risk Register

### [CRITICAL] Defect 1: Requirement Conflict on Pausable Voucher Logic
- **Severity**: **CRITICAL** (Business Logic / Architecture Mismatch)
- **Description**: The audit requirement dictates that `pkg_1h` and `pkg_3h` must pause elapsed time when a student disconnects, whereas user command 3 locked in Model 1 ("there is no pausing, if you pay for 3 hours, the voucher is valid for the next three hours").
- **Consequence**: If students buy a 3-hour pass expecting it to pause while they attend lectures, their pass will expire after 3 wall-clock hours, generating complaints. If pausing is intended, the database schema lacks `used_seconds` or `pause_state`, and the router has no RADIUS accounting daemon to report disconnect events.
- **Remediation**: Duncan Makoyo must explicitly confirm either:
  - *Option 1 (Recommended - High Reliability)*: Stick with Model 1 (Strict continuous wall-clock). Rebrand clearly on the portal as "3 Hours Continuous Study Sprint" (which is what is currently implemented).
  - *Option 2 (Complex - Requires Architecture Expansion)*: Add `accumulated_uptime_seconds` and `session_state` to `campusnet_sessions`, configure FreeRADIUS on Render, and enable RADIUS accounting on RouterOS.

### [HIGH] Defect 2: MAC-Cookie Timeout Capped at 3 Days (`mac-cookie-timeout=3d`)
- **Severity**: **HIGH** (Student Experience Regression for Weekly & Monthly Users)
- **Description**: In `16_L009_UPGRADE_50MBPS_NO_SIGNOUT_AND_REMOTE.rsc`, lines 77 and 88 set `mac-cookie-timeout=3d` and `http-cookie-lifetime=3d`.
- **Consequence**: Students who purchase 7-Day (`pkg_7d`) or 30-Day (`pkg_30d`) passes will have their MAC cookies purged from RouterOS after 3 days. On Day 4, their phones will receive a captive portal login prompt. While they can tap the "Reconnect My Pass" button, this causes perceived disconnection.
- **Remediation**: Update `mac-cookie-timeout=30d` and `http-cookie-lifetime=30d` on the L009 hotspot server profile and user profiles. The backend `/sync/live` script already cleans expired MAC cookies upon expiration anyway.

### [MEDIUM] Defect 3: Hotspot User Profile Dynamic Queue Priority
- **Severity**: **MEDIUM** (Bandwidth Shaping Interaction)
- **Description**: User profiles define `rate-limit="3M/8M"`. When a user logs in, RouterOS automatically generates a dynamic Simple Queue for that user. Dynamic queues are inserted above static simple queues.
- **Consequence**: The dynamic per-user queue might handle traffic before the static `WAN-Bandwidth-Manager` (PCQ queue), potentially preventing the global 48M/20M PCQ bufferbloat manager from throttling aggregate load during peak hours.
- **Remediation**: In `16_L009_...rsc`, add `parent-queue=WAN-Bandwidth-Manager` to `/ip hotspot user profile` definitions, or set user profile `rate-limit=""` and let the PCQ classifier (`dst-address` / `src-address`) enforce both the 8M/3M individual limit and the 48M/20M aggregate limit.

### [LOW] Defect 4: Legacy Router Configuration Files in Repository
- **Severity**: **LOW** (Operational / Human Error Risk)
- **Description**: Folder `Y3/campus_wifi_venture/mikrotik/` contains legacy scripts (`00_master_clean_setup.rsc`, `13_...`, `14_...`, `HARDENED_VOUCHER_RESTOCK_2026.rsc`) which contain destructive commands (`/ip hotspot active remove [find]`, `keepalive-timeout=2m`, `rate-limit="1M/3M"`).
- **Consequence**: An operator or future developer could accidentally run an old script and reintroduce random sign-outs or wipe active students.
- **Remediation**: Move all legacy `.rsc` files into a `deprecated/` subfolder, leaving only `00_DIAGNOSTICS_READONLY.rsc`, `16_L009_...rsc`, `17_HAP_...rsc`, and `18_SEED_...rsc`.

---

## 7. Production Readiness Assessment

### Status: **NOT READY FOR IMMEDIATE UNATTENDED CUTOVER**

### Why:
1. **Pausable vs. Continuous Decision**: You must formally resolve Defect 1 (Model 1 Continuous vs. Model 2 Pausable Banking) before going live to students.
2. **Defect 2 Patch Required**: `mac-cookie-timeout` must be adjusted from `3d` to `30d` in `16_L009_UPGRADE_50MBPS_NO_SIGNOUT_AND_REMOTE.rsc` before it is pasted into the core gateway.
3. **Hardware Sequence Prerequisite**: The L009 and hAP lite routers must be upgraded in WinBox Safe Mode before committing voucher batches to Supabase or uploading the new portal files.

---

## 8. Recommended Remediation Plan

### Step 1: Resolve Business Rule Decision (Action: Duncan Makoyo)
Confirm explicitly:
- **Decision A (Recommended)**: Confirm **Model 1 (Strict Continuous Wall-Clock Time)** across all packages. The portal already clearly labels `pkg_3h` as *"3 Hours Study Pass — Valid for the next 3 hours continuously"*. No architecture redesign required.
- **Decision B**: Request **Model 2 (Pausable Uptime Banking)**. This will require halting deployment to design a RADIUS or polling-based time banking accounting engine and expanding the database schema.

### Step 2: Apply Minor Script Adjustments (Pre-Deploy)
1. In `16_L009_UPGRADE_50MBPS_NO_SIGNOUT_AND_REMOTE.rsc`:
   - Change `mac-cookie-timeout=3d` to `mac-cookie-timeout=30d`.
   - Change `http-cookie-lifetime=3d` to `http-cookie-lifetime=30d`.
   - Add `parent-queue=WAN-Bandwidth-Manager` to Hotspot user profiles.
2. Move legacy scripts in `mikrotik/` to `mikrotik/archive/` to prevent accidental execution.

### Step 3: Sequential Go-Live Execution (Upon Your Explicit Approval)
Follow the locked-in sequential order:
1. **Router Diagnostics**: Connect laptop to L009 via WinBox (Safe Mode ON). Paste `00_DIAGNOSTICS_READONLY.rsc` and record baseline active sessions and DHCP leases.
2. **Core Router Upgrade**: Paste adjusted `16_L009_UPGRADE_50MBPS_NO_SIGNOUT_AND_REMOTE.rsc` (with your non-default `syncToken` at the top).
3. **Access Point Optimization**: Paste `17_HAP_LITE_OPTIMIZED_AP.rsc` into the hAP lite terminal.
4. **Router Voucher Pool Seeding**: Upload `18_SEED_VOUCHERS_L009.rsc` to L009 via WinBox Files and run `/import file-name=18_SEED_VOUCHERS_L009.rsc`.
5. **Database Commit**: Run `node scripts/restock_vouchers_v2.mjs --commit` to insert the 628 new pool vouchers into Supabase and update pricing.
6. **Backend Render Deploy**: Push `DunMak/server` to GitHub to deploy the hardened backend to Render. Ensure `ROUTER_SYNC_SECRET_KEY` and `CAMPUSNET_ADMIN_KEY` environment variables are set in Render Dashboard.
7. **Captive Portal Upload**: Upload `login.html` and `status.html` from `hotspot/` to the router's `hotspot/` directory.
8. **Real-Money Verification**: Perform a live KSh 10 test on M-Pesa and KSh 10 test on Airtel Money from a phone with Private Wi-Fi MAC set to Fixed. Verify instant connection, 50 Mbps throughput, and session recovery.

---
**END OF FORENSIC AUDIT REPORT**

