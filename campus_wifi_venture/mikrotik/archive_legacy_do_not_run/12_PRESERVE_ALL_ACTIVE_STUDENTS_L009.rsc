# ==============================================================================
# Makoyocart Ventures - ZERO-DOWNTIME ACTIVE CLIENT MIGRATION TO L009
# Pre-authorizes and bypasses all active 7-day, 3-day, and 24-hour paying students
# ==============================================================================

# --- 1. Hotspot IP-Bindings (Instant Internet without needing to re-login) ---
/ip hotspot ip-binding

:do { add mac-address=56:08:CD:0A:D6:83 type=bypassed comment="0117411241 - 7 Day Pass (Exp Sep 21)" } on-error={}
:do { add mac-address=F2:79:6C:8C:D4:5B type=bypassed comment="0768258525 - 7 Day Pass (Exp Sep 21)" } on-error={}
:do { add mac-address=B6:44:DA:8F:6E:C4 type=bypassed comment="0110425602 - 7 Day Pass (Exp Sep 21)" } on-error={}
:do { add mac-address=6A:49:5B:4B:E1:A1 type=bypassed comment="0117088486 - 7 Day Pass (Exp Sep 20)" } on-error={}
:do { add mac-address=A6:49:4D:DC:65:72 type=bypassed comment="0719495157 - 24 Hr Pass (Exp Sep 19)" } on-error={}
:do { add mac-address=12:FF:CA:C5:94:93 type=bypassed comment="0705451362 - 24 Hr Pass (Exp Sep 18)" } on-error={}
:do { add mac-address=7E:F7:95:D4:E1:B0 type=bypassed comment="0708124860 - 3 Day Pass (Exp Sep 18)" } on-error={}
:do { add mac-address=FA:F3:C8:63:15:38 type=bypassed comment="0115596991 - 24 Hr Pass (Exp Sep 18)" } on-error={}

# --- 2. Ensure their Local Hotspot Users & Passwords are on L009 ---
/ip hotspot user

:do { add name="M7D_HPUJ8" password="190668" profile="pkg_7d" comment="0117411241-7D" } on-error={}
:do { add name="M7D_A23VJ" password="844144" profile="pkg_7d" comment="0768258525-7D" } on-error={}
:do { add name="M7D_8JNAK" password="044448" profile="pkg_7d" comment="0110425602-7D" } on-error={}
:do { add name="M7D_M3N96" password="070894" profile="pkg_7d" comment="0117088486-7D" } on-error={}
:do { add name="M24H_2L4YB" password="353066" profile="pkg_24h" comment="0719495157-24H" } on-error={}
:do { add name="M24H_DY6WU" password="074307" profile="pkg_24h" comment="0705451362-24H" } on-error={}
:do { add name="M24H_WVLKR" password="668667" profile="pkg_24h" comment="0141426876-24H-Loyalty" } on-error={}
:do { add name="M3D_UXQ2Q" password="882541" profile="pkg_3d" comment="0708124860-3D" } on-error={}
:do { add name="M24H_JNG3E" password="140072" profile="pkg_24h" comment="0115596991-24H" } on-error={}

:log info ">>> All active long-term students pre-authorized and protected on L009! <<<"
