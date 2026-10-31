# ==============================================================================
# Makoyocart Ventures CampusNet - RouterOS v7.17 Stability & Speed Cap Patch
# Fixes:
# 1. Disconnections from 2-minute keepalive timeout when phones sleep
# 2. Disconnections from 1-hour cookie expiration
# 3. Bandwidth starvation by capping per-user speed to 3 Mbps DL / 1 Mbps UL
# ==============================================================================

# Step 1: Update Hotspot User Profile (Remove keepalive/idle drops & cap per-user speed)
/ip hotspot user profile
set [find default=yes] shared-users=1 keepalive-timeout=none idle-timeout=none status-autorefresh=5m rate-limit="1M/3M"

# Step 2: Update Hotspot Server Profile (7-Day Cookie & MAC-Cookie Auto-Login)
/ip hotspot profile
set [find name=hsprof-campus] dns-name=campusnet.local login-by=cookie,http-pap,mac-cookie http-cookie-lifetime=7d

# Step 3: Remove aggressive firewall DNS drops that caused intermittent drops
/ip firewall filter remove [find comment="Drop External DNS Queries"]
/ip firewall filter remove [find comment="Drop Private DNS DoT"]

:log info ">>> Makoyocart CampusNet: Stability & 3 Mbps Speed Caps Applied! <<<"
