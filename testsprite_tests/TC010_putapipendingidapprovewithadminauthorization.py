import requests

BASE_URL = "http://localhost:5180"
LOGIN_URL = f"{BASE_URL}/api/auth/login"
PENDING_APPROVE_URL_TEMPLATE = f"{BASE_URL}/api/pending/{{}}/approve"
AUTH_HEADER_TEMPLATE = "Bearer {}"
TIMEOUT = 30

admin_email = "admin@sessionflow.local"
admin_password = "Admin1234!"

def test_putapipendingidapprovewithadminauthorization():
    # Step 1: Login as admin to get JWT token
    login_payload = {
        "email": admin_email,
        "password": admin_password
    }
    login_resp = requests.post(LOGIN_URL, json=login_payload, timeout=TIMEOUT)
    assert login_resp.status_code == 200, f"Admin login failed: {login_resp.text}"
    login_data = login_resp.json()
    assert "token" in login_data, "No token in login response"
    admin_token = login_data["token"]

    headers_auth = {
        "Authorization": AUTH_HEADER_TEMPLATE.format(admin_token)
    }

    # Step 2: Get a pending engineer ID to approve
    # We do this by listing engineers and filtering those with status 'pending'
    engineers_resp = requests.get(f"{BASE_URL}/api/engineers", headers=headers_auth, timeout=TIMEOUT)
    assert engineers_resp.status_code == 200, f"Failed to get engineers: {engineers_resp.text}"
    engineers_list = engineers_resp.json()
    pending_engineer = None
    if isinstance(engineers_list, list):
        for eng in engineers_list:
            if eng.get("status", "").lower() == "pending" and "id" in eng:
                pending_engineer = eng
                break
    assert pending_engineer is not None, "No pending engineer found to approve"
    pending_id = pending_engineer["id"]

    # Step 3: Call PUT /api/pending/{id}/approve with admin authorization
    approve_url = PENDING_APPROVE_URL_TEMPLATE.format(pending_id)
    approve_resp = requests.put(approve_url, headers=headers_auth, timeout=TIMEOUT)
    assert approve_resp.status_code == 200, f"Approval failed: {approve_resp.text}"

    # Optionally verify response content that confirms approval (e.g. status changed)
    approve_data = approve_resp.json()
    # Assuming response has a field 'approved' or 'status'
    assert ("approved" in approve_data and approve_data["approved"] is True) or \
           ("status" in approve_data and approve_data["status"].lower() == "approved"), \
           f"Approval confirmation missing or invalid: {approve_resp.text}"

test_putapipendingidapprovewithadminauthorization()