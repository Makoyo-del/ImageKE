# ==============================================================================
# MAKOYOCART VENTURES (CAMPUSNET) - HAP LITE PURE AP (50 MBPS UNTHROTTLED BRIDGE)
# Target: MikroTik hAP lite (RB941-2nD)
#
# GUARANTEES:
# 1. Pure Layer-2 Bridge to L009: Removes all local Queues, Hotspot, DHCP Server,
#    NAT, and Firewall rules on the hAP lite so it passes the full 50 Mbps from L009
#    with zero CPU bottleneck or double-shaping.
# 2. High-Throughput 2.4 GHz Radio: 2ghz-g/n (drops legacy 802.11b airtime drag),
#    WMM enabled, disconnect-timeout=15s, and on-fail-retry-time=500ms so sleeping
#    phones and thick hostel walls never cause random disconnects.
# 3. RAM-only logging to protect the 16 MB flash memory.
# ==============================================================================

{
:local wifiSsid "Makoyocart Ventures Wifi"
:local wifiFreq 2412

:log info ">>> [CampusNet AP] Applying hAP lite 50Mbps Pure Access Point Config... <<<"

# 1. System Identity & RAM-only Logging (protects 16MB flash)
/system identity set name="Makoyocart-AP-Hostel"
/system clock set time-zone-name=Africa/Nairobi
:do { /system logging action set memory memory-lines=200 } on-error={}
:do { /system logging set [find where action=disk] action=memory } on-error={}

# 2. Remove ALL local queues, Hotspot, DHCP Server, NAT & Firewall on the AP
#    (All 50 Mbps bandwidth shaping & Hotspot auth is handled by the L009 Core)
:do { /queue simple remove [find] } on-error={}
:do { /queue tree remove [find] } on-error={}
:do { /ip hotspot remove [find] } on-error={}
:do { /ip dhcp-server remove [find] } on-error={}
:do { /ip firewall nat remove [find] } on-error={}
:do { /ip firewall filter remove [find] } on-error={}
:do { /ip firewall mangle remove [find] } on-error={}

# 3. Ensure a single clean Layer-2 Bridge across ether1-ether4 + wlan1
:local brName "bridge-ap"
:if ([:len [/interface bridge find]] > 0) do={
    :set brName [/interface bridge get [pick [/interface bridge find] 0] name]
} else={
    /interface bridge add name=$brName protocol-mode=rstp comment="Pure AP 50Mbps Layer-2 Bridge"
}

:foreach iface in={"ether1";"ether2";"ether3";"ether4";"wlan1"} do={
    :if ([:len [/interface bridge port find where interface=$iface]] = 0) do={
        :do { /interface bridge port add bridge=$brName interface=$iface } on-error={}
    }
}

# Ensure DHCP client is on the bridge so the hAP lite remains reachable by IP from L009
:if ([:len [/ip dhcp-client find where interface=$brName]] = 0) do={
    :do { /ip dhcp-client add interface=$brName disabled=no } on-error={}
}

# 4. Optimize 2.4 GHz Radio for Maximum 2.4GHz Speeds & Hostel Stability
/interface wireless enable wlan1
/interface wireless set wlan1 \
    mode=ap-bridge \
    ssid=$wifiSsid \
    band=2ghz-g/n \
    channel-width=20mhz \
    frequency=$wifiFreq \
    wireless-protocol=802.11 \
    country=kenya \
    installation=indoor \
    wps-mode=disabled \
    default-forwarding=no \
    multicast-helper=full \
    wmm-support=enabled \
    disconnect-timeout=15s \
    on-fail-retry-time=500ms \
    max-station-count=120 \
    hide-ssid=no

:log info ">>> [CampusNet AP] hAP lite 50Mbps Pure Access Point Ready! <<<"
}
