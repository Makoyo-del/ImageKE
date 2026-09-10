# 🔒 Network Architecture & Security Hardening

> **Platform**: MikroTik RouterOS v7.x / v6.x  
> **Hardware**: hAP lite (RB941-2nD-TC)  
> **Environment**: University Hostel (High-Risk, Adversarial Campus Network)  

---

## 1. Network Topology Blueprint

```
[Upstream Modem / 5G Router] (192.168.8.1)
             │
             │ (Ethernet cable into ether1)
             ▼
┌─────────────────────────────────────────────────────────────┐
│ MIKROTIK hAP lite GATEWAY (192.168.88.1)                    │
│                                                             │
│ • Port 1 (ether1 - WAN): DHCP Client from Upstream Modem    │
│ • Ports 2–4 + wlan1 (LAN Bridge): Hotspot Subnet 10.10.0.0/22│
│ • DHCP Server: 10.10.0.10 – 10.10.3.254 (Lease time: 1 hr) │
│ • Bandwidth Shaper (Queue Trees / PCQ): 3 Mbps / 1 Mbps cap │
│ • Firewall Filter: Anti-Tunneling, Client Isolation, NAT    │
└──────────────────────────────┬──────────────────────────────┘
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
       [Wired Devices]               [Wi-Fi Broadcast]
     (Admin Laptop via LAN)      SSID: "CampusNet_Hostel_WiFi"
                                        │
                                        ▼
                                [Student Phones]
                           (Forced to Captive Portal)
```

---

## 2. Captive Portal & Walled Garden Configuration

When unauthenticated students connect to `CampusNet_Hostel_WiFi`, all web requests redirect to the MikroTik captive portal (`http://10.10.0.1/login.html`).

### The Walled Garden (Pre-Payment Access)
Students must be able to load Paystack checkout and complete M-Pesa authentication **before** having general internet access.

Inside MikroTik RouterOS Terminal:
```routeros
# Allow Paystack API and Checkout domains through the firewall
/ip hotspot walled-garden
add dst-host=*.paystack.co action=allow
add dst-host=*.paystack.com action=allow
add dst-host=api.paystack.co action=allow
add dst-host=checkout.paystack.com action=allow

# Allow Safaricom Daraja / M-Pesa API IP endpoints if needed
add dst-host=*.safaricom.co.ke action=allow
add dst-host=*.daraja.co.ke action=allow

# Allow Custom Backend API Domain (Hosted on Render/Railway)
add dst-host=*.onrender.com action=allow
```

---

## 3. Security Hardening (Campus Attack Immunity)

Campus networks have tech students who attempt to exploit captive portals for free internet. The following 5 defenses must be applied:

### Defense 1: Client Isolation (Prevent Neighbor-to-Neighbor Snooping)
Stops students from hacking or sniffing packets from other devices on the same Wi-Fi.
```routeros
/interface wireless set [ find default-name=wlan1 ] default-forwarding=no
```

### Defense 2: DNS Tunneling Block (Drop SlowDNS / HTTP Custom Bypasses)
Tech-savvy students often configure VPN apps over Port 53 (UDP) to tunnel traffic through DNS servers.
```routeros
# Force all unauthenticated DNS queries to go strictly through the internal MikroTik DNS
/ip firewall nat
add chain=dstnat protocol=udp dst-port=53 action=redirect to-ports=53
add chain=dstnat protocol=tcp dst-port=53 action=redirect to-ports=53

# Drop external DNS queries from unauthenticated clients
/ip firewall filter
add chain=forward protocol=udp dst-port=53 src-address-list=!authenticated_users action=drop
```

### Defense 3: Single-Device MAC Binding (Anti-Password Sharing)
Prevent one student from buying a 24-hour pass and sharing the code or session with roommates.
```routeros
# Set Hotspot User Profile to allow only 1 concurrent session per username/voucher
/ip hotspot user profile
set [ find default=yes ] shared-users=1 mac-cookie-timeout=1d keepalive-timeout=2m
```

### Defense 4: Router Administration Lockdown
Prevent students from opening `192.168.88.1` or `10.10.0.1` and attempting brute-force logins.
```routeros
# Disable insecure management protocols
/ip service
set telnet disabled=yes
set ftp disabled=yes
set www disabled=yes
set api-ssl disabled=yes

# Restrict WinBox (Port 8291) and API (Port 8728) to Admin Laptop's MAC/IP only
/ip service
set winbox address=10.10.0.2/32,192.168.88.0/24
set api address=10.10.0.2/32,192.168.88.0/24
```

### Defense 5: Bandwidth Throttling (Fair Share PCQ Queue)
Guarantees that a student downloading a 10GB game does not cause WhatsApp calls to fail for others.
```routeros
# Default 3 Mbps Download / 1 Mbps Upload rate per user
/ip hotspot user profile
add name="Standard_Pass" rate-limit="1M/3M"
add name="VIP_Custodian" rate-limit="2M/5M"
```
