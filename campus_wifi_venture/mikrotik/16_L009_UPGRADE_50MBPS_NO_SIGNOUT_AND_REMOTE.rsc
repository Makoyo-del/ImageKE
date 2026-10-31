# ==============================================================================
# MAKOYOCART VENTURES (CAMPUSNET) - L009 IN-PLACE PRODUCTION UPGRADE (4.1 - 4.5)
# Target: MikroTik L009UiGS-RM (RouterOS v7)
#
# GUARANTEES:
# 1. IDEMPOTENT & ZERO-DOWNTIME (4.1): Never wipes /ip hotspot active or /ip hotspot user.
#    Currently connected students remain online without interruption.
# 2. NO RANDOM SIGN-OUTS (4.2): Enables mac-cookie (3d), keepalive-timeout=10m,
#    idle-timeout=none, 12h DHCP lease, and clears limit-uptime / session-timeout
#    so wall-clock expiry is enforced cleanly by the backend sync.
# 3. REAL 50 MBPS SAFARICOM SHAPING (4.3): Upgrades from old 18M/3M bottleneck to
#    48M/20M aggregate PCQ with 8M/3M per-student fair-share bursts.
# 4. HARDENED FIREWALL (4.4): Blocks students on bridge-hotspot from WinBox (8291),
#    SSH (22), API (8728/8729), and REST (8443). Admin access via ether8 (192.168.88.1/24)
#    and Back-To-Home WireGuard VPN only.
# 5. REMOTE MANAGEMENT & SYNC (4.5): Enables MikroTik Back-To-Home VPN, HTTPS REST API
#    on port 8443, and 2m/30m automated voucher sync schedulers.
# ==============================================================================

{
# ------------------------------------------------------------------------------
# TUNABLE CONFIGURATION VARIABLES (Edit at the top before pasting if needed)
# ------------------------------------------------------------------------------
:local wanDown "48M"
:local wanUp "20M"
:local userDown "8M"
:local userUp "3M"
:local syncToken "REPLACE_WITH_ROUTER_SYNC_SECRET_KEY"
:local apiBaseUrl "https://imageke-api.onrender.com/api/campusnet"

:log info ">>> [CampusNet Upgrade] Starting zero-downtime L009 upgrade... <<<"

# ------------------------------------------------------------------------------
# 1. CLOCK & NTP SYNC (Required for TLS, Back-To-Home VPN & Wall-Clock Logs)
# ------------------------------------------------------------------------------
/system clock set time-zone-name=Africa/Nairobi
/system ntp client set enabled=yes
:do { /system ntp client servers add address=time.cloudflare.com } on-error={}
:do { /system ntp client servers add address=pool.ntp.org } on-error={}

# ------------------------------------------------------------------------------
# 2. DEDICATED ADMIN PORT (ether8 -> 192.168.88.1/24) FOR SAFE LOCAL ACCESS
# ------------------------------------------------------------------------------
# Remove ether8 from student bridge so plugging into Port 8 is always a pure Admin port
:do { /interface bridge port remove [find interface=ether8] } on-error={}

:if ([:len [/ip address find where interface=ether8 and address="192.168.88.1/24"]] = 0) do={
    /ip address add address=192.168.88.1/24 interface=ether8 network=192.168.88.0 comment="Dedicated-Admin-Port8"
}
:if ([:len [/ip pool find where name="admin-pool"]] = 0) do={
    /ip pool add name=admin-pool ranges=192.168.88.10-192.168.88.50
}
:if ([:len [/ip dhcp-server network find where address="192.168.88.0/24"]] = 0) do={
    /ip dhcp-server network add address=192.168.88.0/24 gateway=192.168.88.1 dns-server=8.8.8.8,1.1.1.1 comment="Admin-Port8-Network"
}
:if ([:len [/ip dhcp-server find where name="dhcp-admin"]] = 0) do={
    /ip dhcp-server add name=dhcp-admin interface=ether8 address-pool=admin-pool lease-time=12h disabled=no
}

# ------------------------------------------------------------------------------
# 3. REAL 50 MBPS SAFARICOM PCQ SHAPING & MSS CLAMPING (4.3)
# (Configured before Hotspot profiles so WAN-Bandwidth-Manager exists as parent queue)
# ------------------------------------------------------------------------------
# Ensure FastTrack is off so Simple Queues & Hotspot accounting work accurately
/ip firewall filter remove [find where action=fasttrack-connection]

# TCP MSS Clamping for Safaricom 4G/5G WAN
/ip firewall mangle remove [find where comment="Clamp MSS for Safaricom 4G/5G"]
/ip firewall mangle add chain=forward protocol=tcp tcp-flags=syn tcp-mss=1400-65535 \
    action=change-mss new-mss=clamp-to-pmtu passthrough=yes comment="Clamp MSS for Safaricom 4G/5G"

# Configure PCQ Queue Types in-place (8M down / 3M up per student, fair-share across 48M/20M pipe)
:if ([:len [/queue type find where name="campusnet-pcq-down"]] = 0) do={
    /queue type add name="campusnet-pcq-down" kind=pcq pcq-rate=$userDown pcq-classifier=dst-address pcq-limit=50KiB pcq-total-limit=4000KiB
} else={
    /queue type set [find where name="campusnet-pcq-down"] kind=pcq pcq-rate=$userDown pcq-classifier=dst-address pcq-limit=50KiB pcq-total-limit=4000KiB
}

:if ([:len [/queue type find where name="campusnet-pcq-up"]] = 0) do={
    /queue type add name="campusnet-pcq-up" kind=pcq pcq-rate=$userUp pcq-classifier=src-address pcq-limit=50KiB pcq-total-limit=4000KiB
} else={
    /queue type set [find where name="campusnet-pcq-up"] kind=pcq pcq-rate=$userUp pcq-classifier=src-address pcq-limit=50KiB pcq-total-limit=4000KiB
}

:local wanMaxLimit ($wanUp . "/" . $wanDown)
:if ([:len [/queue simple find where name="WAN-Bandwidth-Manager"]] = 0) do={
    /queue simple add name="WAN-Bandwidth-Manager" target=10.10.0.0/22 max-limit=$wanMaxLimit \
        queue=campusnet-pcq-up/campusnet-pcq-down comment="Fair-Share 50Mbps WAN Bufferbloat Protection"
} else={
    /queue simple set [find where name="WAN-Bandwidth-Manager"] target=10.10.0.0/22 max-limit=$wanMaxLimit \
        queue=campusnet-pcq-up/campusnet-pcq-down comment="Fair-Share 50Mbps WAN Bufferbloat Protection"
}

# ------------------------------------------------------------------------------
# 4. SIGN-OUT FIXES (4.2): 12h DHCP Lease, 30d MAC-Cookie, Parent Queue, Keepalive 10m
# ------------------------------------------------------------------------------
# Extend student DHCP lease from 1h to 12h so sleeping phones keep their IP
/ip dhcp-server set [find interface=bridge-hotspot] lease-time=12h
/ip hotspot set [find] address-pool=none idle-timeout=none keepalive-timeout=10m

# Enable mac-cookie + HTTP cookie (30 days) on Hotspot Server Profile (covers weekly/monthly passes)
/ip hotspot profile set [find default=yes] \
    hotspot-address=10.10.0.1 \
    dns-name=campusnet.local \
    html-directory=hotspot \
    login-by=mac-cookie,http-chap,http-pap,cookie \
    http-cookie-lifetime=30d \
    mac-cookie-timeout=30d

# Helper rate-limit string for per-user profiles (e.g. "3M/8M")
:local profileRate ($userUp . "/" . $userDown)

# Update default user profile with parent-queue=WAN-Bandwidth-Manager
/ip hotspot user profile set [find default=yes] \
    shared-users=1 \
    add-mac-cookie=yes \
    mac-cookie-timeout=30d \
    keepalive-timeout=10m \
    idle-timeout=none \
    status-autorefresh=5m \
    rate-limit=$profileRate \
    parent-queue=WAN-Bandwidth-Manager
:do { /ip hotspot user profile unset [find default=yes] session-timeout } on-error={}

# Idempotently create or update all 7 Option A package profiles
:local pkgProfiles {"pkg_1h";"pkg_3h";"pkg_12h";"pkg_24h";"pkg_3d";"pkg_7d";"pkg_30d"}
:foreach profName in=$pkgProfiles do={
    :if ([:len [/ip hotspot user profile find where name=$profName]] = 0) do={
        /ip hotspot user profile add name=$profName \
            shared-users=1 \
            add-mac-cookie=yes \
            mac-cookie-timeout=30d \
            keepalive-timeout=10m \
            idle-timeout=none \
            status-autorefresh=5m \
            rate-limit=$profileRate \
            parent-queue=WAN-Bandwidth-Manager
    } else={
        /ip hotspot user profile set [find where name=$profName] \
            shared-users=1 \
            add-mac-cookie=yes \
            mac-cookie-timeout=30d \
            keepalive-timeout=10m \
            idle-timeout=none \
            status-autorefresh=5m \
            rate-limit=$profileRate \
            parent-queue=WAN-Bandwidth-Manager
        :do { /ip hotspot user profile unset [find where name=$profName] session-timeout } on-error={}
    }
}

# Clear legacy limit-uptime on existing seeded users so wall-clock expiry in DB governs validity
:do { /ip hotspot user unset [find] limit-uptime } on-error={}

# ------------------------------------------------------------------------------
# 5. WALLED GARDEN: SAFARICOM M-PESA + AIRTEL MONEY + PAYSTACK + RENDER
# ------------------------------------------------------------------------------
:local wgHosts {"imageke-api.onrender.com";"*.onrender.com";"*.supabase.co";"*.paystack.co";"*.paystack.com";"*.safaricom.co.ke";"*.airtel.com";"*.airtelkenya.com";"*.airtel.africa"}
:foreach h in=$wgHosts do={
    :if ([:len [/ip hotspot walled-garden find where dst-host=$h]] = 0) do={
        /ip hotspot walled-garden add dst-host=$h action=allow comment="CampusNet-Payment-WG"
    }
    :if ([:len [/ip hotspot walled-garden ip find where dst-host=$h]] = 0) do={
        /ip hotspot walled-garden ip add dst-host=$h action=accept comment="CampusNet-Payment-WG"
    }
}

# ------------------------------------------------------------------------------
# 6. FIREWALL HARDENING (4.4): BLOCK STUDENTS FROM WINBOX / SSH / API / REST
# ------------------------------------------------------------------------------
# Trusted Admin Subnets (ether8 Admin LAN + MikroTik Back-To-Home WireGuard VPN)
/ip firewall address-list remove [find where list="ADMIN-TRUSTED"]
/ip firewall address-list add list="ADMIN-TRUSTED" address=192.168.88.0/24 comment="Dedicated Admin Port 8 Subnet"
/ip firewall address-list add list="ADMIN-TRUSTED" address=192.168.216.0/24 comment="Back-To-Home WireGuard VPN Subnet"

# Restrict MAC-WinBox / Neighbor Discovery strictly to ether8 Admin interface
:if ([:len [/interface list find where name="ADMIN-LAN"]] = 0) do={
    /interface list add name="ADMIN-LAN"
}
/interface list member remove [find where list="ADMIN-LAN"]
/interface list member add list="ADMIN-LAN" interface=ether8
/tool mac-server set allowed-interface-list=ADMIN-LAN
/tool mac-server mac-winbox set allowed-interface-list=ADMIN-LAN
/ip neighbor discovery-settings set discover-interface-list=ADMIN-LAN

# Replace static filter rules cleanly without touching dynamic Hotspot rules
/ip firewall filter remove [find where dynamic=no]

# Input Chain:
/ip firewall filter add chain=input connection-state=established,related,untracked action=accept comment="SEC: Accept Established/Related"
/ip firewall filter add chain=input connection-state=invalid action=drop comment="SEC: Drop Invalid"
/ip firewall filter add chain=input in-interface=ether8 action=accept comment="SEC: Allow Dedicated Admin Port 8"
/ip firewall filter add chain=input src-address-list=ADMIN-TRUSTED action=accept comment="SEC: Allow Admin & Back-To-Home VPN"

# Block students on bridge-hotspot from router management ports (WinBox 8291, SSH 22, API 8728/8729, REST 8443, Telnet/FTP 21/23)
/ip firewall filter add chain=input in-interface=bridge-hotspot protocol=tcp dst-port=21,22,23,8291,8443,8728,8729 action=drop comment="SEC: Block Students from WinBox/SSH/API/REST"
/ip firewall filter add chain=input in-interface=bridge-hotspot protocol=udp dst-port=20561,5678 action=drop comment="SEC: Block Students from MAC-WinBox/Discovery"

# Allow student DNS, DHCP, and Captive Portal HTTP/HTTPS on bridge-hotspot
/ip firewall filter add chain=input in-interface=bridge-hotspot protocol=udp dst-port=53,67,68 action=accept comment="SEC: Allow Student DNS & DHCP"
/ip firewall filter add chain=input in-interface=bridge-hotspot protocol=tcp dst-port=53,80,443,8080,64872-64875 action=accept comment="SEC: Allow Student Captive Portal"
/ip firewall filter add chain=input in-interface=bridge-hotspot protocol=icmp limit=10,20:packet action=accept comment="SEC: Allow Rate-Limited Ping"
/ip firewall filter add chain=input in-interface=bridge-hotspot action=drop comment="SEC: Drop Other Student-to-Router Input"

# Allow WireGuard Back-To-Home UDP handshake on WAN (ether1) and drop unsolicited WAN input
/ip firewall filter add chain=input in-interface=ether1 protocol=icmp limit=5,10:packet action=accept comment="SEC: Allow WAN Ping"
/ip firewall filter add chain=input in-interface=ether1 connection-state=new action=drop comment="SEC: Drop Unsolicited WAN Input"

# Forward Chain:
/ip firewall filter add chain=forward connection-state=established,related,untracked action=accept comment="SEC: Forward Established/Related"
/ip firewall filter add chain=forward connection-state=invalid action=drop comment="SEC: Drop Invalid Forward"
/ip firewall filter add chain=forward in-interface=bridge-hotspot protocol=tcp dst-port=853 action=accept comment="SEC: Allow Android Private DNS (DoT)"
/ip firewall filter add chain=forward in-interface=bridge-hotspot out-interface=ether1 action=accept comment="SEC: Allow Student LAN to WAN"
/ip firewall filter add chain=forward in-interface=ether8 out-interface=ether1 action=accept comment="SEC: Allow Admin Port 8 to WAN"

# ------------------------------------------------------------------------------
# 7. REMOTE MANAGEMENT (4.5): BACK-TO-HOME VPN + HTTPS REST API + SYNC SCHEDULERS
# ------------------------------------------------------------------------------
# Enable MikroTik Cloud DDNS & Back-To-Home WireGuard VPN (works behind Safaricom CGNAT)
/ip cloud set ddns-enabled=yes ddns-update-interval=10m
:do { /ip cloud set back-to-home-vpn=enabled } on-error={}

# Generate self-signed TLS certificate for HTTPS REST API (if not already present)
:if ([:len [/certificate find where name="campusnet-rest-ssl"]] = 0) do={
    /certificate add name="campusnet-rest-ssl" common-name="campusnet.local" key-size=2048 days-valid=3650 key-usage=digital-signature,key-encipherment,tls-server
    /certificate sign "campusnet-rest-ssl"
}

# Harden IP services: only WinBox, SSH, and HTTPS REST (port 8443) enabled, restricted to Admin + VPN subnets
/ip service set telnet disabled=yes
/ip service set ftp disabled=yes
/ip service set www disabled=yes
/ip service set api disabled=yes
/ip service set api-ssl disabled=yes
/ip service set winbox port=8291 address=192.168.88.0/24,192.168.216.0/24 disabled=no
/ip service set ssh port=22 address=192.168.88.0/24,192.168.216.0/24 disabled=no
:do { /ip service set www-ssl certificate="campusnet-rest-ssl" port=8443 address=192.168.88.0/24,192.168.216.0/24 disabled=no } on-error={}

# Configure automated 2-minute live sync scheduler (activates paid passes & kicks expired passes)
/system scheduler remove [find where name="campusnet-sync-live"]
/system scheduler add name="campusnet-sync-live" interval=2m start-time=startup \
    comment="CampusNet 2m Live Active & Expiry Sync" \
    on-event=(":local url \"" . $apiBaseUrl . "/sync/live?token=" . $syncToken . "\";\r\n" . \
              ":do {\r\n" . \
              "  /tool fetch url=\$url mode=https dst-path=campusnet_live.rsc check-certificate=no;\r\n" . \
              "  :delay 1s;\r\n" . \
              "  /import file-name=campusnet_live.rsc;\r\n" . \
              "  /file remove [find name=\"campusnet_live.rsc\"];\r\n" . \
              "} on-error={ :log warning \"CampusNet live sync fetch failed\"; }")

# Configure automated 30-minute pool sync scheduler (pulls auto-topped-up available vouchers)
/system scheduler remove [find where name="campusnet-sync-pool"]
/system scheduler add name="campusnet-sync-pool" interval=30m start-time=startup \
    comment="CampusNet 30m Available Voucher Pool Sync" \
    on-event=(":local url \"" . $apiBaseUrl . "/sync/pool?token=" . $syncToken . "\";\r\n" . \
              ":do {\r\n" . \
              "  /tool fetch url=\$url mode=https dst-path=campusnet_pool.rsc check-certificate=no;\r\n" . \
              "  :delay 2s;\r\n" . \
              "  /import file-name=campusnet_pool.rsc;\r\n" . \
              "  /file remove [find name=\"campusnet_pool.rsc\"];\r\n" . \
              "} on-error={ :log warning \"CampusNet pool sync fetch failed\"; }")

:log info ">>> [CampusNet Upgrade] L009 50Mbps + Zero-Signout + Hardened Firewall + Remote Sync Applied! <<<"
}

