# ==============================================================================
# MAKOYOCART VENTURES - L009 & HAP LITE SPEED & STABILITY HOTFIX
# Targets: Fixes same-room buffering, 2.4 GHz packet collision, MTU drops & bufferbloat
# ==============================================================================

# ──────────────────────────────────────────────────────────────────────────────
# SECTION 1: RUN THIS ON THE MIKROTIK L009 CORE GATEWAY (WinBox Terminal)
# ──────────────────────────────────────────────────────────────────────────────

:log info ">>> Applying L009 Speed & Stability Optimizations... <<<"

# 1. ELIMINATE 1:1 NAT CONFLICT (Crucial for DHCP stability)
# Hotspot must NOT manage an address pool when DHCP server is active
/ip hotspot set [find] address-pool=none

# 2. FIX SAFARICOM 4G/5G CELLULAR MTU BLACK HOLE (TCP MSS CLAMPING)
# Cellular LTE/5G tunnels drop 1500-byte packets. Clamping MSS prevents stalled pages.
/ip firewall mangle remove [find comment="Clamp MSS for Safaricom 4G/5G"]
/ip firewall mangle add chain=forward protocol=tcp tcp-flags=syn tcp-mss=1400-65535 action=change-mss new-mss=clamp-to-pmtu passthrough=yes comment="Clamp MSS for Safaricom 4G/5G"

# 3. ALLOW ANDROID PRIVATE DNS (PORT 853 DoT)
# Prevents Android 11-15 phones from saying "Connected, no internet" or freezing DNS
/ip firewall filter remove [find comment="Allow DoT Private DNS"]
:do {
  /ip firewall filter add chain=forward in-interface=bridge-hotspot protocol=tcp dst-port=853 action=accept place-before=1 comment="Allow DoT Private DNS"
} on-error={
  /ip firewall filter add chain=forward in-interface=bridge-hotspot protocol=tcp dst-port=853 action=accept comment="Allow DoT Private DNS"
}

# 4. REMOVE FASTTRACK (FastTrack breaks Hotspot queue enforcement and packet tracking)
/ip firewall filter remove [find action=fasttrack-connection]

# 5. PREVENT SAFARICOM 15-20M BUFFERBLOAT (Fair-Share PCQ Queue)
# When the 20M pipe hits 100%, ping explodes to 2000ms. 
# This Smart Queue guarantees fair bandwidth so 1 user streaming won't lag everyone else.
/queue type remove [find name="campusnet-pcq-down"]
/queue type remove [find name="campusnet-pcq-up"]
/queue type add name="campusnet-pcq-down" kind=pcq pcq-rate=3M pcq-classifier=dst-address
/queue type add name="campusnet-pcq-up" kind=pcq pcq-rate=1M pcq-classifier=src-address
/queue simple remove [find name="WAN-Bandwidth-Manager"]
/queue simple add name="WAN-Bandwidth-Manager" target=10.10.0.0/22 max-limit=6M/18M queue=campusnet-pcq-up/campusnet-pcq-down comment="Fair-Share WAN Bufferbloat Protection"

# 6. INCREASE DNS CACHE & UPSTREAM RESILIENCE
/ip dns set cache-size=8192KiB cache-max-ttl=1d servers=8.8.8.8,1.1.1.1,208.67.222.222

:log info ">>> L009 Speed & Stability Optimizations Successfully Applied! <<<"


# ──────────────────────────────────────────────────────────────────────────────
# SECTION 2: RUN THIS ON THE HAP LITE ACCESS POINT (WinBox Terminal)
# ──────────────────────────────────────────────────────────────────────────────
# 1. Fix Channel Width: Change from 20/40MHz to strict 20MHz
#    40MHz in a crowded hostel with other routers causes 50%+ packet loss.
# 2. Fix Frequency: Use clean Channel 1 (2412) or Channel 6 (2437)
/interface wireless set wlan1 \
    channel-width=20mhz \
    frequency=2412 \
    band=2ghz-b/g/n \
    wireless-protocol=802.11 \
    installation=indoor \
    country=kenya

:log info ">>> hAP Lite Wireless cleaned to 20MHz! Interference drastically reduced. <<<"
