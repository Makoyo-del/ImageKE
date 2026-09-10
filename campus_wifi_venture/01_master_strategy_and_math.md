# 📶 Campus Smart Hotspot — Master Strategy & Financial Model

> **Owner**: Duncan Makoyo  
> **Project**: Automated Hostel Wi-Fi Subscription Network  
> **Initial Node Location**: Partner Cube (8 Residents + Adjacent Rooms), Kisii  
> **Execution Kickoff**: September 2026  

---

## 1. Executive Summary & Value Proposition
Campus students in Kisii spend **KSh 30 to KSh 100 daily** on mobile data bundles that run out quickly or suffer from poor indoor cellular reception. 

This venture provides an automated, high-speed, unlimited local Wi-Fi network right inside the student hostel. 
* **Zero manual voucher selling:** Everything is automated via a captive portal and Paystack M-Pesa integration.
* **Low Initial Risk:** Phased rollout using Duncan's Jumia refund, starting with a development/testing lab before full field deployment.
* **Recurring Revenue:** Converts daily mobile bundle spenders into monthly/weekly recurring subscribers.

---

## 2. Phased Rollout Strategy

```
┌─────────────────────────────────────────────────────────────┐
│ PHASE 1: LAB & TESTING (Home Desk - Off Campus)            │
│ • Settle Jumia refund (KES 6,235).                          │
│ • Purchase MikroTik hAP lite (KES 5,698).                   │
│ • Connect MikroTik to existing home 5G router.             │
│ • Build & test captive portal + Paystack webhooks.          │
│ • Validate session timeouts & MAC locking on phone.         │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ PHASE 2: HOSTEL FIELD DEPLOYMENT (Partner Cube)             │
│ • Collect 1st-month pre-sale deposits from 7 cube mates.    │
│ • Fund 4G/5G Cube Router + 15 Mbps Safaricom line (KES 2,999)│
│ • Place MikroTik + Router inside Custodian's room.          │
│ • Launch commercial network & monitor remotely via WinBox.   │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Capital & Cashflow Math (Avoiding Financial Strain)

### A. Starting Capital (Jumia Refund Reconciliation)
* Cancelled Printer Refund: **KSh 4,556**
* Declined Sticker Roll Refund (Ouru Towers Station): **KSh 1,679**
* **Total Liquid Capital in M-Pesa:** **KSh 6,235**

### B. Phase 1 Capex (Lab Stage)
* MikroTik hAP lite (RB941-2nD-TC): **KSh 5,698**
* Patch LAN Cable & Setup Accessories: **KSh 0 – 300**
* Software & Hosting: **KSh 0** (Free Cloud Tiers: Render / Oracle Cloud / Localhost)
* **Cash Buffer Remaining:** **~KSh 537**

### C. Phase 2 Capex & Activation (Self-Funding Logic)
* Required for field deployment:
  * Dedicated 4G/5G Router for the cube: **~KSh 3,000** *(Funded via Friend's Buyout Investment or Pre-sales)*
  * Safaricom Home Wireless 15 Mbps Subscription: **KSh 2,999** *(Funded directly from Cube Pre-sales)*

---

## 4. Revenue Model & Unit Economics (15 Target Users)

### A. Subscription Tiers

| Tier | Duration | Price (KES) | Bandwidth Limit | Target Audience |
| :--- | :--- | :--- | :--- | :--- |
| **Cube Resident Pass** | 30 Days | **KSh 450 – 500** | 3 Mbps Down / 1 Mbps Up | Permanent roommates in the host cube |
| **Neighbour Pass** | 30 Days | **KSh 500 – 600** | 3 Mbps Down / 1 Mbps Up | Students in adjacent rooms / cubes |
| **Weekly Grind Pass** | 7 Days | **KSh 150** | 4 Mbps Down / 1.5 Mbps Up | Exam / CATs submission weeks |
| **24-Hour Day Pass** | 24 Hours | **KSh 40** | 3 Mbps Down / 1 Mbps Up | Weekend movie / assignment downloaders |
| **3-Hour Flash Pass** | 3 Hours | **KSh 20** | 4 Mbps Down / 2 Mbps Up | Quick assignment / Zoom call users |

### B. Conservative Monthly Profit Breakdown

$$\text{Gross Revenue} = (7 \text{ Cube Mates} \times 450) + (5 \text{ Neighbours} \times 500) + (60 \text{ Day Passes} \times 40)$$
$$\text{Gross Revenue} = 3,150 + 2,500 + 2,400 = \mathbf{KSh\ 8,050}$$

$$\text{Monthly Opex} = \text{Safaricom 15 Mbps Line} = \mathbf{KSh\ 2,999}$$
$$\text{Paystack Fees (1.5\%)} = \mathbf{KSh\ 120}$$

$$\text{Net Monthly Profit} = 8,050 - 2,999 - 120 = \mathbf{KSh\ 4,931\ / month}$$

* **Break-even on Master Router:** Under **35 days**.
* **Recurring Income:** ~KSh 5,000 to KSh 8,000 per month on complete automation.

---

## 5. Psychological Anchors & Behavioral Pricing Strategy

### A. The 3 Core Psychological Anchors
1. **The "Daily 50-Bob Illusion":** Students believe spending KSh 50 daily on bundles is cheap, but it adds up to **KSh 1,500 every month** for limited data that cuts off mid-day. Selling the **Monthly Pass at KSh 500** reframes the service as an immediate **KSh 1,000/month cash saving**.
2. **Data Anxiety Elimination:** No warning SMS alerts (*"You have exhausted your daily bundle"*), no switching video resolution to 360p, and zero checking `*544#`. True, unfettered 1080p freedom.
3. **The Snack Equivalency:** Pricing the **3-Hour Flash Sprint at KSh 20** makes it cheaper than a mandazi and smokie-pasua at the campus gate, eliminating mental friction for impulse buyers.

### B. The 5 High-Conversion Packages
* **The Flash Sprint (3 Hours / KSh 20):** 4 Mbps. Emergency assignment/CAT submissions or quick Zoom lectures.
* **The 24-Hour Binge (24 Hours / KSh 50):** 3.5 Mbps. Exactly matches Safaricom's 1GB price, but with 100% unlimited data for movie nights and weekends.
* **The Night Owl Pass (11:00 PM – 6:00 AM / KSh 30):** 4 Mbps. Monetizes idle overnight bandwidth for student series downloaders and gamers with zero network congestion.
* **The Exam Week Pass (7 Days / KSh 180):** 3.5 Mbps. Perfect for intensive revision and CAT cycles (~KSh 25/day).
* **The Cube Resident VIP (30 Days / KSh 500 - Hero Offer):** 3 Mbps. Breaks down to just **KSh 16.60/day**. Permanently locks students into automatic monthly renewals.

### C. The Decoy Effect (Nudging 70% to the Monthly Pass)
Displaying 24h (KSh 50) and 7-Day (KSh 180) alongside 30-Day VIP (KSh 500) triggers an immediate calculation: 10 daily passes equal the entire month. This drives over 70% of room residents to pay KSh 500 upfront, funding operational costs on Day 1.

### D. Captive Portal Splash Screen Copy
```text
⚡ Makoyocart CampusNet — Unlimited Hostel Wi-Fi
Stop rationing data. Stream 1080p, binge TikTok, and submit assignments with zero data stress.

[🔘 30-Day VIP Pass — KSh 500 (🔥 Best Value / Save KSh 1,000)]
[🔘 24-Hour Binge — KSh 50]
[🔘 3-Hour Sprint — KSh 20]
[🔘 Night Owl (11PM - 6AM) — KSh 30]

Enter M-Pesa Phone Number: [ 07xxxxxxxx ]
👉 [ Pay via M-Pesa STK Push ] -> Connects Instantly!
```
