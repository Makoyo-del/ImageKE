# CLEANUP & ARCHIVAL MANIFEST: CAMPUSNET PROJECT
**Venture**: Makoyocart Ventures Wifi (`BN-WLSP9KP9`)  
**Audit & Cleanup Date**: October 31, 2026 (22:15 EAT)  
**Safety Principle**: Zero Irreversible Deletions. All legacy configurations safely quarantined in `archive_legacy_do_not_run/`.

---

## 1. Classification of Project Assets

| Classification | Description | Current Location |
|---|---|---|
| **Active Production Files** | Verified codebase running backend and portal | `DunMak/server/`, `Y3/.../hotspot/` |
| **Current Deployment Scripts** | Approved scripts to be executed during manual go-live | `Y3/.../deployment/` |
| **Historical & Deprecated Scripts** | Older scripts containing conflicting rules (18M choke, 1h timeout, etc.) | `Y3/.../mikrotik/archive_legacy_do_not_run/` |
| **Generated Manifests & Data** | Batch JSON and temporary test files | `Y3/.../mikrotik/pending_vouchers_batch.json` |
| **Testing & Regression Suite** | 25 automated unit, integration, and security tests | `DunMak/server/test_campusnet_upgrade.mjs` |

---

## 2. File Cleanup & Relocation Manifest

| File | Previous Location | Action Taken | Reason for Archiving / Relocation | Dependency Verification |
|---|---|---|---|---|
| `00_master_clean_setup.rsc` | `mikrotik/` | Archived to `archive_legacy_do_not_run/` | Contains `/ip hotspot user remove [find]` which wipes active students | Verified: Not referenced by any active scheduler |
| `01_base_hotspot_setup.rsc` | `mikrotik/` | Archived to `archive_legacy_do_not_run/` | Early setup script; superseded by `16_L009_...rsc` | Verified: No runtime imports |
| `02_self_healing_and_security.rsc` | `mikrotik/` | Archived to `archive_legacy_do_not_run/` | Legacy prototype; superseded by `16_L009_...rsc` | Verified: No runtime imports |
| `03_nuclear_reset_and_setup.rsc` | `mikrotik/` | Archived to `archive_legacy_do_not_run/` | Contains destructive `/system reset-configuration` logic | Verified: No runtime imports |
| `04_build_only.rsc` | `mikrotik/` | Archived to `archive_legacy_do_not_run/` | Partial build script; superseded | Verified: No runtime imports |
| `05_FINAL_SETUP.rsc` | `mikrotik/` | Archived to `archive_legacy_do_not_run/` | Superseded by production master | Verified: No runtime imports |
| `05_seed_vouchers.rsc` | `mikrotik/` | Archived to `archive_legacy_do_not_run/` | Legacy voucher seed containing obsolete prices | Verified: Superseded by `18_SEED_VOUCHERS_L009.rsc` |
| `06_SECURITY_HARDENING.rsc` | `mikrotik/` | Archived to `archive_legacy_do_not_run/` | Firewall rules merged into `16_L009_...rsc` | Verified: No runtime imports |
| `07_add_3day_vouchers.rsc` | `mikrotik/` | Archived to `archive_legacy_do_not_run/` | Ad-hoc voucher addition; superseded | Verified: Superseded by `18_SEED_...rsc` |
| `08_OPTIMIZE_STABILITY_AND_SPEED_CAPS.rsc` | `mikrotik/` | Archived to `archive_legacy_do_not_run/` | Contains legacy 1M/3M limits; superseded | Verified: No runtime imports |
| `09_L009_CORE_GATEWAY_SETUP.rsc` | `mikrotik/` | Archived to `archive_legacy_do_not_run/` | Early gateway script; superseded | Verified: No runtime imports |
| `10_HAP_LITE_AS_PURE_ACCESS_POINT.rsc` | `mikrotik/` | Archived to `archive_legacy_do_not_run/` | Superseded by `17_HAP_LITE_OPTIMIZED_AP.rsc` | Verified: No runtime imports |
| `11_SEED_ALL_DB_VOUCHERS_L009.rsc` | `mikrotik/` | Archived to `archive_legacy_do_not_run/` | Legacy seed file from September 2026; superseded | Verified: Superseded by `18_SEED_...rsc` |
| `12_PRESERVE_ALL_ACTIVE_STUDENTS_L009.rsc` | `mikrotik/` | Archived to `archive_legacy_do_not_run/` | Hardcoded active student list from Sep 2026 | Verified: Active students now preserved dynamically |
| `13_L009_DEFINITIVE_PRODUCTION_MASTER.rsc` | `mikrotik/` | Archived to `archive_legacy_do_not_run/` | Contains `/ip hotspot active remove [find]` and disabled MAC-cookie | Verified: Superseded by `16_L009_...rsc` |
| `14_FINAL_PRODUCTION_LOCK_IN.rsc` | `mikrotik/` | Archived to `archive_legacy_do_not_run/` | Superseded by `16_L009_...rsc` | Verified: No runtime imports |
| `15_CRITICAL_SPEED_AND_LATENCY_FIX.rsc` | `mikrotik/` | Archived to `archive_legacy_do_not_run/` | Capped WAN at 18M down / 6M up (throttling 50 Mbps line) | Verified: Superseded by `16_L009_...rsc` (48M/20M PCQ) |
| `HAP_LITE_DEFINITIVE_MASTER_FIX.rsc` | `mikrotik/` | Archived to `archive_legacy_do_not_run/` | Superseded by `17_HAP_LITE_OPTIMIZED_AP.rsc` | Verified: No runtime imports |
| `HARDENED_VOUCHER_RESTOCK_2026.rsc` | `mikrotik/` | Archived to `archive_legacy_do_not_run/` | Sets `session-timeout=1h` & `keepalive-timeout=2m` (sign-out bug) | Verified: Superseded by `18_SEED_...rsc` |
| `L009_DEFINITIVE_MASTER_FIX.rsc` | `mikrotik/` | Archived to `archive_legacy_do_not_run/` | Ad-hoc master fix; superseded | Verified: No runtime imports |
| `safe_wipe_keep_password.rsc` | `mikrotik/` | Archived to `archive_legacy_do_not_run/` | Dangerous wipe script; quarantined | Verified: Quarantined to prevent accidental run |
| `DIAGNOSTIC.md` | `mikrotik/` | Archived to `archive_legacy_do_not_run/` | Outdated documentation from earlier debugging | Verified: Superseded by `ROUTER_ACCESS_AND_MANAGEMENT_GUIDE.md` |

---

## 3. Verified Active Files Remaining in `mikrotik/`

Only the following 4 files + 1 manifest remain in the active `mikrotik/` directory:
1. [`00_DIAGNOSTICS_READONLY.rsc`](file:///c:/Users/USER/Desktop/Duncan%20Makoyo/Y3/campus_wifi_venture/mikrotik/00_DIAGNOSTICS_READONLY.rsc) (Read-only diagnostics)
2. [`16_L009_UPGRADE_50MBPS_NO_SIGNOUT_AND_REMOTE.rsc`](file:///c:/Users/USER/Desktop/Duncan%20Makoyo/Y3/campus_wifi_venture/mikrotik/16_L009_UPGRADE_50MBPS_NO_SIGNOUT_AND_REMOTE.rsc) (Zero-downtime L009 upgrade)
3. [`17_HAP_LITE_OPTIMIZED_AP.rsc`](file:///c:/Users/USER/Desktop/Duncan%20Makoyo/Y3/campus_wifi_venture/mikrotik/17_HAP_LITE_OPTIMIZED_AP.rsc) (hAP lite pure AP radio optimization)
4. [`18_SEED_VOUCHERS_L009.rsc`](file:///c:/Users/USER/Desktop/Duncan%20Makoyo/Y3/campus_wifi_venture/mikrotik/18_SEED_VOUCHERS_L009.rsc) (970 validated pool vouchers)
5. [`pending_vouchers_batch.json`](file:///c:/Users/USER/Desktop/Duncan%20Makoyo/Y3/campus_wifi_venture/mikrotik/pending_vouchers_batch.json) (Batch manifest for Stage 2 commit)

