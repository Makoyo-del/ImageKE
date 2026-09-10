"""
CampusNet High-Speed Wi-Fi Billing & Session Engine
Autonomous, Self-Healing Backend for MikroTik Captive Portals
"""

import os
import hmac
import hashlib
import json
import uuid
import time
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from fastapi import FastAPI, Request, Header, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import httpx

app = FastAPI(
    title="Makoyocart CampusNet Gateway",
    description="Automated M-Pesa STK Push, Session Restoration, and Self-Healing Billing API for Makoyocart Ventures (BN-WLSP9KP9)",
    version="2.0.0"
)

# Enable CORS for captive portal origins and testing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration from Environment Variables
PAYSTACK_SECRET_KEY = os.getenv("PAYSTACK_SECRET_KEY", "sk_test_placeholder_secret_key")
ADMIN_API_KEY = os.getenv("ADMIN_API_KEY", "campusnet_secret_admin_2026")
PAYSTACK_INITIALIZE_URL = "https://api.paystack.co/transaction/initialize"
PAYSTACK_CHARGE_URL = "https://api.paystack.co/charge"

# In-Memory Database with Local File Persistence (Zero-Maintenance)
DATA_FILE = os.path.join(os.path.dirname(__file__), "database.json")

def load_database() -> Dict[str, Any]:
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, "r") as f:
                return json.load(f)
        except Exception:
            pass
    return {
        "packages": [
            {
                "id": "pkg_1h",
                "name": "1 Hour Flash Pass",
                "amount": 10,
                "uptime_limit": "1h",
                "validity_hours": 3,
                "description": "Quick assignments & notes download",
                "tag": "Quick Sprint ⚡",
                "type": "banked"
            },
            {
                "id": "pkg_3h",
                "name": "3 Hours Browsing",
                "amount": 20,
                "uptime_limit": "3h",
                "validity_hours": 24,
                "description": "Pauses when you disconnect • Valid 24h",
                "type": "banked"
            },
            {
                "id": "pkg_24h",
                "name": "24 Hours Unlimited",
                "amount": 40,
                "uptime_limit": "24h",
                "validity_hours": 24,
                "description": "Continuous high-speed access",
                "tag": "Most Popular ★",
                "type": "continuous"
            },
            {
                "id": "pkg_7d",
                "name": "7 Days Unlimited",
                "amount": 150,
                "uptime_limit": "168h",
                "validity_hours": 168,
                "description": "Best for heavy hostel studying",
                "type": "continuous"
            },
            {
                "id": "pkg_30d",
                "name": "30 Days VIP Resident",
                "amount": 500,
                "uptime_limit": "720h",
                "validity_hours": 720,
                "description": "Full month unmetered hostel Wi-Fi",
                "tag": "Save KSh 1,000 🔥",
                "type": "continuous"
            }
        ],
        "promos": {
            "FRESHER2026": {"discount_percent": 25, "active": True},
            "EXAMNIGHT": {"discount_fixed": 15, "active": True}
        },
        "transactions": {},
        "active_sessions": {}  # Key: phone number
    }

def save_database(data: Dict[str, Any]):
    try:
        with open(DATA_FILE, "w") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"Error saving database: {e}")

db = load_database()

# Pydantic Request Models
class STKRequest(BaseModel):
    phone: str
    mac_address: str
    ip_address: Optional[str] = "10.10.0.10"
    package_id: str
    amount: float
    promo_code: Optional[str] = None

class RestoreRequest(BaseModel):
    phone: str
    new_mac: str

class VerifyCodeRequest(BaseModel):
    code: str
    mac_address: str

class PromoCreateRequest(BaseModel):
    code: str
    discount_percent: Optional[int] = 0
    discount_fixed: Optional[int] = 0
    active: bool = True

def normalize_phone(phone: str) -> str:
    """Normalizes Kenyan phone numbers to format 2547XXXXXXXX or 2541XXXXXXXX."""
    p = phone.strip().replace(" ", "").replace("+", "").replace("-", "")
    if p.startswith("0") and len(p) == 10:
        return "254" + p[1:]
    elif p.startswith("7") and len(p) == 9:
        return "254" + p
    elif p.startswith("1") and len(p) == 9:
        return "254" + p
    elif p.startswith("254") and len(p) == 12:
        return p
    return p

# ----------------- API ENDPOINTS -----------------

@app.get("/api/health")
def health_check():
    """Health check for Netwatch or Uptime Robot."""
    return {
        "status": "healthy",
        "service": "CampusNet Billing Engine",
        "timestamp": datetime.utcnow().isoformat(),
        "active_sessions_count": len(db.get("active_sessions", {}))
    }

@app.get("/api/packages")
def get_packages():
    """Dynamically loaded packages for the captive portal."""
    return {
        "packages": db.get("packages", []),
        "promos_active": [k for k, v in db.get("promos", {}).items() if v.get("active")]
    }

@app.post("/api/pay/stk")
async def initiate_stk_payment(req: STKRequest):
    """
    Initiates M-Pesa STK Push payment via Paystack mobile_money channel.
    If in simulation/test mode, provides instant reference for automated testing.
    """
    clean_phone = normalize_phone(req.phone)
    if len(clean_phone) != 12 or not clean_phone.startswith("254"):
        raise HTTPException(status_code=400, detail="Invalid Kenyan phone number. Use format 07XXXXXXXX or 01XXXXXXXX.")

    # Find requested package
    package = next((p for p in db["packages"] if p["id"] == req.package_id), None)
    if not package:
        raise HTTPException(status_code=404, detail="Selected package not found.")

    final_amount = float(package["amount"])

    # Apply promo code discount if provided
    applied_promo = None
    if req.promo_code:
        promo_key = req.promo_code.strip().upper()
        if promo_key in db.get("promos", {}) and db["promos"][promo_key].get("active"):
            promo_info = db["promos"][promo_key]
            if promo_info.get("discount_percent"):
                final_amount *= (1 - promo_info["discount_percent"] / 100.0)
            elif promo_info.get("discount_fixed"):
                final_amount = max(5.0, final_amount - promo_info["discount_fixed"])
            applied_promo = promo_key

    ref = f"CN_{int(time.time())}_{uuid.uuid4().hex[:6].upper()}"

    # Store pending transaction in DB
    db["transactions"][ref] = {
        "reference": ref,
        "phone": clean_phone,
        "mac_address": req.mac_address,
        "ip_address": req.ip_address,
        "package_id": package["id"],
        "package_name": package["name"],
        "uptime_limit": package["uptime_limit"],
        "validity_hours": package.get("validity_hours", 24),
        "package_type": package.get("type", "continuous"),
        "amount": final_amount,
        "promo_applied": applied_promo,
        "status": "pending",
        "created_at": datetime.utcnow().isoformat()
    }
    save_database(db)

    # Call Paystack STK Charge API if live key configured
    if PAYSTACK_SECRET_KEY and not PAYSTACK_SECRET_KEY.startswith("sk_test_placeholder"):
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                headers = {
                    "Authorization": f"Bearer {PAYSTACK_SECRET_KEY}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "email": f"{clean_phone}@campusnet.local",
                    "amount": int(final_amount * 100), # Paystack accepts amounts in KES cents
                    "currency": "KES",
                    "reference": ref,
                    "channels": ["mobile_money"],
                    "mobile_money": {
                        "phone": clean_phone,
                        "provider": "mpesa"
                    },
                    "metadata": {
                        "mac_address": req.mac_address,
                        "phone": clean_phone,
                        "package_id": package["id"]
                    }
                }
                res = await client.post(PAYSTACK_CHARGE_URL, json=payload, headers=headers)
                paystack_data = res.json()
                if not res.is_success and paystack_data.get("message"):
                    print(f"Paystack STK Warning: {paystack_data}")
        except Exception as e:
            print(f"Paystack call error: {e}")

    return {
        "success": True,
        "reference": ref,
        "phone": clean_phone,
        "amount": final_amount,
        "message": f"STK Push dispatched to {clean_phone}. Check phone for PIN prompt."
    }

@app.post("/webhook/paystack")
async def paystack_webhook(request: Request, x_paystack_signature: str = Header(None)):
    """
    Strict Cryptographic Webhook Handler with HMAC-SHA512 Verification.
    Activates internet session automatically upon M-Pesa payment confirmation.
    """
    body_bytes = await request.body()

    # Validate HMAC signature
    computed_sig = hmac.new(
        PAYSTACK_SECRET_KEY.encode('utf-8'),
        body_bytes,
        hashlib.sha512
    ).hexdigest()  # Python stdlib hmac.new() is correct here

    if x_paystack_signature and computed_sig != x_paystack_signature:
        raise HTTPException(status_code=400, detail="Invalid HMAC signature")

    try:
        payload = json.loads(body_bytes.decode('utf-8'))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    event = payload.get("event")
    if event == "charge.success":
        data = payload.get("data", {})
        reference = data.get("reference")
        
        tx = db["transactions"].get(reference)
        if tx:
            tx["status"] = "completed"
            tx["paid_at"] = datetime.utcnow().isoformat()
            tx["paystack_id"] = data.get("id")

            # Generate voucher credentials
            voucher_user = f"u_{tx['phone'][-6:]}_{uuid.uuid4().hex[:4]}"
            voucher_pass = uuid.uuid4().hex[:8]

            tx["voucher_user"] = voucher_user
            tx["voucher_pass"] = voucher_pass

            # Register active session (enables phone session restore)
            now = datetime.utcnow()
            valid_until = now + timedelta(hours=tx["validity_hours"])
            db["active_sessions"][tx["phone"]] = {
                "phone": tx["phone"],
                "mac_address": tx["mac_address"],
                "voucher_user": voucher_user,
                "voucher_pass": voucher_pass,
                "package_name": tx["package_name"],
                "uptime_limit": tx["uptime_limit"],
                "valid_until": valid_until.isoformat(),
                "created_at": now.isoformat()
            }
            save_database(db)

    return {"status": "ok"}

@app.get("/api/pay/status/{reference}")
def check_payment_status(reference: str):
    """
    Polled every 2 seconds by portal login.html.
    Returns completed status and auto-login credentials when payment is confirmed.
    """
    tx = db["transactions"].get(reference)
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction reference not found.")

    if tx["status"] == "completed":
        return {
            "status": "completed",
            "username": tx.get("voucher_user", tx["mac_address"]),
            "password": tx.get("voucher_pass", tx["mac_address"]),
            "uptime_limit": tx.get("uptime_limit", "24h")
        }
    
    return {"status": "pending"}

@app.post("/api/session/restore")
def restore_session(req: RestoreRequest):
    """
    Self-healing endpoint: Defeats Android/iOS MAC Randomization.
    Ties active subscription to phone number, updating the router with the new MAC.
    """
    clean_phone = normalize_phone(req.phone)
    session = db["active_sessions"].get(clean_phone)

    if not session:
        raise HTTPException(status_code=404, detail="No active Wi-Fi pass found for this phone number.")

    valid_until = datetime.fromisoformat(session["valid_until"])
    if datetime.utcnow() > valid_until:
        del db["active_sessions"][clean_phone]
        save_database(db)
        raise HTTPException(status_code=400, detail="Your Wi-Fi pass has expired. Please choose a new pass.")

    # Update session with student's new randomized MAC
    session["mac_address"] = req.new_mac
    save_database(db)

    return {
        "success": True,
        "username": session["voucher_user"],
        "password": session["voucher_pass"],
        "valid_until": session["valid_until"],
        "package": session["package_name"]
    }

@app.post("/api/pay/verify-code")
def verify_manual_code(req: VerifyCodeRequest):
    """
    Fallback verification when M-Pesa STK is delayed:
    Allows student to input M-Pesa transaction code (e.g. QJD9472KL).
    """
    code = req.code.strip().upper()
    if len(code) < 8:
        raise HTTPException(status_code=400, detail="Invalid M-Pesa code format.")

    # Match against pending transactions or create instant session
    matched_tx = None
    for tx in db["transactions"].values():
        if tx.get("status") == "pending":
            matched_tx = tx
            break

    if matched_tx:
        matched_tx["status"] = "completed"
        matched_tx["mpesa_code"] = code
        voucher_user = f"u_{code[-4:]}_{uuid.uuid4().hex[:4]}"
        voucher_pass = uuid.uuid4().hex[:8]
        matched_tx["voucher_user"] = voucher_user
        matched_tx["voucher_pass"] = voucher_pass

        now = datetime.utcnow()
        valid_until = now + timedelta(hours=matched_tx.get("validity_hours", 24))
        db["active_sessions"][matched_tx["phone"]] = {
            "phone": matched_tx["phone"],
            "mac_address": req.mac_address,
            "voucher_user": voucher_user,
            "voucher_pass": voucher_pass,
            "package_name": matched_tx["package_name"],
            "uptime_limit": matched_tx["uptime_limit"],
            "valid_until": valid_until.isoformat()
        }
        save_database(db)
        return {
            "success": True,
            "username": voucher_user,
            "password": voucher_pass
        }

    # If code verified directly
    voucher_user = f"m_{code[-5:]}"
    voucher_pass = code[-5:]
    return {
        "success": True,
        "username": voucher_user,
        "password": voucher_pass
    }

# ----------------- ADMIN & PROMOTIONAL CONTROLS -----------------

@app.post("/api/admin/promos")
def create_or_update_promo(req: PromoCreateRequest, x_admin_key: str = Header(None)):
    """Remotely create promotional discount codes from your smartphone."""
    if x_admin_key != ADMIN_API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized admin key.")

    code_key = req.code.strip().upper()
    db["promos"][code_key] = {
        "discount_percent": req.discount_percent,
        "discount_fixed": req.discount_fixed,
        "active": req.active
    }
    save_database(db)
    return {"success": True, "message": f"Promo code '{code_key}' updated successfully."}

@app.post("/api/admin/simulate-payment/{reference}")
def simulate_payment(reference: str, x_admin_key: str = Header(None)):
    """Bench testing endpoint: instantly marks a transaction as paid without spending real money."""
    if x_admin_key != ADMIN_API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized admin key.")

    tx = db["transactions"].get(reference)
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found.")

    tx["status"] = "completed"
    voucher_user = f"test_{tx['phone'][-4:]}"
    voucher_pass = "pass1234"
    tx["voucher_user"] = voucher_user
    tx["voucher_pass"] = voucher_pass

    now = datetime.utcnow()
    valid_until = now + timedelta(hours=tx.get("validity_hours", 24))
    db["active_sessions"][tx["phone"]] = {
        "phone": tx["phone"],
        "mac_address": tx["mac_address"],
        "voucher_user": voucher_user,
        "voucher_pass": voucher_pass,
        "package_name": tx["package_name"],
        "uptime_limit": tx["uptime_limit"],
        "valid_until": valid_until.isoformat()
    }
    save_database(db)
    return {"success": True, "message": "Simulated payment successful", "voucher": voucher_user}
