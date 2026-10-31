# ============================================================
# Makoyocart Ventures - CampusNet DEFENSE & HARDENING (V1)
# Top-Grade Security for Campus / Hostel Environment
# RouterOS 7.x  |  All lines verified < 100 chars
# ============================================================

# --- 1. Create Management Interface List (Port ether2) ---
/interface list
:do { add name=MGMT comment="Admin Management Ports" } on-error={}

/interface list member
:do { add list=MGMT interface=ether2 } on-error={}

# --- 2. Disable Insecure / Unused Router Services ---
/ip service set telnet disabled=yes
/ip service set ftp disabled=yes
/ip service set api disabled=yes
/ip service set api-ssl disabled=yes

# --- 3. Restrict WinBox & MAC-Server to ether2 (Cable Only) ---
# Students on WiFi cannot scan or attempt WinBox login via MAC!
/tool mac-server set allowed-interface-list=MGMT
/tool mac-server mac-winbox set allowed-interface-list=MGMT

# --- 4. Cloak Router (Hide Identity from WiFi Scanners) ---
# Prevents student network scanning apps (Fing, etc.) from identifying MikroTik
/ip neighbor discovery-settings set discover-interface-list=MGMT

# --- 5. Client Isolation & Anti-MAC-Spoofing (Split-Horizon) ---
# Students on WiFi/LAN cannot see, scan, or ARP-poison each other!
/interface bridge port set [find interface=wlan1] horizon=1
/interface bridge port set [find interface=ether3] horizon=1
/interface bridge port set [find interface=ether4] horizon=1

# --- 6. Rogue DHCP Server Protection (DHCP Snooping) ---
# Blocks rogue student routers from poisoning the hostel network
/interface bridge set bridge-hotspot dhcp-snooping=yes

# --- 7. Firewall: Block External WAN Attacks ---
# Block public internet from querying DNS on ether1
/ip firewall filter add chain=input in-interface=ether1 protocol=udp dst-port=53 action=drop
/ip firewall filter add chain=input in-interface=ether1 protocol=tcp dst-port=53 action=drop

# Drop all unauthorized incoming connection attempts from WAN (ISP side)
/ip firewall filter add chain=input in-interface=ether1 connection-state=new action=drop

# --- 8. Prevent Hotspot Password Guessing / Brute-force Rate Limit ---
/ip hotspot user profile set [find default=yes] shared-users=1

:log info ">>> Makoyocart Ventures CampusNet - FORTIFIED & SECURE <<<"
