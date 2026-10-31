# ROUTER ACCESS & MANAGEMENT GUIDE: MIKROTIK L009 & HAP LITE
**Business**: Makoyocart Ventures Wifi (`BN-WLSP9KP9`)  
**Core Gateway**: MikroTik L009UiGS-RM (RouterOS v7)  
**Hostel Access Point**: MikroTik hAP lite (RB941-2nD)  
**Security Status**: Hardened Isolation (Students on Hotspot Bridge cannot access management services)

---

## Part A: Local Administration Access (Via ether8)

### 1. Dedicated Physical Port Assignment
The upgrade script permanently isolates **Port 8 (`ether8`)** on the L009 as a dedicated administration interface.
- **Why**: Students connected to the hostel Wi-Fi (`ether2` through `ether7`) are firewalled and dropped from WinBox (8291), SSH (22), API (8728/8729), and WebFig. Port 8 is completely separate from the student bridge (`bridge-hotspot`).
- **Router Admin IP**: `192.168.88.1`
- **Subnet**: `192.168.88.0/24`

### 2. Connecting Your Laptop to ether8
1. Plug an Ethernet patch cable from your laptop into **Port 8 (`ether8`)** on the front of the L009.
2. Configure your laptop's Ethernet adapter:
   - **Option 1 (DHCP - Recommended)**: Set to **Obtain an IP address automatically**. The L009 runs a dedicated DHCP server on Port 8 (`dhcp-admin`) that assigns your laptop an IP in the range `192.168.88.10` to `192.168.88.50`.
   - **Option 2 (Static Fallback)**: If DHCP does not assign an IP immediately, configure static IPv4:
     - IP Address: `192.168.88.100`
     - Subnet Mask: `255.255.255.0`
     - Default Gateway: `192.168.88.1`
     - DNS Server: `192.168.88.1`

### 3. Opening WinBox
1. Launch **WinBox** (v3.40+ or v4.x) on your laptop.
2. In the **Connect To** field, enter: `192.168.88.1`.
3. In the **Login** field, enter your router administrator username (`admin`).
4. In the **Password** field, enter your router administrator password.
5. Click **Connect**.

### 4. How to Use Safe Mode (CRITICAL SAFETY FEATURE)
Safe Mode protects you from locking yourself out when modifying configurations or firewall rules:
1. In the top-left toolbar of WinBox, click the **Safe Mode** button (or press `Ctrl + X`).
2. The button will appear pressed down.
3. If any command you execute cuts off your connection to the router, RouterOS automatically detects the disconnection after 10 seconds and **rolls back all changes** made during that Safe Mode session.
4. Once you have verified your command works and your session is intact, click **Safe Mode** again to commit the changes permanently.

### 5. Exporting and Backing Up Configuration
Before making any updates, create a full backup:
1. Open **New Terminal** in WinBox.
2. Create a binary backup:
   ```routeros
   /system backup save name="before_upgrade_backup"
   ```
3. Create a readable script export:
   ```routeros
   /export file="before_upgrade_export.rsc"
   ```
4. Open WinBox -> **Files**, find `before_upgrade_backup.backup` and `before_upgrade_export.rsc`, and drag-and-drop them to a safe folder on your laptop desktop.

---

## Part B: Remote Access via MikroTik Back-To-Home VPN

### 1. What is Back-To-Home VPN?
Safaricom cellular and home fiber internet uses CGNAT (Carrier-Grade NAT). This means your router does not have a public IPv4 address, which ordinarily makes remote access from outside the hostel impossible.

RouterOS v7 includes **Back-To-Home VPN**, powered by WireGuard. The L009 connects outbound to MikroTik's global Cloud relay. This allows you to securely access WinBox, the router terminal, and connected APs from anywhere in Kenya (or globally) without needing a static public IP.

> [!NOTE]
> Back-To-Home VPN only becomes active **after** you execute `16_L009_UPGRADE_50MBPS_NO_SIGNOUT_AND_REMOTE.rsc`. It is not active on the live router prior to that step.

### 2. Enabling and Verifying Back-To-Home
The upgrade script automatically executes:
```routeros
/ip cloud set ddns-enabled=yes ddns-update-interval=10m back-to-home-vpn=enabled
```
To verify its status in WinBox:
1. Navigate to **IP -> Cloud**.
2. Confirm **DDNS Enabled** is checked and **Back To Home VPN** displays `enabled`.
3. Note the **DNS Name** (e.g., `xxxxxxxx.sn.mynetname.net`).

### 3. Pairing Your Laptop or Phone
1. Install the official **MikroTik Home** or **Back To Home** app on your phone (iOS / Android) or the WireGuard client on your laptop.
2. In WinBox -> **IP -> Cloud**, click **Generate BTH QR Code** or export the WireGuard peer config.
3. Scan the QR code with your phone or import the config file into WireGuard on your laptop.
4. Toggle the VPN connection **ON**.

### 4. Accessing WinBox over VPN
1. With the Back-To-Home VPN connected on your phone or laptop, open WinBox.
2. Connect to the router's VPN IP: `192.168.216.1` (or the DNS name `xxxxxxxx.sn.mynetname.net`).
3. You now have full WinBox and WebFig access exactly as if you were physically plugged into Port 8 at the hostel!

---

## Part C: Daily Router Management Operations

### 1. View Currently Connected Students (Real-Time)
- **Active Hotspot Logins**: Go to **IP -> Hotspot -> Active**.
  - Shows every currently logged-in student, their voucher code, device IP address, MAC address, session uptime, and data transferred.
- **Active DHCP Leases**: Go to **IP -> DHCP Server -> Leases**.
  - Shows all connected devices (even those still looking at the captive portal before paying). Look for status `bound`.

### 2. Monitor Safaricom 50 Mbps Bandwidth & Queues
- **Hostel Aggregate Speed**: Go to **Queues -> Simple Queues**.
  - Look at `WAN-Bandwidth-Manager`.
  - The color of the icon indicates load:
    - **Green**: 0–50% capacity (healthy).
    - **Yellow**: 50–75% capacity (busy).
    - **Red**: 75–100% capacity (Safaricom pipe is full; PCQ fair-share queue is actively preventing buffering).
  - Double-click `WAN-Bandwidth-Manager` and open the **Traffic** tab to see real-time graphs of upload and download speeds.

### 3. Inspect Voucher Users
- Go to **IP -> Hotspot -> Users**.
  - Displays all 970 loaded pool vouchers.
  - When a student buys a pass, their voucher transitions from `DB-Pool` to `ACTIVE-PAID`.

### 4. Review Logs and Errors
- Go to **Log**.
  - Filter topics by `hotspot`, `script`, or `warning`.
  - Successful student logins appear as: `hotspot,info: <voucher_code> (<ip>): logged in`.

### 5. Monitor Router Health (CPU, RAM, Temperature)
- Go to **System -> Resources**.
  - **CPU Load**: Under normal hostel load (50–100 students), the L009's dual-core 800MHz ARM processor runs at only 5–15% CPU load.
  - **Free Memory**: Approximately 400MB+ free RAM.
  - **System -> Health**: Shows internal temperature (normal range: 38°C – 52°C).

### 6. Diagnose Internet Outages
If students report no internet:
1. In WinBox, open **New Terminal**.
2. Ping Google DNS:
   ```routeros
   /ping 8.8.8.8 count=4
   ```
   - If ping responds: The Safaricom WAN line is working. The issue is likely local Wi-Fi or portal related.
   - If ping fails with `timeout`: The Safaricom line is down. Check **IP -> DHCP Client -> ether1** to see if Safaricom assigned an IP, or reboot the Safaricom router.

---

## Part D: Remote HTTPS REST API (Port 8443)

### 1. How It Works
RouterOS v7 provides a native JSON REST API over HTTPS on port 8443. The upgrade script provisions a self-signed TLS certificate (`campusnet-rest-ssl`) and activates `/ip service set www-ssl port=8443`.

### 2. Backend Automated Communication
The Render backend communicates with the router via two distinct paths:
1. **Pull Sync (Primary - Highly Reliable)**:
   The L009 runs automated `/system scheduler` jobs every 2 minutes (`campusnet-sync-live`) and every 30 minutes (`campusnet-sync-pool`). The router initiates outbound HTTPS GET requests to `https://imageke-api.onrender.com/api/campusnet/sync/...` using the secure `ROUTER_SYNC_SECRET_KEY`. Because the router reaches out, it traverses Safaricom CGNAT with zero port forwarding required.
2. **Push REST API (Secondary - Admin Remote Commands)**:
   Accessible when connected via the Back-To-Home WireGuard VPN or from the Port 8 admin subnet at `https://192.168.88.1:8443/rest/`.

### 3. Security Protection
- Access is restricted by firewall address list `ADMIN-TRUSTED` (`192.168.88.0/24` and `192.168.216.0/24`).
- Any attempt by a hostel student on `bridge-hotspot` (`10.10.0.0/22`) to reach port 8443 or port 8291 is dropped instantly by the firewall input filter.

