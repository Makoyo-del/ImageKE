# ==============================================================================
# MAKOYOCART VENTURES (CAMPUSNET) - READ-ONLY DIAGNOSTICS SCRIPT (4.6)
# Target: MikroTik L009UiGS-RM (RouterOS v7)
# Guarantee: 100% READ-ONLY. Makes ZERO configuration changes and disconnects NOBODY.
# Usage: Paste into WinBox -> New Terminal before and after applying upgrades.
# ==============================================================================

:put "=================================================================="
:put "  CAMPUSNET L009 READ-ONLY HEALTH & CONFIGURATION DIAGNOSTICS"
:put "=================================================================="

:put "\r\n--- [1] SYSTEM RESOURCE, CLOCK & ROUTEROS VERSION ---"
/system resource print without-paging
/system clock print
/system routerboard print

:put "\r\n--- [2] WAN UPLINK (ether1) & DNS HEALTH ---"
/ip dhcp-client print detail where interface=ether1
/ip dns print

:put "\r\n--- [3] HOTSPOT SERVER, PROFILES & SIGN-OUT SETTINGS ---"
/ip hotspot print detail
/ip hotspot profile print detail where default=yes
/ip hotspot user profile print detail

:put "\r\n--- [4] ACTIVE SESSIONS & SEEDED VOUCHER COUNTS ---"
:put ("Active Hotspot Sessions Right Now: " . [:len [/ip hotspot active find]])
:put ("Saved MAC Cookies:                 " . [:len [/ip hotspot mac-cookie find]])
:put ("Saved HTTP Cookies:                " . [:len [/ip hotspot cookie find]])
:put ("Total Seeded Hotspot Users:        " . [:len [/ip hotspot user find]])
:put ("Users still carrying limit-uptime: " . [:len [/ip hotspot user find where limit-uptime!=0s and limit-uptime!=[:nothing]]])
/ip hotspot active print without-paging

:put "\r\n--- [5] DHCP SERVER & POOL UTILIZATION ---"
/ip dhcp-server print detail
:put ("Active Bound DHCP Leases:          " . [:len [/ip dhcp-server lease find where status="bound"]])

:put "\r\n--- [6] 50 MBPS PCQ QUEUES & BANDWIDTH SHAPING ---"
/queue type print where kind=pcq
/queue simple print detail without-paging

:put "\r\n--- [7] FIREWALL FILTER, NAT & MSS MANGLE RULES ---"
/ip firewall filter print without-paging
/ip firewall mangle print without-paging
/ip service print

:put "\r\n--- [8] REMOTE ACCESS (BACK-TO-HOME VPN & CLOUD DDNS) ---"
/ip cloud print

:put "\r\n--- [9] SYNC SCHEDULERS & RECENT LOGS ---"
/system scheduler print detail without-paging
/log print without-paging where topics~"hotspot|script|error"

:put "=================================================================="
:put "  DIAGNOSTICS COMPLETE (READ-ONLY - NO CHANGES APPLIED)"
:put "=================================================================="

