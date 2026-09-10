# Safe Reset: Clears network, hotspot, and scripts without touching Admin Password or Users

# 1. Clean up Hotspot
/ip hotspot remove [find]
/ip hotspot profile remove [find name!=default]
/ip hotspot user remove [find name!=admin]
/ip hotspot user profile remove [find name!=default]
/ip hotspot walled-garden remove [find]

# 2. Clean up DHCP and IP Pools
/ip dhcp-server remove [find]
/ip dhcp-server network remove [find]
/ip pool remove [find]
/ip address remove [find]
/ip dhcp-client remove [find]

# 3. Clean up Firewall NAT
/ip firewall nat remove [find]

# 4. Clean up Bridge & Ports
/interface bridge port remove [find]
/interface bridge remove [find]

# 5. Clean up temporary uploaded scripts
/file remove [find name="campusnet.rsc"]

:log info ">>> Router Cleaned! Password and User accounts intact. <<<"
