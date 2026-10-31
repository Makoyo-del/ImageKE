# CampusNet NUCLEAR RESET - Full Clean Hotspot Config
# RouterOS 7.x Compatible - Run this in a CLEAN fresh WinBox Terminal
# Copy ENTIRE block below and right-click-paste in Terminal

/ip address remove [find]
/ip dhcp-server remove [find]
/ip dhcp-server network remove [find]
/ip pool remove [find]
/ip hotspot remove [find]
/ip hotspot profile remove [find name!=default]
/ip hotspot user remove [find]
/ip hotspot walled-garden remove [find]
/interface bridge port remove [find]
/interface bridge remove [find]
/ip firewall nat remove [find comment="WAN Masquerade"]

# Bridge for Hotspot LAN (all ports except ether1)
/interface bridge add name=bridge-hotspot

/interface bridge port
add bridge=bridge-hotspot interface=ether2
add bridge=bridge-hotspot interface=ether3
add bridge=bridge-hotspot interface=ether4
add bridge=bridge-hotspot interface=wlan1

# Wi-Fi SSID
/interface wireless set wlan1 ssid="CampusNet_Hostel_WiFi" mode=ap-bridge band=2ghz-b/g/n disabled=no default-forwarding=no

# WAN DHCP on Port 1 (Safaricom)
/ip dhcp-client add interface=ether1 disabled=no

# Hotspot Gateway IP
/ip address add address=10.10.0.1/22 interface=bridge-hotspot

# DHCP Pool for Students
/ip pool add name=hs-pool ranges=10.10.0.10-10.10.3.250
/ip dhcp-server add name=dhcp-hotspot interface=bridge-hotspot address-pool=hs-pool disabled=no
/ip dhcp-server network add address=10.10.0.0/22 gateway=10.10.0.1 dns-server=10.10.0.1

# DNS
/ip dns set allow-remote-requests=yes servers=8.8.8.8,8.8.4.4

# NAT Masquerade
/ip firewall nat add chain=srcnat out-interface=ether1 action=masquerade comment="WAN Masquerade"

# Hotspot Profile (serves from /hotspot folder)
/ip hotspot profile add name=hsprof-campus hotspot-address=10.10.0.1 html-directory=hotspot dns-name=campusnet.local login-by=http-pap,cookie,mac-cookie mac-cookie-timeout=1d

# Hotspot Server
/ip hotspot add name=hs-campus interface=bridge-hotspot address-pool=hs-pool profile=hsprof-campus

# User Profiles
/ip hotspot user profile set [find default=yes] shared-users=1 keepalive-timeout=2m rate-limit=3M/1M mac-cookie-timeout=1d

# Walled Garden (Allow Payment Pages Before Login)
/ip hotspot walled-garden add dst-host=*.paystack.co action=allow
/ip hotspot walled-garden add dst-host=*.paystack.com action=allow
/ip hotspot walled-garden add dst-host=*.safaricom.co.ke action=allow
/ip hotspot walled-garden add dst-host=*.onrender.com action=allow
/ip hotspot walled-garden add dst-host=captive.apple.com action=allow
/ip hotspot walled-garden add dst-host=connectivitycheck.gstatic.com action=allow
/ip hotspot walled-garden add dst-host=connectivitycheck.android.com action=allow
/ip hotspot walled-garden add dst-host=www.msftconnecttest.com action=allow

# Force DNS through internal server (anti-bypass)
/ip firewall nat add chain=dstnat protocol=udp dst-port=53 action=redirect to-ports=53

:log info "CampusNet Makoyocart Ventures - Hotspot config complete!"
