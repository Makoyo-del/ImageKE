/interface bridge add name=bridge-hotspot
/interface bridge port add bridge=bridge-hotspot interface=ether2
/interface bridge port add bridge=bridge-hotspot interface=ether3
/interface bridge port add bridge=bridge-hotspot interface=ether4
/interface bridge port add bridge=bridge-hotspot interface=wlan1
/interface wireless set wlan1 ssid="CampusNet_Hostel_WiFi" mode=ap-bridge band=2ghz-b/g/n disabled=no default-forwarding=no
/ip dhcp-client add interface=ether1 disabled=no
/ip address add address=10.10.0.1/22 interface=bridge-hotspot
/ip pool add name=hs-pool ranges=10.10.0.10-10.10.3.250
/ip dhcp-server add name=dhcp-hotspot interface=bridge-hotspot address-pool=hs-pool disabled=no
/ip dhcp-server network add address=10.10.0.0/22 gateway=10.10.0.1 dns-server=10.10.0.1
/ip dns set allow-remote-requests=yes servers=8.8.8.8,8.8.4.4
/ip firewall nat add chain=srcnat out-interface=ether1 action=masquerade comment="WAN Masquerade"
/ip hotspot profile add name=hsprof-campus hotspot-address=10.10.0.1 html-directory=hotspot dns-name=campusnet.local login-by=http-pap,cookie,mac-cookie mac-cookie-timeout=1d
/ip hotspot add name=hs-campus interface=bridge-hotspot address-pool=hs-pool profile=hsprof-campus
/ip hotspot user profile set [find default=yes] shared-users=1 keepalive-timeout=2m rate-limit=3M/1M mac-cookie-timeout=1d
/ip hotspot walled-garden add dst-host=*.paystack.co action=allow
/ip hotspot walled-garden add dst-host=*.paystack.com action=allow
/ip hotspot walled-garden add dst-host=*.safaricom.co.ke action=allow
/ip hotspot walled-garden add dst-host=*.onrender.com action=allow
/ip hotspot walled-garden add dst-host=captive.apple.com action=allow
/ip hotspot walled-garden add dst-host=connectivitycheck.gstatic.com action=allow
/ip hotspot walled-garden add dst-host=connectivitycheck.android.com action=allow
/ip hotspot walled-garden add dst-host=www.msftconnecttest.com action=allow
/ip firewall nat add chain=dstnat protocol=udp dst-port=53 action=redirect to-ports=53
:log info "Makoyocart Ventures CampusNet - LIVE!"
