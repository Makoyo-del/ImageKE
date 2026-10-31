# ==============================================================================
# Makoyocart Ventures - MIKROTIK L009UiGS-RM CORE ROUTER SETUP
# Enterprise Hotspot, Smart Bandwidth Engine & 1000+ IP Capacity
# ==============================================================================

# --- 1. Set System Identity ---
/system identity set name="Makoyocart-L009-Core"

# --- 2. Create Hotspot Bridge across all LAN ports (ether2 to ether8) ---
/interface bridge
:do { add name=bridge-hotspot comment="Hotspot LAN Bridge" } on-error={}

/interface bridge port
:do { add bridge=bridge-hotspot interface=ether2 } on-error={}
:do { add bridge=bridge-hotspot interface=ether3 } on-error={}
:do { add bridge=bridge-hotspot interface=ether4 } on-error={}
:do { add bridge=bridge-hotspot interface=ether5 } on-error={}
:do { add bridge=bridge-hotspot interface=ether6 } on-error={}
:do { add bridge=bridge-hotspot interface=ether7 } on-error={}
:do { add bridge=bridge-hotspot interface=ether8 } on-error={}

# --- 3. IP Addressing & WAN Client ---
# Gateway IP for Hotspot
:do { /ip address add address=10.10.0.1/22 interface=bridge-hotspot comment="Hotspot Gateway" } on-error={}
# WAN Internet from ISP on ether1
:do { /ip dhcp-client add interface=ether1 disabled=no comment="ISP-WAN-Client" } on-error={}

# --- 4. Clean previous Hotspot & DHCP services safely ---
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

# --- 5. High-Capacity DHCP Pool (1,000+ IP addresses for Hostel Density) ---
/ip pool add name=hs-pool ranges=10.10.0.10-10.10.3.250
/ip dhcp-server add name=dhcp-hotspot interface=bridge-hotspot address-pool=hs-pool lease-time=1h disabled=no
/ip dhcp-server network add address=10.10.0.0/22 gateway=10.10.0.1 dns-server=10.10.0.1

# --- 6. High-Performance DNS & Outbound NAT ---
/ip dns set allow-remote-requests=yes cache-size=4096KiB servers=8.8.8.8,1.1.1.1
/ip firewall nat add chain=srcnat out-interface=ether1 action=masquerade comment=WAN-NAT

# --- 7. Hotspot Server Profile & Server ---
/ip hotspot profile add name=hsprof-campus hotspot-address=10.10.0.1 html-directory=hotspot dns-name=campusnet.local login-by=cookie,http-pap,mac-cookie http-cookie-lifetime=7d
/ip hotspot add name=hs-campus interface=bridge-hotspot address-pool=hs-pool profile=hsprof-campus disabled=no

# --- 8. User Profiles for Dynamic Voucher Packages ---
/ip hotspot user profile set [find default=yes] shared-users=1 keepalive-timeout=none idle-timeout=none status-autorefresh=5m rate-limit="1M/3M"
:do { /ip hotspot user profile add name=pkg_1h shared-users=1 keepalive-timeout=none idle-timeout=none status-autorefresh=5m rate-limit="1M/3M" } on-error={}
:do { /ip hotspot user profile add name=pkg_3h shared-users=1 keepalive-timeout=none idle-timeout=none status-autorefresh=5m rate-limit="1M/3M" } on-error={}
:do { /ip hotspot user profile add name=pkg_12h shared-users=1 keepalive-timeout=none idle-timeout=none status-autorefresh=5m rate-limit="1M/3M" } on-error={}
:do { /ip hotspot user profile add name=pkg_24h shared-users=1 keepalive-timeout=none idle-timeout=none status-autorefresh=5m rate-limit="1M/3M" } on-error={}
:do { /ip hotspot user profile add name=pkg_3d shared-users=1 keepalive-timeout=none idle-timeout=none status-autorefresh=5m rate-limit="1M/3M" } on-error={}
:do { /ip hotspot user profile add name=pkg_7d shared-users=1 keepalive-timeout=none idle-timeout=none status-autorefresh=5m rate-limit="1M/3M" } on-error={}

# --- 9. Walled Garden HTTP (Port 80) ---
/ip hotspot walled-garden add dst-host=*.paystack.co action=allow
/ip hotspot walled-garden add dst-host=*.paystack.com action=allow
/ip hotspot walled-garden add dst-host=*.safaricom.co.ke action=allow
/ip hotspot walled-garden add dst-host=*.onrender.com action=allow
/ip hotspot walled-garden add dst-host=imageke-api.onrender.com action=allow
/ip hotspot walled-garden add dst-host=fonts.googleapis.com action=allow
/ip hotspot walled-garden add dst-host=fonts.gstatic.com action=allow
/ip hotspot walled-garden add dst-host=*.supabase.co action=allow

# --- 10. Walled Garden HTTPS (Port 443 - Instant M-Pesa STK & Render Backend) ---
/ip hotspot walled-garden ip add dst-host=imageke-api.onrender.com action=accept
/ip hotspot walled-garden ip add dst-host=*.onrender.com action=accept
/ip hotspot walled-garden ip add dst-host=api.paystack.co action=accept
/ip hotspot walled-garden ip add dst-host=*.paystack.co action=accept
/ip hotspot walled-garden ip add dst-host=*.paystack.com action=accept
/ip hotspot walled-garden ip add dst-host=*.safaricom.co.ke action=accept
/ip hotspot walled-garden ip add dst-host=*.supabase.co action=accept

# --- 11. DNS Anti-Bypass Redirection ---
/ip firewall nat add chain=dstnat protocol=udp dst-port=53 action=redirect to-ports=53 comment=DNS-NAT
/ip firewall nat add chain=dstnat protocol=tcp dst-port=53 action=redirect to-ports=53 comment=DNS-NAT

:log info ">>> Makoyocart Ventures L009 Core Router is Online & Ready! <<<"
