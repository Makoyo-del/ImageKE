# ==============================================================================
# MAKOYOCART VENTURES - FINAL PRODUCTION LOCK-IN SCRIPT
# Task 1: Re-authenticate all valid active sessions on L009 hotspot
# Task 2: Smart security that does NOT break future updates/admin access
# Run ONCE after the Definitive Master Script (13_L009_DEFINITIVE_PRODUCTION_MASTER.rsc)
# ==============================================================================

:log info ">>> Starting Final Production Lock-In... <<<"

# ==============================================================================
# PART A: AUTHENTICATE ALL CURRENTLY VALID SESSIONS
# Source of truth: campusnet_sessions table in Supabase DB
# These students have PAID and their sessions are VALID right now.
# Method: /ip hotspot user add - they log in with their voucher code + PIN.
# The portal's "Restore Session" button handles this automatically via backend.
# But we also pre-load their users here so login works even if Render is asleep.
# ==============================================================================
/ip hotspot user

# --- 7-DAY STUDENTS (Valid until Sep 21, 2026) ---
:do { add name="M7D_HPUJ8" password="190668" profile="pkg_7d" comment="0117411241-7D-Sep21" } on-error={}
:do { add name="M7D_A23VJ" password="844144" profile="pkg_7d" comment="0768258525-7D-Sep21" } on-error={}
:do { add name="M7D_8JNAK" password="044448" profile="pkg_7d" comment="0110425602-7D-Sep21" } on-error={}

# --- 7-DAY STUDENT (Valid until Sep 20, 2026) ---
:do { add name="M7D_M3N96" password="070894" profile="pkg_7d" comment="0117088486-7D-Sep20" } on-error={}

# --- 24-HOUR STUDENTS (Valid Sep 18-19, 2026) ---
:do { add name="M24H_ETNFW" password="232538" profile="pkg_24h" comment="0114642847-24H-Sep19" } on-error={}
:do { add name="M24H_2L4YB" password="353066" profile="pkg_24h" comment="0719495157-24H-Sep19" } on-error={}
:do { add name="M24H_DY6WU" password="074307" profile="pkg_24h" comment="0705451362-24H-Sep18" } on-error={}
:do { add name="M24H_WVLKR" password="668667" profile="pkg_24h" comment="0141426876-24H-Sep18" } on-error={}
:do { add name="M3D_UXQ2Q" password="882541" profile="pkg_3d" comment="0708124860-3D-Sep18" } on-error={}
:do { add name="M24H_JNG3E" password="140072" profile="pkg_24h" comment="0115596991-24H-Sep18" } on-error={}

# ==============================================================================
# PART B: SMART SECURITY - Protects router WITHOUT breaking admin or future updates
# Key philosophy: Block WAN attacks, but NEVER block LAN (your access from ether2-8)
# ==============================================================================

# Clear old firewall rules first
/ip firewall filter remove [find dynamic=no]

# 1. Always accept established/related connections (critical for internet to flow)
/ip firewall filter add chain=input connection-state=established,related action=accept comment="SEC: Accept Established"
/ip firewall filter add chain=forward connection-state=established,related action=accept comment="SEC: Forward Established"

# 2. Allow ALL traffic from LAN (your ether2-8 ports - admin, WinBox, SSH)
#    This ensures you NEVER lose access when updating or debugging
/ip firewall filter add chain=input in-interface=bridge-hotspot action=accept comment="SEC: Allow LAN Admin Access"

# 3. Allow Hotspot portal traffic on LAN
/ip firewall filter add chain=input in-interface=bridge-hotspot protocol=tcp dst-port=80,443,8080 action=accept comment="SEC: Allow Portal HTTP/HTTPS"

# 4. Block NEW unsolicited connection attempts from WAN (ether1 = ISP port)
/ip firewall filter add chain=input in-interface=ether1 connection-state=new action=drop comment="SEC: Drop WAN New Connections"

# 5. Allow clients to reach internet (forward chain)
/ip firewall filter add chain=forward in-interface=bridge-hotspot out-interface=ether1 action=accept comment="SEC: LAN to WAN Forward"

:log info ">>> Final Production Lock-In Complete! All sessions loaded, security active! <<<"
