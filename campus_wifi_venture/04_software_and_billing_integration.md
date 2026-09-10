# 💻 Software, Captive Portal & Billing Integration

> **Tech Stack**: Python (FastAPI) or Node.js (Express)  
> **Payment Gateway**: Paystack Kenya (M-Pesa enabled)  
> **Router Bridge**: MikroTik RouterOS API (`routeros-api` on Port 8728)  
> **Hosting**: Render.com / Railway.app (Free Tier with Public HTTPS)  

---

## 1. System Architecture & End-to-End Workflow

```
[Student Phone]
      │
      │ 1. Connects to Wi-Fi, Captive Portal pops up
      ▼
[login.html (On MikroTik)]
      │
      │ 2. Selects package (e.g. 24h = KES 40), inputs Phone & MAC
      ▼
[Paystack M-Pesa Popup]
      │
      │ 3. Student enters M-Pesa PIN on phone prompt
      ▼
[Paystack Gateway]
      │
      │ 4. Fires POST Webhook with HMAC-SHA512 Signature Header
      ▼
[Custom Backend API (Render / Python FastAPI)]
      │
      │ 5. Validates HMAC signature against PAYSTACK_SECRET_KEY
      │ 6. Extracts MAC address, package duration, and amount
      ▼
[MikroTik RouterOS API Bridge (Port 8728)]
      │
      │ 7. Executes: /ip/hotspot/user/add with limit-uptime
      ▼
[MikroTik Gateway]
      │
      │ 8. Grants Instant Internet Access to the Student's MAC
      ▼
[Student Connected & Surfing]
```

---

## 2. Paystack Webhook Handler & Security Verification (Python FastAPI Blueprint)

The backend must **never** trust unverified client calls. It strictly validates Paystack's cryptographic signature (`x-paystack-signature`) using HMAC-SHA512.

```python
import hmac
import hashlib
import json
from fastapi import FastAPI, Request, Header, HTTPException
import routeros_api

app = FastAPI(title="CampusNet Billing Gateway")

PAYSTACK_SECRET_KEY = os.getenv("PAYSTACK_SECRET_KEY")  # Set in Render dashboard, never hardcode
MIKROTIK_HOST = "192.168.88.1"
MIKROTIK_USER = "api_billing"
MIKROTIK_PASS = "YourSecureRouterApiPassword"

@app.post("/webhook/paystack")
async def paystack_webhook(request: Request, x_paystack_signature: str = Header(None)):
    body_bytes = await request.body()
    
    # 1. Verify Cryptographic Signature
    computed_sig = hmac.new(
        PAYSTACK_SECRET_KEY.encode('utf-8'),
        body_bytes,
        hashlib.sha512
    ).hexdigest()
    
    if computed_sig != x_paystack_signature:
        raise HTTPException(status_code=400, detail="Invalid HMAC signature")
        
    payload = json.loads(body_bytes.decode('utf-8'))
    
    # 2. Check for successful charge
    if payload.get("event") == "charge.success":
        data = payload["data"]
        amount = data["amount"] / 100 # Converted from KES cents
        metadata = data.get("metadata", {})
        mac_address = metadata.get("mac_address")
        phone = data.get("customer", {}).get("phone")
        
        # 3. Determine Duration from Amount
        uptime_limit = "24h"
        if amount >= 500:
            uptime_limit = "30d"
        elif amount >= 150:
            uptime_limit = "7d"
        elif amount >= 40:
            uptime_limit = "24h"
        elif amount >= 20:
            uptime_limit = "3h"
            
        # 4. Connect to MikroTik API and Authorize User
        provision_hotspot_user(mac_address, phone, uptime_limit)
        
    return {"status": "success"}

def provision_hotspot_user(mac: str, phone: str, uptime: str):
    connection = routeros_api.RouterOsApiPool(
        MIKROTIK_HOST,
        username=MIKROTIK_USER,
        password=MIKROTIK_PASS,
        plaintext_login=True
    )
    api = connection.get_api()
    hotspot_user_resource = api.get_resource('/ip/hotspot/user')
    
    # Add or update user bound to physical MAC
    hotspot_user_resource.add(
        name=mac,
        password=mac,
        mac_address=mac,
        profile="Standard_Pass",
        limit_uptime=uptime,
        comment=f"Paid via Paystack - Phone: {phone}"
    )
    connection.disconnect()
```

---

## 3. Captive Portal Frontend (`login.html`) Specification

The portal lives inside `/flash/hotspot/login.html` on the MikroTik router.
* **Size Constraint:** Must remain **under 100 KB** total (CSS inline, no heavy images or external CDN scripts) to load instantly over weak 2.4 GHz signal.
* **Auto-Pop Compatibility:** Uses standard Apple CNA (Captive Network Assistant) and Android Captive Portal detection tags.
* **Parameters Passed to Backend:**
  * Auto-reads the client's MAC from MikroTik's native variable: `$(mac)`.
  * Auto-reads the client's IP from: `$(ip)`.
  * Passes `mac` into Paystack's transaction metadata.
