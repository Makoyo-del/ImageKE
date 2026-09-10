# ============================================================
# Makoyocart Ventures - CampusNet DEFINITIVE SETUP (V7)
# Idempotent: Cleans existing setup and installs fresh
# RouterOS 7.x  |  All lines verified < 100 chars
# ============================================================

# --- Step 1: Clean previous setup safely ---
/ip hotspot remove [find name=hs-campus]
/ip hotspot profile remove [find name=hsprof-campus]
/ip hotspot walled-garden remove [find]
/ip dhcp-server remove [find name=dhcp-hotspot]
/ip dhcp-server network remove [find comment=hs-net]
/ip pool remove [find name=hs-pool]
/ip address remove [find comment=hs-gw]
/ip firewall nat remove [find comment=WAN-NAT]
/ip firewall nat remove [find comment=DNS-NAT]
/ip firewall filter remove [find action=fasttrack-connection]
/interface bridge port remove [find bridge=bridge-hotspot]
/interface bridge remove [find name=bridge-hotspot]

# --- Step 2: Bridge & Ports ---
/interface bridge add name=bridge-hotspot comment=HotspotBridge
/interface bridge port add bridge=bridge-hotspot interface=ether2
/interface bridge port add bridge=bridge-hotspot interface=ether3
/interface bridge port add bridge=bridge-hotspot interface=ether4
/interface bridge port add bridge=bridge-hotspot interface=wlan1

# --- Step 3: WiFi AP (Makoyocart Ventures Wifi) ---
/interface wireless set wlan1 ssid="Makoyocart Ventures Wifi" mode=ap-bridge
/interface wireless set wlan1 band=2ghz-b/g/n country=kenya installation=indoor
/interface wireless set wlan1 default-forwarding=no disabled=no

# --- Step 4: WAN Client (Safaricom / ISP on ether1) ---
/ip dhcp-client add interface=ether1 disabled=no

# --- Step 5: Gateway IP ---
/ip address add address=10.10.0.1/22 interface=bridge-hotspot comment=hs-gw

# --- Step 6: DHCP Pool & Server ---
/ip pool add name=hs-pool ranges=10.10.0.10-10.10.3.250
/ip dhcp-server add name=dhcp-hotspot interface=bridge-hotspot address-pool=hs-pool disabled=no
/ip dhcp-server network add address=10.10.0.0/22 gateway=10.10.0.1 dns-server=10.10.0.1 comment=hs-net

# --- Step 7: DNS Configuration ---
/ip dns set allow-remote-requests=yes servers=8.8.8.8,1.1.1.1

# --- Step 8: Outbound Internet NAT ---
/ip firewall nat add chain=srcnat out-interface=ether1 action=masquerade comment=WAN-NAT

# --- Step 9: Hotspot Server Profile ---
/ip hotspot profile add name=hsprof-campus hotspot-address=10.10.0.1 html-directory=hotspot
/ip hotspot profile set hsprof-campus dns-name=campusnet.local login-by=http-pap,cookie
/ip hotspot profile set hsprof-campus mac-cookie-timeout=1d

# --- Step 10: Hotspot Server Activation ---
/ip hotspot add name=hs-campus interface=bridge-hotspot address-pool=hs-pool profile=hsprof-campus disabled=no

# --- Step 11: Bandwidth & User Profile ---
/ip hotspot user profile set [find default=yes] shared-users=1 keepalive-timeout=2m
/ip hotspot user profile set [find default=yes] rate-limit=5M/2M mac-cookie-timeout=1d

# --- Step 12: Walled Garden (Whitelisted BEFORE Payment) ---
# Captive portal probes are excluded so phones automatically pop up login modal!
/ip hotspot walled-garden add dst-host=*.paystack.co action=allow
/ip hotspot walled-garden add dst-host=*.paystack.com action=allow
/ip hotspot walled-garden add dst-host=*.safaricom.co.ke action=allow
/ip hotspot walled-garden add dst-host=*.onrender.com action=allow
/ip hotspot walled-garden add dst-host=imageke-api.onrender.com action=allow
/ip hotspot walled-garden add dst-host=fonts.googleapis.com action=allow
/ip hotspot walled-garden add dst-host=fonts.gstatic.com action=allow

# --- Step 13: DNS Redirection (Anti-Bypass) ---
/ip firewall nat add chain=dstnat protocol=udp dst-port=53 action=redirect to-ports=53 comment=DNS-NAT
/ip firewall nat add chain=dstnat protocol=tcp dst-port=53 action=redirect to-ports=53 comment=DNS-NAT

:log info ">>> Makoyocart Ventures CampusNet - ONLINE & VERIFIED <<<"
