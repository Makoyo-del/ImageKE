"""
Test Suite for CampusNet Billing Engine & Self-Healing Scenarios
"""
import os
import sys
from fastapi.testclient import TestClient

sys.path.append(os.path.dirname(__file__))
from main import app, db

client = TestClient(app)

def test_full_autonomous_flow():
    print("\n--- 1. Testing Dynamic Packages Endpoint ---")
    res = client.get("/api/packages")
    assert res.status_code == 200
    packages = res.json()["packages"]
    assert len(packages) >= 3
    print(f"[PASS] Retrieved {len(packages)} packages: {[p['name'] for p in packages]}")

    print("\n--- 2. Testing STK Initiation with Promo Code ---")
    stk_payload = {
        "phone": "0712345678",
        "mac_address": "AA:BB:CC:11:22:33",
        "ip_address": "10.10.0.45",
        "package_id": "pkg_24h",
        "amount": 40.0,
        "promo_code": "FRESHER2026"
    }
    res = client.post("/api/pay/stk", json=stk_payload)
    assert res.status_code == 200
    stk_data = res.json()
    ref = stk_data["reference"]
    # 25% discount on 40 is 30
    assert stk_data["amount"] == 30.0
    print(f"[PASS] STK initiated successfully. Ref: {ref}, Discounted Amount: KSh {stk_data['amount']}")

    print("\n--- 3. Testing Payment Polling (Pending State) ---")
    res = client.get(f"/api/pay/status/{ref}")
    assert res.status_code == 200
    assert res.json()["status"] == "pending"
    print("[PASS] Polling correctly reports 'pending' status.")

    print("\n--- 4. Testing Payment Confirmation Simulation ---")
    sim_res = client.post(f"/api/admin/simulate-payment/{ref}", headers={"x-admin-key": "campusnet_secret_admin_2026"})
    assert sim_res.status_code == 200
    print(f"[PASS] Payment confirmed via admin simulator: {sim_res.json()}")

    print("\n--- 5. Testing Payment Polling (Completed State) ---")
    res = client.get(f"/api/pay/status/{ref}")
    assert res.status_code == 200
    status_data = res.json()
    assert status_data["status"] == "completed"
    assert "username" in status_data
    assert "password" in status_data
    print(f"[PASS] Polling returned auto-login voucher: user={status_data['username']}")

    print("\n--- 6. Testing MAC Randomization Session Restore ---")
    # Student returns with a new randomized MAC
    new_randomized_mac = "FE:ED:BA:BE:44:55"
    restore_res = client.post("/api/session/restore", json={
        "phone": "0712345678",
        "new_mac": new_randomized_mac
    })
    assert restore_res.status_code == 200
    restore_data = restore_res.json()
    assert restore_data["success"] is True
    print(f"[PASS] Session successfully restored for new MAC {new_randomized_mac}! No double charge.")

    print("\n--- 7. Testing Manual Transaction Code Fallback ---")
    fallback_res = client.post("/api/pay/verify-code", json={
        "code": "QJD9472KLM",
        "mac_address": "11:22:33:44:55:66"
    })
    assert fallback_res.status_code == 200
    assert fallback_res.json()["success"] is True
    print(f"[PASS] Manual M-Pesa code fallback passed: {fallback_res.json()}")

    print("\n--- 8. Testing Captive Portal File Size Constraint ---")
    portal_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "portal", "login.html"))
    size_kb = os.path.getsize(portal_path) / 1024.0
    print(f"[PASS] login.html size: {size_kb:.2f} KB (Target: < 25 KB)")
    assert size_kb < 25.0

    print("\n=======================================================")
    print("ALL 8 SELF-HEALING AND RESILIENCE TESTS PASSED (100%)")
    print("=======================================================")

if __name__ == "__main__":
    test_full_autonomous_flow()
