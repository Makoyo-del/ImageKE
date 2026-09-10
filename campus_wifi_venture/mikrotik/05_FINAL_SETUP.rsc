# ============================================================
# Makoyocart Ventures - CampusNet DEFINITIVE SETUP
# RouterOS 7.x  |  All lines verified < 120 chars
# STEP 1: Run RESET first (safe_wipe_keep_password.rsc)
# STEP 2: DRAG this file to WinBox Files (root, not subfolder)
# STEP 3: In WinBox Terminal type: /import file-name=05_FINAL_SETUP.rsc
# ============================================================

# --- Bridge & Ports ---
/interface bridge add name=bridge-hotspot comment=HotspotBridge
/interface bridge port add bridge=bridge-hotspot interface=ether2
/interface bridge port add bridge=bridge-hotspot interface=ether3
/interface bridge port add bridge=bridge-hotspot interface=ether4
/interface bridge port add bridge=bridge-hotspot interface=wlan1

# --- WiFi SSID (Makoyocart Ventures Wifi) ---
/interface wireless set wlan1 ssid="Makoyocart Ventures Wifi" mode=ap-bridge
/interface wireless set wlan1 band=2ghz-b/g/n disabled=no
/interface wireless set wlan1 default-forwarding=no

# --- WAN (Internet from Safaricom router) ---
/ip dhcp-client add interface=ether1 disabled=no

# --- LAN IP for this router ---
/ip address add address=10.10.0.1/22 interface=bridge-hotspot

# --- DHCP Pool & Server ---
/ip pool add name=hs-pool ranges=10.10.0.10-10.10.3.250
/ip dhcp-server add name=dhcp-hotspot interface=bridge-hotspot address-pool=hs-pool disabled=no
/ip dhcp-server network add address=10.10.0.0/22 gateway=10.10.0.1 dns-server=10.10.0.1

# --- DNS ---
/ip dns set allow-remote-requests=yes servers=8.8.8.8,8.8.4.4

# --- NAT Masquerade (outbound internet) ---
/ip firewall nat add chain=srcnat out-interface=ether1 action=masquerade comment=WAN-Masquerade

# --- Hotspot Profile (split into 2 lines - under 120 chars each) ---
/ip hotspot profile add name=hsprof-campus hotspot-address=10.10.0.1 html-directory=hotspot
/ip hotspot profile set hsprof-campus dns-name=campusnet.local login-by=http-pap,cookie
/ip hotspot profile set hsprof-campus mac-cookie-timeout=1d

# --- Hotspot Server ---
/ip hotspot add name=hs-campus interface=bridge-hotspot address-pool=hs-pool profile=hsprof-campus

# --- Default User Profile ---
/ip hotspot user profile set [find default=yes] shared-users=1 keepalive-timeout=2m
/ip hotspot user profile set [find default=yes] rate-limit=3M/1M mac-cookie-timeout=1d

# --- Walled Garden (free access BEFORE payment) ---
/ip hotspot walled-garden add dst-host=*.paystack.co action=allow
/ip hotspot walled-garden add dst-host=*.paystack.com action=allow
/ip hotspot walled-garden add dst-host=*.safaricom.co.ke action=allow
/ip hotspot walled-garden add dst-host=*.onrender.com action=allow
/ip hotspot walled-garden add dst-host=imageke-api.onrender.com action=allow
/ip hotspot walled-garden add dst-host=api.duncanmakoyo.com action=allow
/ip hotspot walled-garden add dst-host=captive.apple.com action=allow
/ip hotspot walled-garden add dst-host=connectivitycheck.gstatic.com action=allow
/ip hotspot walled-garden add dst-host=connectivitycheck.android.com action=allow
/ip hotspot walled-garden add dst-host=www.msftconnecttest.com action=allow

# --- DNS Anti-Bypass (force all DNS through router) ---
/ip firewall nat add chain=dstnat protocol=udp dst-port=53 action=redirect to-ports=53

:log info "Makoyocart Ventures CampusNet - ONLINE!"
