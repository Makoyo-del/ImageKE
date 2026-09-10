# ====================================================================
# CampusNet Self-Healing & Security Hardening Script
# Protects 16MB NAND Flash, Automates Anomaly Recovery, Fair-Share PCQ
# ====================================================================

# 1. Protect 16MB Flash: Route All Logs Strictly to Memory (RAM)
/system logging action
set [ find default=yes ] memory-lines=100 target=memory
set [ find name=memory ] memory-lines=100

/system logging
set [ find default=yes ] action=memory
add action=memory topics=hotspot,info
add action=memory topics=critical

# 2. Hardware Watchdog Auto-Reboot (Recovers from Freezes / Surges)
/system watchdog
set auto-send-supout=no ping-delay=2m ping-timeout=1m watch-address=8.8.8.8

# 3. Daily 4:00 AM Automated Self-Healing Maintenance Script
/system script
add dont-require-permissions=no name="daily_self_heal" policy=ftp,reboot,read,write,policy,test source=\
    ":log info 'CampusNet: Starting daily self-healing maintenance...';\r\
    \n/ip dhcp-server lease remove [find dynamic=yes and status=waiting];\r\
    \n/ip hotspot active remove [find uptime>24h and bytes-out<50000];\r\
    \n/ip hotspot cookie remove [find];\r\
    \n:log info 'CampusNet: Daily maintenance complete. Cleaned stale leases & cookies';"

/system scheduler
add interval=1d name="run_daily_self_heal" on-event="daily_self_heal" policy=ftp,reboot,read,write,policy,test \
    start-date=sep/01/2026 start-time=04:00:00

# 4. Captive DNS Trap & VPN Bypass Prevention
# Redirect all Port 53 UDP/TCP to Router's Internal DNS
/ip firewall nat
add chain=dstnat protocol=udp dst-port=53 action=redirect to-ports=53 comment="Force Internal DNS"
add chain=dstnat protocol=tcp dst-port=53 action=redirect to-ports=53 comment="Force Internal DNS"

# Drop DoT (Port 853) & SlowDNS Bypasses from unauthenticated devices
/ip firewall filter
add chain=forward protocol=tcp dst-port=853 action=drop comment="Drop Private DNS DoT"
add chain=forward protocol=udp dst-port=53 src-address-list=!hs-auth action=drop comment="Drop External DNS Queries"

# 5. Fair-Share PCQ Queue (Equal Distribution - Prevents Hogging)
/queue type
add kind=pcq name="pcq_download" pcq-classifier=dst-address pcq-rate=3M
add kind=pcq name="pcq_upload" pcq-classifier=src-address pcq-rate=1M

/queue simple
add name="CampusNet_FairShare" target=10.10.0.0/22 queue=pcq-upload/pcq-download max-limit=15M/15M \
    comment="Even bandwidth distribution across all active students"

# 6. Secure Administration Lockdown
/ip service
set telnet disabled=yes
set ftp disabled=yes
set www disabled=yes
set api-ssl disabled=yes

# 7. Enable MikroTik Free Cloud DDNS (Remote Access Behind Safaricom CGNAT)
/ip cloud set ddns-enabled=yes update-time=yes
