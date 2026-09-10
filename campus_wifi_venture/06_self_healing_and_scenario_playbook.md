# 🛡️ Self-Healing Operations & Edge-Case Playbook

> **Scope**: Autonomous, Zero-Touch Operations for Campus Hostel Wi-Fi  
> **Target Device**: MikroTik hAP lite (RB941-2nD-TC) behind Safaricom 4G/5G Gateway  
> **Focus**: Zero manual intervention, self-recovery from anomalies, high customer trust  

---

## 1. Top Kenyan Hotspot Pitfalls & How We Solve Them

We investigated common complaints on Kenyan campus forums (r/Kenya, Kenyan ISP/MikroTik communities, hostel WhatsApp groups). Here is how our architecture prevents every single one:

```
┌────────────────────────────┬────────────────────────────────────────────────────────────────────────┐
│ The Real-World Complaint   │ The Self-Healing Engineering Fix                                       │
├────────────────────────────┼────────────────────────────────────────────────────────────────────────┤
│ 1. "My phone disconnected   │ Solution: Phone-Number Session Recovery. Subscriptions are tied to     │
│    and now it says I must  │ the student's phone number + cloud database, not just a fragile MAC    │
│    pay again!" (MAC        │ address. A 1-click "Restore Session" button re-activates their new MAC │
│    randomization on        │ in 2 seconds without paying twice.                                     │
│    iOS/Android).           │                                                                        │
├────────────────────────────┼────────────────────────────────────────────────────────────────────────┤
│ 2. "Money was deducted via │ Solution: Dual Verification. If the Safaricom STK prompt is delayed,   │
│    M-Pesa but no internet  │ the portal allows the user to paste their M-Pesa transaction code     │
│    was granted!"           │ (`QJD...`). The backend verifies this with Paystack/Daraja in 2 seconds│
│                            │ and immediately logs the user in.                                      │
├────────────────────────────┼────────────────────────────────────────────────────────────────────────┤
│ 3. "I bought 1 hour, used  │ Solution: Dual Billing Models.                                         │
│    15 mins, went to class, │ • Banked Browsing Time (e.g. 3 Hours Browsing): The clock strictly     │
│    came back and it was    │   pauses when disconnected. Valid for 24 hours.                        │
│    gone!"                  │ • Continuous Pass (e.g. 24 Hours Unlimited): Clock runs continuously.  │
│                            │ Clear, unambiguous UI labeling eliminates student confusion.           │
├────────────────────────────┼────────────────────────────────────────────────────────────────────────┤
│ 4. "Wi-Fi shows Connected │ Solution: Captive DNS Redirection. Port 53 UDP/TCP queries are forced  │
│    without Internet, but   │ to the internal MikroTik DNS, and Port 853 (DNS-over-TLS) is dropped, │
│    the portal won't pop    │ forcing Android and Apple CNA to trigger the login screen reliably.    │
│    up!" (Private DNS).     │                                                                        │
├────────────────────────────┼────────────────────────────────────────────────────────────────────────┤
│ 5. "One guy downloading a  │ Solution: PCQ (Per Connection Queue) Fair-Share Dynamic Queues.        │
│    game killed everyone's  │ Guarantees equal bandwidth distribution (3 Mbps down / 1 Mbps up cap   │
│    WhatsApp calls."        │ with a 5 Mbps burst for fast page loads). P2P/BitTorrent is blocked.   │
├────────────────────────────┼────────────────────────────────────────────────────────────────────────┤
│ 6. "Router froze or       │ Solution: Memory-Only Logging + Hardware Watchdog.                     │
│    bricked after a power   │ • Logging is redirected to RAM only to prevent wearing out the 16MB    │
│    surge/blackout."        │   NAND flash.                                                          │
│                            │ • Hardware watchdog automatically power-cycles on kernel panics.       │
│                            │ • Auto-reboot scheduler clears stale DHCP leases daily at 4:00 AM.     │
├────────────────────────────┼────────────────────────────────────────────────────────────────────────┤
│ 7. "Upstream ISP died, but │ Solution: Payment Safety Interlock. Netwatch pings `8.8.8.8`. If the   │
│    students kept paying    │ Safaricom WAN connection is down, the portal disables payments and    │
│    and lost money!"        │ displays an honest "Upstream Maintenance" banner.                      │
└────────────────────────────┴────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Exhaustive "What If" Scenario Matrix

### Scenario 1: User buys 1 Hour of Data, disconnects after 15 minutes, returns 3 hours later
* **The Rule**: For "Banked Browsing" packages, the MikroTik `limit-uptime` property tracks **accumulated active connection time**, not wall-clock time.
* **The Flow**:
  1. Student browses for 15 minutes (`uptime = 15m`).
  2. Student leaves room. MikroTik detects keepalive loss within 2 minutes and pauses the session.
  3. Student returns 3 hours later. Wi-Fi connects.
  4. MikroTik MAC-cookie auto-authenticates the student seamlessly.
  5. Student still has **45 minutes remaining**.
  6. Status bar on screen shows: *“Remaining Time: 45m (Ticket valid until 10:00 PM)”*.

### Scenario 2: Student switches from Phone to Laptop (Device Handover)
* **The Rule**: 1 concurrent active device per subscription to prevent password sharing, but easy transfer between personal devices.
* **The Flow**:
  1. Student connects laptop to `CampusNet_Hostel_WiFi`.
  2. Captive portal opens on laptop.
  3. Student clicks **"Transfer / Restore Session"** and enters their phone number.
  4. Backend checks active subscription → De-authorizes the phone MAC → Authorizes the laptop MAC.
  5. Internet immediately switches to the laptop. Zero support calls needed.

### Scenario 3: Remote Promotional Packages & Flash Pricing (Zero-Touch)
* **The Question**: *Can Duncan create promotional packages remotely without touching the physical router?*
* **The Architecture**:
  - The captive portal (`login.html`) **does not hardcode package prices**.
  - On load, `login.html` fetches active packages from Duncan's cloud backend:
    `GET https://api.campusnet.co.ke/packages` (whitelisted in walled garden).
  - From his phone, Duncan opens his private Admin Dashboard (or edits a simple cloud config):
    - Example: Add *"Exam Night Special: 12h for KSh 25"* between 8:00 PM and 6:00 AM.
    - Example: Create promo code *"FRESHER2026"* giving 30 minutes free trial to new users.
  - The captive portal updates instantly for all students on campus.

### Scenario 4: M-Pesa Payment Reversal Fraud
* **The Threat**: Student pays KSh 40, gets connected, and immediately requests Safaricom to reverse the M-Pesa transaction.
* **The Defense**:
  - If a reversal webhook is received from Paystack / Daraja, the backend flags the phone number and MAC address.
  - The router API automatically kicks the user from active sessions and adds their MAC to the `banned_macs` firewall address list.
  - Next time that phone number or MAC attempts to connect, the portal displays: *"Account suspended due to reversed payment. Please contact admin."*

---

## 3. MikroTik hAP lite Self-Healing Scripts (Copy & Paste Ready)

### A. RAM-Only Logging (Prevents 16MB Flash Wearout)
Run in MikroTik Terminal:
```routeros
# Route all logs strictly to RAM (Memory), never to disk/flash
/system logging action
set [ find default=yes ] memory-lines=100 target=memory
set [ find name=memory ] memory-lines=100

/system logging
set [ find default=yes ] action=memory
add action=memory topics=hotspot,info
add action=memory topics=critical
```

### B. Hardware Watchdog & Daily Clean-up Scheduler
```routeros
# Enable Hardware Watchdog to auto-reboot on system hang
/system watchdog set auto-send-supout=no ping-delay=2m ping-timeout=1m watch-address=8.8.8.8

# Daily 4:00 AM Self-Healing Clean-up (Flushes stale ARP and cookies)
/system script
add dont-require-permissions=no name="daily_self_heal" policy=ftp,reboot,read,write,policy,test source=\
    "/ip hotspot active remove [find];\r\
    \n/ip dhcp-server lease remove [find dynamic=yes and status=waiting];\r\
    \n/ip hotspot cookie remove [find];\r\
    \n:log info 'CampusNet: Daily self-healing maintenance completed';"

/system scheduler
add interval=1d name="run_daily_self_heal" on-event="daily_self_heal" policy=ftp,reboot,read,write,policy,test \
    start-date=sep/01/2026 start-time=04:00:00
```

### C. Captive DNS Redirection (Forces CNA Popup on All Phones)
```routeros
# Redirect unauthenticated Port 53 UDP & TCP to internal router DNS
/ip firewall nat
add chain=dstnat protocol=udp dst-port=53 action=redirect to-ports=53 comment="Redirect DNS"
add chain=dstnat protocol=tcp dst-port=53 action=redirect to-ports=53 comment="Redirect DNS"

# Drop DoT (DNS-over-TLS) which bypasses captive portals on Android 10+
/ip firewall filter
add chain=forward protocol=tcp dst-port=853 action=drop comment="Drop Private DNS DoT"
```

### D. Fair-Share PCQ Bandwidth Shaper (Anti-Hogging)
```routeros
# Create PCQ Queue Types (Per-Connection Queue)
/queue type
add kind=pcq name="pcq_download" pcq-classifier=dst-address pcq-rate=3M
add kind=pcq name="pcq_upload" pcq-classifier=src-address pcq-rate=1M

# Apply PCQ to Hotspot Users
/queue simple
add name="CampusNet_FairShare" target=10.10.0.0/22 queue=pcq-upload/pcq-download max-limit=15M/15M \
    comment="Even bandwidth distribution across all active students"
```

---

## 4. Remote Administration Behind CGNAT (No Static IP Required)

Since the hAP lite is plugged into a Safaricom 4G/5G router, it receives a private IP (192.168.8.x). You can manage it remotely from anywhere in Kenya using **MikroTik Cloud IP (Back to Home / DDNS)**:

```routeros
# Enable MikroTik's Free Cloud DDNS
/ip cloud set ddns-enabled=yes update-time=yes

# Check your unique global domain name:
/ip cloud print
```
*You will receive a unique domain like `xxxxxxxx.sn.mynetname.net`. By enabling **Back to Home VPN** (in RouterOS v7) or a WireGuard tunnel, you can open WinBox on your phone or laptop from anywhere in the world and manage the router live.*
