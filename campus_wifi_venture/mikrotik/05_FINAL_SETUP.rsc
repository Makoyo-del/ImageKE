# ============================================================
# Makoyocart Ventures - CampusNet DEFINITIVE SETUP (V9)
# Optimized for 15 Mbps High Speed & Instant M-Pesa STK Push
# ============================================================

# --- Step 1: Ensure Bridge & Ports exist without dropping connection ---
/interface bridge
:do { add name=bridge-hotspot comment=HotspotBridge } on-error={}

/interface bridge port
:do { add bridge=bridge-hotspot interface=ether2 } on-error={}
:do { add bridge=bridge-hotspot interface=ether3 } on-error={}
:do { add bridge=bridge-hotspot interface=ether4 } on-error={}
:do { add bridge=bridge-hotspot interface=wlan1 } on-error={}

# --- Step 2: Gateway IP & WAN DHCP Client ---
:do { /ip address add address=10.10.0.1/22 interface=bridge-hotspot } on-error={}
:do { /ip dhcp-client add interface=ether1 disabled=no } on-error={}

# --- Step 3: Clean previous Hotspot & DHCP services cleanly ---
/ip hotspot remove [find]
/ip hotspot profile remove [find name!=default]
/ip hotspot user remove [find name!=admin]
/ip hotspot user profile remove [find name!=default]
/ip hotspot walled-garden remove [find]
/ip hotspot walled-garden ip remove [find]
/ip dhcp-server remove [find]
/ip dhcp-server network remove [find]
/ip pool remove [find name=hs-pool]
/ip firewall nat remove [find comment=WAN-NAT]
/ip firewall nat remove [find comment=DNS-NAT]
/ip firewall filter remove [find action=fasttrack-connection]

# --- Step 4: Configure WiFi AP ---
/interface wireless set wlan1 ssid="Makoyocart Ventures Wifi" mode=ap-bridge
/interface wireless set wlan1 band=2ghz-b/g/n country=kenya installation=indoor
/interface wireless set wlan1 default-forwarding=no disabled=no

# --- Step 5: Setup DHCP Pool & Server (1,000+ IP capacity) ---
/ip pool add name=hs-pool ranges=10.10.0.10-10.10.3.250
/ip dhcp-server add name=dhcp-hotspot interface=bridge-hotspot address-pool=hs-pool disabled=no
/ip dhcp-server network add address=10.10.0.0/22 gateway=10.10.0.1 dns-server=10.10.0.1

# --- Step 6: DNS & Outbound NAT ---
/ip dns set allow-remote-requests=yes servers=8.8.8.8,1.1.1.1
/ip firewall nat add chain=srcnat out-interface=ether1 action=masquerade comment=WAN-NAT

# --- Step 7: Hotspot Server Profile & Server ---
/ip hotspot profile add name=hsprof-campus hotspot-address=10.10.0.1 html-directory=hotspot
/ip hotspot profile set [find name=hsprof-campus] dns-name=campusnet.local login-by=http-pap,cookie
/ip hotspot add name=hs-campus interface=bridge-hotspot address-pool=hs-pool profile=hsprof-campus disabled=no

# --- Step 8: Full 15 Mbps Bandwidth Speed Profile ---
/ip hotspot user profile set [find default=yes] shared-users=1 keepalive-timeout=2m rate-limit=15M/5M

# --- Step 9: Walled Garden HTTP (Port 80) ---
/ip hotspot walled-garden add dst-host=*.paystack.co action=allow
/ip hotspot walled-garden add dst-host=*.paystack.com action=allow
/ip hotspot walled-garden add dst-host=*.safaricom.co.ke action=allow
/ip hotspot walled-garden add dst-host=*.onrender.com action=allow
/ip hotspot walled-garden add dst-host=imageke-api.onrender.com action=allow
/ip hotspot walled-garden add dst-host=fonts.googleapis.com action=allow
/ip hotspot walled-garden add dst-host=fonts.gstatic.com action=allow

# --- Step 10: Walled Garden IP (Port 443 HTTPS - Instant STK Push) ---
/ip hotspot walled-garden ip add dst-host=imageke-api.onrender.com action=accept
/ip hotspot walled-garden ip add dst-host=*.onrender.com action=accept
/ip hotspot walled-garden ip add dst-host=api.paystack.co action=accept
/ip hotspot walled-garden ip add dst-host=*.paystack.co action=accept
/ip hotspot walled-garden ip add dst-host=*.paystack.com action=accept
/ip hotspot walled-garden ip add dst-host=*.safaricom.co.ke action=accept

# --- Step 11: DNS Anti-Bypass Redirection ---
/ip firewall nat add chain=dstnat protocol=udp dst-port=53 action=redirect to-ports=53 comment=DNS-NAT
/ip firewall nat add chain=dstnat protocol=tcp dst-port=53 action=redirect to-ports=53 comment=DNS-NAT

:log info ">>> Makoyocart Ventures CampusNet - 15 MBPS ONLINE & READY <<<"
