# ==============================================================================
# MAKOYOCART VENTURES (CAMPUSNET) - HAP LITE OPTIMIZED PURE ACCESS POINT (Phase 4)
# Target: MikroTik hAP lite (RB941-2nD) acting as Pure Bridge Access Point
#
# GUARANTEES:
# 1. Pure Layer-2 Bridge to L009 (zero double-NAT, zero local DHCP/Hotspot CPU load).
# 2. Clean 20 MHz 2.4 GHz radio channel + extended disconnect-timeout (15s) and
#    on-fail-retry-time (500ms) so hostel walls or phone power-save do not drop Wi-Fi.
# 3. RAM-only logging to protect the 16 MB flash memory from wear.
# ==============================================================================

{
:local wifiSsid "Makoyocart Ventures Wifi"
:local wifiFreq 2412

:log info ">>> [CampusNet AP] Applying hAP lite Pure Access Point Optimization... <<<"

# 1. System Identity & RAM-only Logging (protects 16MB flash)
/system identity set name="Makoyocart-AP-Hostel"
/system clock set time-zone-name=Africa/Nairobi
:do { /system logging action set memory memory-lines=200 } on-error={}
:do { /system logging set [find where action=disk] action=memory } on-error={}

# 2. Ensure zero local Hotspot / DHCP Server / NAT / Firewall Filter overhead on the AP
:do { /ip hotspot remove [find] } on-error={}
:do { /ip dhcp-server remove [find] } on-error={}
:do { /ip firewall nat remove [find] } on-error={}
:do { /ip firewall filter remove [find] } on-error={}

# 3. Ensure Pure Bridge across ether1-ether4 + wlan1
:if ([:len [/interface bridge find where name="bridge-ap"]] = 0) do={
    /interface bridge add name=bridge-ap protocol-mode=rstp comment="Pure AP Layer-2 Bridge"
}
:foreach iface in={"ether1";"ether2";"ether3";"ether4";"wlan1"} do={
    :if ([:len [/interface bridge port find where interface=$iface]] = 0) do={
        :do { /interface bridge port add bridge=bridge-ap interface=$iface } on-error={}
    }
}

# 4. Optimize 2.4 GHz Radio for Hostel Density & Phone Sleep Stability
/interface wireless enable wlan1
/interface wireless set wlan1 \
    mode=ap-bridge \
    ssid=$wifiSsid \
    band=2ghz-b/g/n \
    channel-width=20mhz \
    frequency=$wifiFreq \
    wireless-protocol=802.11 \
    country=kenya \
    installation=indoor \
    wps-mode=disabled \
    default-forwarding=yes \
    multicast-helper=full \
    wmm-support=enabled \
    disconnect-timeout=15s \
    on-fail-retry-time=500ms \
    max-station-count=120 \
    hide-ssid=no

:log info ">>> [CampusNet AP] hAP lite Optimized Pure Access Point Ready! <<<"
}

