# ====================================================================
# CampusNet Base Hotspot & Walled Garden Setup (RouterOS v7 & v6)
# Target Hardware: MikroTik hAP lite (RB941-2nD-TC)
# ====================================================================

# 1. Create LAN/Hotspot Bridge
/interface bridge add name=bridge-hotspot comment="Hotspot LAN Bridge"
/interface bridge port
add bridge=bridge-hotspot interface=ether2
add bridge=bridge-hotspot interface=ether3
add bridge=bridge-hotspot interface=ether4
add bridge=bridge-hotspot interface=wlan1

# 2. Configure Wireless Interface (SSID & Client Isolation)
/interface wireless
set [ find default-name=wlan1 ] ssid="CampusNet_Hostel_WiFi" mode=ap-bridge \
    band=2ghz-b/g/n channel-width=20mhz frequency=auto default-forwarding=no \
    disabled=no comment="Client isolation enabled (no snooping)"

# 3. WAN DHCP Client on ether1 (Upstream from Safaricom 5G/4G Router)
/ip dhcp-client
add interface=ether1 disabled=no use-peer-dns=yes use-peer-ntp=yes add-default-route=yes

# 4. IP Addressing & Pool (10.10.0.0/22 gives 1,020 addresses)
/ip address
add address=10.10.0.1/22 interface=bridge-hotspot network=10.10.0.0 comment="Hotspot Gateway"

/ip pool
add name=hs-pool ranges=10.10.0.10-10.10.3.250

/ip dhcp-server
add address-pool=hs-pool interface=bridge-hotspot lease-time=1h name=dhcp-hotspot disabled=no

/ip dhcp-server network
add address=10.10.0.0/22 gateway=10.10.0.1 dns-server=10.10.0.1 comment="CampusNet Subnet"

# 5. Hotspot Profile & Server Setup
/ip hotspot profile
add name="hsprof-campus" hotspot-address=10.10.0.1 dns-name="campusnet.local" \
    html-directory=hotspot login-by=http-pap,cookie,mac-cookie mac-cookie-timeout=1d

/ip hotspot
add name=hs-campus interface=bridge-hotspot address-pool=hs-pool profile=hsprof-campus disabled=no

# 6. User Profiles (Bandwidth Limits)
/ip hotspot user profile
set [ find default=yes ] shared-users=1 keepalive-timeout=2m mac-cookie-timeout=1d rate-limit="1M/3M"
add name="Banked_Browsing" rate-limit="1M/3M" shared-users=1 keepalive-timeout=2m
add name="Unlimited_Pass" rate-limit="1.5M/4M" shared-users=1 keepalive-timeout=2m

# 7. Walled Garden Rules (Unrestricted Pre-Payment Access)
/ip hotspot walled-garden
# Paystack Payment Gateway
add dst-host=*.paystack.co action=allow comment="Paystack"
add dst-host=*.paystack.com action=allow comment="Paystack"
add dst-host=api.paystack.co action=allow comment="Paystack API"
add dst-host=checkout.paystack.com action=allow comment="Paystack Checkout"

# Safaricom & Daraja Endpoints
add dst-host=*.safaricom.co.ke action=allow comment="Safaricom"
add dst-host=*.daraja.co.ke action=allow comment="Daraja M-Pesa"

# Cloud Billing Backend API (Render / Railway)
add dst-host=*.onrender.com action=allow comment="Cloud Backend API"
add dst-host=campusnet-api.onrender.com action=allow comment="Custom API"

# Captive Network Assistant (CNA) Detection Domains
add dst-host=captive.apple.com action=allow
add dst-host=connectivitycheck.gstatic.com action=allow
add dst-host=connectivitycheck.android.com action=allow
add dst-host=msftconnecttest.com action=allow

# 8. Masquerade NAT for WAN Internet Access
/ip firewall nat
add chain=srcnat out-interface=ether1 action=masquerade comment="WAN Masquerade"
