# ==============================================================================
# Makoyocart Ventures - HAP LITE AS PURE WIRELESS ACCESS POINT (ANTENNA)
# Offloads 100% of CPU: Disables NAT/DHCP/Hotspot to operate purely as Wi-Fi Radio
# ==============================================================================

# --- 1. Set System Identity ---
/system identity set name="Makoyocart-AP-Hostel"

# --- 2. Remove all local Routing/Hotspot/DHCP burdens from hAP lite ---
/ip hotspot remove [find]
/ip hotspot profile remove [find]
/ip hotspot user remove [find]
/ip hotspot user profile remove [find]
/ip hotspot walled-garden remove [find]
/ip hotspot walled-garden ip remove [find]
/ip dhcp-server remove [find]
/ip dhcp-server network remove [find]
/ip pool remove [find]
/ip firewall nat remove [find]
/ip firewall filter remove [find]

# --- 3. Create Pure Bridge across ALL Ports & Wireless ---
/interface bridge
:do { add name=bridge-ap comment="Access Point Bridge" } on-error={}

/interface bridge port
:do { add bridge=bridge-ap interface=ether1 } on-error={}
:do { add bridge=bridge-ap interface=ether2 } on-error={}
:do { add bridge=bridge-ap interface=ether3 } on-error={}
:do { add bridge=bridge-ap interface=ether4 } on-error={}
:do { add bridge=bridge-ap interface=wlan1 } on-error={}

# --- 4. Get Management IP automatically from L009 ---
/ip dhcp-client remove [find]
/ip dhcp-client add interface=bridge-ap disabled=no comment="L009-DHCP-Client"

# --- 5. High-Power Wireless Configuration ---
/interface wireless enable wlan1
/interface wireless set wlan1 \
    mode=ap-bridge \
    ssid="Makoyocart Ventures Wifi" \
    band=2ghz-b/g/n \
    channel-width=20/40mhz-XX \
    frequency=2412 \
    wireless-protocol=802.11 \
    country=kenya \
    installation=indoor \
    default-forwarding=yes \
    hide-ssid=no

:log info ">>> Makoyocart Ventures hAP Lite is now a Pure High-Speed Access Point! <<<"
