# ==============================================================================
# ROUTER 1: MIKROTIK L009 CORE GATEWAY (Makoyocart-L009-Core)
# Complete Definitive Speed, Stability, MTU & Latency Fix (RouterOS 7)
# Run in: WinBox -> Makoyocart-L009-Core -> New Terminal
# ==============================================================================

:log info ">>> Starting L009 Definitive Speed & Latency Fix... <<<"

# 1. ELIMINATE 1:1 NAT CONFLICT (Crucial for DHCP stability)
# Hotspot must NOT manage an address pool when DHCP server is active
/ip hotspot set [find] address-pool=none

# 2. FIX SAFARICOM 4G/5G CELLULAR MTU BLACK HOLE (TCP MSS CLAMPING)
# Cellular LTE/5G tunnels drop 1500-byte packets. Clamping MSS prevents stalled pages.
/ip firewall mangle remove [find comment="Clamp MSS for Safaricom 4G/5G"]
/ip firewall mangle add chain=forward protocol=tcp tcp-flags=syn tcp-mss=1400-65535 action=change-mss new-mss=clamp-to-pmtu passthrough=yes comment="Clamp MSS for Safaricom 4G/5G"

# 3. ALLOW ANDROID PRIVATE DNS (PORT 853 DoT)
# Prevents Android 10-15 phones from reporting "No internet" or freezing DNS resolution
/ip firewall filter remove [find comment="Allow DoT Private DNS"]
:do {
  /ip firewall filter add chain=forward in-interface=bridge-hotspot protocol=tcp dst-port=853 action=accept place-before=1 comment="Allow DoT Private DNS"
} on-error={
  /ip firewall filter add chain=forward in-interface=bridge-hotspot protocol=tcp dst-port=853 action=accept comment="Allow DoT Private DNS"
}

# 4. REMOVE FASTTRACK
# FastTrack bypasses Hotspot queues and breaks per-user rate limiting
/ip firewall filter remove [find action=fasttrack-connection]

# 5. PREVENT SAFARICOM 15-20M BUFFERBLOAT (Fair-Share PCQ Queue Engine)
# Keeps ping under 40ms even when multiple students stream video at the same time
/queue type remove [find name="campusnet-pcq-down"]
/queue type remove [find name="campusnet-pcq-up"]
/queue type add name="campusnet-pcq-down" kind=pcq pcq-rate=3M pcq-classifier=dst-address
/queue type add name="campusnet-pcq-up" kind=pcq pcq-rate=1M pcq-classifier=src-address
/queue simple remove [find name="WAN-Bandwidth-Manager"]
/queue simple add name="WAN-Bandwidth-Manager" target=10.10.0.0/22 max-limit=6M/18M queue=campusnet-pcq-up/campusnet-pcq-down comment="Fair-Share WAN Bufferbloat Protection"

# 6. HIGH-PERFORMANCE DNS ENGINE & RAM LOGGING
/ip dns set allow-remote-requests=yes cache-size=8192KiB cache-max-ttl=1d servers=8.8.8.8,1.1.1.1,208.67.222.222
/system logging action set [find name=memory] memory-lines=100

:log info ">>> L009 Definitive Fix Successfully Applied! <<<"
