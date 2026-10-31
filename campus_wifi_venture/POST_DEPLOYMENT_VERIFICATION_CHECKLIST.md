# POST-DEPLOYMENT VERIFICATION CHECKLIST
**Venture**: Makoyocart Ventures Wifi (`BN-WLSP9KP9`)  
**Deployment Date**: October 31, 2026 (Live Cutover)  
**Location**: Hostel Gateway, Kisii, Kenya  
**Goal**: Flawless 50 Mbps Safaricom experience with zero student disconnections and instant mobile money activation.

---

## Pre-Flight Verification Checklist (Before Running Any Scripts)
- [ ] **Laptop Connection**: Laptop plugged into **Port 8 (`ether8`)** on the MikroTik L009.
- [ ] **Laptop IPv4**: Ethernet adapter set to DHCP (assigned IP in `192.168.88.x`).
- [ ] **WinBox Access**: Connected to `192.168.88.1` with admin credentials.
- [ ] **Safe Mode Engaged**: Clicked the **Safe Mode** button in WinBox toolbar (`Ctrl + X`).
- [ ] **Backup Taken**: Created and downloaded `before_upgrade_backup.backup` and `before_upgrade_export.rsc`.
- [ ] **Diagnostics Baseline**: Pasted `00_DIAGNOSTICS_READONLY.rsc` into terminal; recorded active user count: `_____`.

---

## Live Hardware Execution Checklist
- [ ] **Step 1: L009 In-Place Upgrade**:
  - Pasted `deployment/03_router_l009/16_L009_UPGRADE_50MBPS_NO_SIGNOUT_AND_REMOTE.rsc` into L009 WinBox Terminal.
  - Verified no error messages in terminal.
  - Confirmed active students are still online in **IP -> Hotspot -> Active**.
  - Clicked **Safe Mode** to commit changes permanently.
- [ ] **Step 2: hAP lite Radio Optimization**:
  - Connected to hAP lite in WinBox.
  - Pasted `deployment/04_router_hap_lite/17_HAP_LITE_OPTIMIZED_AP.rsc` into Terminal.
  - Verified 2.4 GHz radio configured to clean 20 MHz channel width.
- [ ] **Step 3: Voucher Pool Seeding onto L009**:
  - In WinBox -> **Files**, uploaded `deployment/02_voucher_restock/18_SEED_VOUCHERS_L009.rsc`.
  - In Terminal, ran:
    ```routeros
    /import file-name=18_SEED_VOUCHERS_L009.rsc
    ```
  - Verified in **IP -> Hotspot -> Users** that total users count is ~970.
  - Ran cleanup in Terminal:
    ```routeros
    /file remove [find name="18_SEED_VOUCHERS_L009.rsc"]
    ```

---

## Supabase & Backend Deployment Checklist
- [ ] **Step 4: Supabase DDL Migrations**:
  - In Supabase SQL Editor, ran `01_PRE_DEPLOYMENT_HEALTH_CHECK.sql`.
  - In Supabase SQL Editor, ran `02_SCHEMA_INDEXES_AND_PERFORMANCE.sql`.
  - In Supabase SQL Editor, ran `03_ALIGN_EXISTING_POOL_PRICING.sql`.
- [ ] **Step 5: Voucher Pool Commit**:
  - In Laptop PowerShell, executed:
    ```powershell
    node deployment/02_voucher_restock/restock_vouchers_v2.mjs --commit
    ```
  - Confirmed terminal reported `Committed to Supabase DB: YES (628 inserted)`.
  - In Supabase SQL Editor, ran `04_POST_DEPLOYMENT_VERIFICATION.sql`; confirmed zero duplicate codes and zero active session drops.
- [ ] **Step 6: Render Backend Deploy**:
  - Pushed updated backend to GitHub repository (`git push origin main`).
  - Verified Render Dashboard build succeeded for `imageke-api`.
  - Confirmed `ROUTER_SYNC_SECRET_KEY` and `CAMPUSNET_ADMIN_KEY` environment variables are set in Render.

---

## Captive Portal Upload Checklist
- [ ] **Step 7: Hotspot HTML Replacement**:
  - In WinBox -> **Files**, navigated to the `hotspot/` directory.
  - Dragged-and-dropped new `login.html`, `status.html`, and `alogin.html` from `deployment/05_captive_portal/` into `hotspot/`.
  - Cleared browser cache on test smartphone.

---

## Real-Money End-to-End Verification Checklist
- [ ] **Test 1: Portal UI Verification (Smartphone)**:
  - Connected test phone to Wi-Fi SSID: `Makoyocart Ventures Wifi`.
  - Captive portal opened automatically.
  - Verified top header displays: `50 MBPS SAFARICOM 5G`.
  - Verified all 7 packages displayed with exact Option A prices (10, 20, 30, 50, 100, 180, 500).
  - Verified Night Owl package shows correct open/closed status for current EAT time.
  - Verified zero mentions of "pauses when disconnected".
- [ ] **Test 2: Safaricom M-Pesa Payment (KSh 10)**:
  - Selected `1 Hour Flash Pass (KSh 10)`.
  - Selected `M-Pesa` pill; typed phone number `07XXXXXXXX`.
  - Tapped `Pay KSh 10 via M-Pesa`.
  - STK push received on phone screen within 3–6 seconds.
  - Entered PIN; payment completed.
  - Portal automatically transitioned: `✓ Connected! Enjoy 50 Mbps Wi-Fi`.
  - Device authenticated into RouterOS without typing username or password.
- [ ] **Test 3: Airtel Money Payment (KSh 10)**:
  - Connected an Airtel-line phone.
  - Selected `1 Hour Flash Pass (KSh 10)`.
  - Selected `Airtel Money` pill; typed phone number `073XXXXXXX` or `075XXXXXXX`.
  - Tapped `Pay KSh 10 via Airtel Money`.
  - Airtel Money USSD PIN prompt received.
  - Entered PIN; verified instant connection.
- [ ] **Test 4: Speed & Latency Test (50 Mbps Proof)**:
  - Opened `fast.com` or `speedtest.net` on connected phone.
  - Measured download speed: confirmed bursts up to `8 Mbps` per user (and aggregate line up to `48–50 Mbps`).
  - Verified latency is stable under load (fair-share PCQ bufferbloat prevention working).
- [ ] **Test 5: Screen-Lock Persistence Test (Fixing "Signing Out Anyhow")**:
  - Locked phone screen for 15 minutes.
  - Walked to hostel room and returned.
  - Unlocked phone: verified Wi-Fi reconnected instantly with **zero captive portal popup** (MAC-cookie 30d auto-login working).
- [ ] **Test 6: Welcome-Back 1-Tap Reconnect Test**:
  - On a phone that cleared its MAC or forgot Wi-Fi, opened `http://campusnet.local/login.html`.
  - Welcome-Back banner appeared automatically: `✨ Welcome Back! Tap to Reconnect Now`.
  - Tapped once: session restored in 1 second without paying again.

