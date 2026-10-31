# ==============================================================================
# Makoyocart Ventures Wifi - Master Provisioning Script
# Validated for RouterOS v7.17.2 on MikroTik hAP lite
# Business Reg: BN-WLSP9KP9 | SSID: Makoyocart Ventures Wifi
# ==============================================================================

# 1. Create LAN Bridge
/interface bridge add name=bridge-hotspot comment="Hotspot Bridge"

# 2. Add Ports to Bridge (ether2, ether3, ether4, wlan1)
/interface bridge port add bridge=bridge-hotspot interface=ether2
/interface bridge port add bridge=bridge-hotspot interface=ether3
/interface bridge port add bridge=bridge-hotspot interface=ether4
/interface bridge port add bridge=bridge-hotspot interface=wlan1

# 3. Configure Wi-Fi with official SSID
/interface wireless set wlan1 ssid="Makoyocart Ventures Wifi" mode=ap-bridge band=2ghz-b/g/n disabled=no default-forwarding=no

# 4. Enable DHCP Client on Port 1 (WAN from Safaricom router)
/ip dhcp-client add interface=ether1 disabled=no comment="WAN from Safaricom"

# 5. Hotspot Gateway IP
/ip address add address=10.10.0.1/22 interface=bridge-hotspot network=10.10.0.0

# 6. DHCP Pool and Server for Student Devices
/ip pool add name=hs-pool ranges=10.10.0.10-10.10.3.250
/ip dhcp-server add name=dhcp-hotspot interface=bridge-hotspot address-pool=hs-pool disabled=no lease-time=1h
/ip dhcp-server network add address=10.10.0.0/22 gateway=10.10.0.1 dns-server=10.10.0.1

# 7. DNS Server & Static Hostname
/ip dns set allow-remote-requests=yes servers=8.8.8.8,8.8.4.4
/ip dns static add name=campusnet.local address=10.10.0.1

# 8. Firewall NAT (Internet Sharing + DNS Anti-Bypass)
/ip firewall nat add chain=srcnat out-interface=ether1 action=masquerade comment="WAN Masquerade"
/ip firewall nat add chain=dstnat protocol=udp dst-port=53 action=redirect to-ports=53 comment="Force internal DNS"

# 9. Hotspot Profile (Atomic split lines under terminal wrap limits)
/ip hotspot profile add name=hsprof-campus hotspot-address=10.10.0.1 html-directory=hotspot
/ip hotspot profile set [find name="hsprof-campus"] dns-name=campusnet.local login-by=http-pap,cookie,mac-cookie

# 10. Hotspot Server (Active on bridge-hotspot)
/ip hotspot add name=hs-campus interface=bridge-hotspot address-pool=hs-pool profile=hsprof-campus disabled=no

# 11. User Profile (Bandwidth shaper 3Mbps / 1Mbps & Single-Device MAC Binding)
/ip hotspot user profile set [find default=yes] shared-users=1 keepalive-timeout=2m rate-limit=3M/1M mac-cookie-timeout=1d

# 12. Walled Garden (Allow Paystack, Safaricom, DunMak API, OS Captive Checks)
/ip hotspot walled-garden add dst-host=*.paystack.co action=allow
/ip hotspot walled-garden add dst-host=*.paystack.com action=allow
/ip hotspot walled-garden add dst-host=*.safaricom.co.ke action=allow
/ip hotspot walled-garden add dst-host=*.daraja.co.ke action=allow
/ip hotspot walled-garden add dst-host=*.onrender.com action=allow
/ip hotspot walled-garden add dst-host=*.duncanmakoyo.com action=allow
/ip hotspot walled-garden add dst-host=captive.apple.com action=allow
/ip hotspot walled-garden add dst-host=connectivitycheck.gstatic.com action=allow
/ip hotspot walled-garden add dst-host=connectivitycheck.android.com action=allow
/ip hotspot walled-garden add dst-host=www.msftconnecttest.com action=allow

# 13. Enable Cloud DDNS for Remote Management
/ip cloud set ddns-enabled=yes

:log info ">>> Makoyocart Ventures Wifi: Setup Complete and Online! <<<"
