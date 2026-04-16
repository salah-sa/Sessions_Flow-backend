import requests
import uuid

BASE_URL = "http://localhost:5180"
LOGIN_URL = f"{BASE_URL}/api/auth/login"
REGISTER_URL = f"{BASE_URL}/api/auth/register"

ADMIN_EMAIL = "admin@sessionflow.local"
ADMIN_PASSWORD = "Admin1234!"


def test_postapiauthregisterwithvalidaccesscode():
    # First, login as admin to get token (required only if we needed admin token, not needed here for register)
    login_payload = {
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    }
    login_resp = requests.post(LOGIN_URL, json=login_payload, timeout=30)
    assert login_resp.status_code == 200, f"Admin login failed with status_code={login_resp.status_code}"
    admin_token = login_resp.json().get("token") or login_resp.json().get("jwt") or login_resp.json().get("accessToken")
    # The test case does not require admin token for register, so we do not use this token.

    # Prepare unique registration data per run to avoid conflicts
    unique_id = str(uuid.uuid4())[:8]
    register_payload = {
        "name": f"TestEngineer{unique_id}",
        "email": f"admin+{unique_id}@sessionflow.local",
        "password": "Password123!",
        "accessCode": "ENG1"
    }

    headers = {"Content-Type": "application/json"}

    try:
        # POST /api/auth/register with valid details
        register_resp = requests.post(REGISTER_URL, json=register_payload, headers=headers, timeout=30)
        assert register_resp.status_code == 201, f"Expected 201 Created, got {register_resp.status_code}"
        data = register_resp.json()
        # Extract registration status from response under 'engineer.status' as per PRD
        assert "engineer" in data and data["engineer"] is not None, "Response missing 'engineer' object"
        status = data["engineer"].get("status")
        assert status in ("pending", "active"), f"Unexpected registration status: {status}"

        # Then login with the new credentials
        new_login_payload = {
            "email": register_payload["email"],
            "password": register_payload["password"]
        }
        new_login_resp = requests.post(LOGIN_URL, json=new_login_payload, headers=headers, timeout=30)
        assert new_login_resp.status_code == 200, f"New user login failed with status {new_login_resp.status_code}"
        token = new_login_resp.json().get("token") or new_login_resp.json().get("jwt") or new_login_resp.json().get("accessToken")
        assert token and isinstance(token, str) and len(token) > 10, "JWT token missing or invalid"

    finally:
        # Cleanup: No direct delete endpoint exposed for engineers in PRD,
        # so no delete performed here. If needed, admin endpoints would be required.
        pass


test_postapiauthregisterwithvalidaccesscode()
