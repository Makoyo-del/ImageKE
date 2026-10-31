# ==============================================================================
# MIKROTIK L009UiGS-RM - DEFINITIVE PRODUCTION MASTER SCRIPT (RouterOS 7)
# Pure Documentation-Compliant Setup | Hotspot + 1000+ IP DHCP + Bandwidth Capping
# Admin credentials are preserved. Conflicting rules and caches are wiped clean.
# ==============================================================================

:log info ">>> Starting L009 Definitive Clean Deployment... <<<"

# ------------------------------------------------------------------------------
# 1. CLEANUP PREVIOUS CONFLICTING CONFIGURATIONS
# ------------------------------------------------------------------------------
/ip hotspot active remove [find]
/ip hotspot cookie remove [find]
/ip hotspot host remove [find]
/ip hotspot ip-binding remove [find]
/ip hotspot user remove [find name!="admin"]
/ip hotspot user profile remove [find default!=yes]
/ip hotspot remove [find]
/ip hotspot profile remove [find default!=yes]
/ip hotspot walled-garden remove [find]
/ip hotspot walled-garden ip remove [find]

/ip dhcp-server remove [find]
/ip dhcp-server network remove [find]
/ip pool remove [find name="hs-pool"]

/ip firewall filter remove [find dynamic=no]
/ip firewall nat remove [find dynamic=no]
/ip firewall address-list remove [find]

/ip dns static remove [find name="campusnet.local"]

# ------------------------------------------------------------------------------
# 2. SYSTEM IDENTITY & INTERFACE BRIDGE
# ------------------------------------------------------------------------------
/system identity set name="Makoyocart-L009-Core"

/interface bridge
:do { add name=bridge-hotspot comment="Core Hotspot LAN Bridge" } on-error={}

/interface bridge port
:do { add bridge=bridge-hotspot interface=ether2 } on-error={}
:do { add bridge=bridge-hotspot interface=ether3 } on-error={}
:do { add bridge=bridge-hotspot interface=ether4 } on-error={}
:do { add bridge=bridge-hotspot interface=ether5 } on-error={}
:do { add bridge=bridge-hotspot interface=ether6 } on-error={}
:do { add bridge=bridge-hotspot interface=ether7 } on-error={}
:do { add bridge=bridge-hotspot interface=ether8 } on-error={}

# ------------------------------------------------------------------------------
# 3. IP ADDRESSING & WAN UPLINK
# ------------------------------------------------------------------------------
# Gateway IP 10.10.0.1 with Subnet Mask 255.255.252.0 (/22)
/ip address remove [find interface=bridge-hotspot]
/ip address add address=10.10.0.1/22 interface=bridge-hotspot network=10.10.0.0 comment="Hotspot Gateway IP"

# ISP WAN DHCP Client on Port 1
/ip dhcp-client remove [find interface=ether1]
/ip dhcp-client add interface=ether1 disabled=no comment="ISP-WAN-Client" add-default-route=yes use-peer-dns=no

# ------------------------------------------------------------------------------
# 4. HIGH-CAPACITY DHCP SERVER (1,000+ IPs for Hostel Density)
# ------------------------------------------------------------------------------
/ip pool add name=hs-pool ranges=10.10.0.10-10.10.3.250

/ip dhcp-server add name=dhcp-hotspot interface=bridge-hotspot address-pool=hs-pool lease-time=1h disabled=no authoritative=yes

/ip dhcp-server network add address=10.10.0.0/22 gateway=10.10.0.1 dns-server=10.10.0.1 comment="Hotspot DHCP Scope"

# ------------------------------------------------------------------------------
# 5. DNS ENGINE & LOCAL PORTAL RESOLUTION
# ------------------------------------------------------------------------------
/ip dns set allow-remote-requests=yes cache-size=4096KiB servers=8.8.8.8,1.1.1.1
/ip dns static add name=campusnet.local address=10.10.0.1 comment="Portal-Local-DNS"

# ------------------------------------------------------------------------------
# 6. FIREWALL NAT (Internet Masquerade + DNS Hijacking)
# ------------------------------------------------------------------------------
# Masquerade outbound traffic out WAN port 1
/ip firewall nat add chain=srcnat out-interface=ether1 action=masquerade comment="WAN-NAT"

# Hijack all port 53 DNS queries to force local resolution of campusnet.local
/ip firewall nat add chain=dstnat in-interface=bridge-hotspot protocol=udp dst-port=53 action=redirect to-ports=53 comment="DNS-NAT"
/ip firewall nat add chain=dstnat in-interface=bridge-hotspot protocol=tcp dst-port=53 action=redirect to-ports=53 comment="DNS-NAT"

# ------------------------------------------------------------------------------
# 7. CLEAN, HOTSPOT-FRIENDLY FIREWALL FILTER
# ------------------------------------------------------------------------------
/ip firewall filter add chain=input connection-state=established,related action=accept comment="Accept Established/Related"
/ip firewall filter add chain=input in-interface=bridge-hotspot action=accept comment="Allow all LAN Hotspot traffic to Router"
/ip firewall filter add chain=input in-interface=ether1 connection-state=new action=drop comment="Drop external WAN unsolicited access"

# ------------------------------------------------------------------------------
# 8. HOTSPOT SERVER & USER PROFILES (Zero Guesswork RouterOS 7 Docs)
# ------------------------------------------------------------------------------
# Note: login-by uses http-chap,http-pap,cookie. We explicitly DO NOT use mac-cookie so devices don't silently bypass the portal!
/ip hotspot profile set [find default=yes] hotspot-address=10.10.0.1 dns-name=campusnet.local html-directory=hotspot login-by=http-chap,http-pap,cookie http-cookie-lifetime=3d

# Create and enable Hotspot server on bridge-hotspot. address-pool=none ensures DHCP server manages leases cleanly without 1:1 NAT pool confusion.
/ip hotspot add name=hs-campus interface=bridge-hotspot profile=default address-pool=none disabled=no

# Default user profile bandwidth shaping (1M upload / 3M download)
/ip hotspot user profile set [find default=yes] shared-users=1 keepalive-timeout=none idle-timeout=none status-autorefresh=5m rate-limit="1M/3M"

# Dynamic Voucher Packages
:do { /ip hotspot user profile add name=pkg_1h shared-users=1 keepalive-timeout=none idle-timeout=none status-autorefresh=5m rate-limit="1M/3M" } on-error={}
:do { /ip hotspot user profile add name=pkg_3h shared-users=1 keepalive-timeout=none idle-timeout=none status-autorefresh=5m rate-limit="1M/3M" } on-error={}
:do { /ip hotspot user profile add name=pkg_12h shared-users=1 keepalive-timeout=none idle-timeout=none status-autorefresh=5m rate-limit="1M/3M" } on-error={}
:do { /ip hotspot user profile add name=pkg_24h shared-users=1 keepalive-timeout=none idle-timeout=none status-autorefresh=5m rate-limit="1M/3M" } on-error={}
:do { /ip hotspot user profile add name=pkg_3d shared-users=1 keepalive-timeout=none idle-timeout=none status-autorefresh=5m rate-limit="1M/3M" } on-error={}
:do { /ip hotspot user profile add name=pkg_7d shared-users=1 keepalive-timeout=none idle-timeout=none status-autorefresh=5m rate-limit="1M/3M" } on-error={}

# ------------------------------------------------------------------------------
# 9. WALLED GARDEN (Strict - Render API, Supabase, Paystack, M-Pesa Only)
# Note: Google/gstatic is EXCLUDED so Android and iOS ALWAYS trigger the portal popup!
# ------------------------------------------------------------------------------
/ip hotspot walled-garden
add dst-host=imageke-api.onrender.com action=allow
add dst-host=*.onrender.com action=allow
add dst-host=*.supabase.co action=allow
add dst-host=*.paystack.co action=allow
add dst-host=*.paystack.com action=allow
add dst-host=*.safaricom.co.ke action=allow

/ip hotspot walled-garden ip
add dst-host=imageke-api.onrender.com action=accept
add dst-host=*.onrender.com action=accept
add dst-host=*.supabase.co action=accept
add dst-host=*.paystack.co action=accept
add dst-host=*.paystack.com action=accept
add dst-host=*.safaricom.co.ke action=accept

# ------------------------------------------------------------------------------
# 10. SAFE WINBOX & MANAGEMENT ACCESS
# ------------------------------------------------------------------------------
/interface list remove [find name="LAN"]
/interface list add name=LAN
/interface list member remove [find list="LAN"]
/interface list member add list=LAN interface=bridge-hotspot

/tool mac-server set allowed-interface-list=LAN
/tool mac-server mac-winbox set allowed-interface-list=LAN
/ip neighbor discovery-settings set discover-interface-list=LAN

/ip service set telnet disabled=yes
/ip service set ftp disabled=yes
/ip service set www disabled=yes
/ip service set api disabled=yes
/ip service set api-ssl disabled=yes
/ip service set winbox disabled=no
/ip service set ssh disabled=no

:log info ">>> L009 Definitive Core Configuration Successfully Applied! <<<"
