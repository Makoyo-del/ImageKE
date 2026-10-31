# ==============================================================================
# ROUTER 2: MIKROTIK HAP LITE ACCESS POINT (Makoyocart-AP-Hostel)
# Pure Wireless Antenna & Radio Clean-Up Script (RouterOS 7)
# Run in: WinBox -> Makoyocart-AP-Hostel -> New Terminal
# ==============================================================================

:log info ">>> Starting hAP Lite Radio Clean-Up... <<<"

# 1. CLEAN UP UNNECESSARY SERVICES (Offload CPU to 0% idle)
/ip hotspot remove [find]
/ip hotspot profile remove [find]
/ip dhcp-server remove [find]
/ip dhcp-server network remove [find]
/ip pool remove [find]
/ip firewall nat remove [find]
/ip firewall filter remove [find]

# 2. ENSURE ALL PORTS & WIRELESS ARE IN PURE BRIDGE
/interface bridge
:do { add name=bridge-ap comment="Access Point Bridge" } on-error={}

/interface bridge port
:do { add bridge=bridge-ap interface=ether1 hw=yes } on-error={}
:do { add bridge=bridge-ap interface=ether2 hw=yes } on-error={}
:do { add bridge=bridge-ap interface=ether3 hw=yes } on-error={}
:do { add bridge=bridge-ap interface=ether4 hw=yes } on-error={}
:do { add bridge=bridge-ap interface=wlan1 } on-error={}

# 3. GET MANAGEMENT IP FROM L009
/ip dhcp-client remove [find]
/ip dhcp-client add interface=bridge-ap disabled=no comment="L009-DHCP-Client"

# 4. OPTIMIZED HIGH-STABILITY 20MHz WIRELESS SETTINGS
# 20MHz eliminates 80% of radio collisions in crowded rooms
/interface wireless enable wlan1
/interface wireless set wlan1 \
    mode=ap-bridge \
    ssid="Makoyocart Ventures Wifi" \
    band=2ghz-b/g/n \
    channel-width=20mhz \
    frequency=2412 \
    wireless-protocol=802.11 \
    country=kenya \
    installation=indoor \
    default-forwarding=yes \
    hide-ssid=no

:log info ">>> hAP Lite Pure Access Point Successfully Applied! <<<"
