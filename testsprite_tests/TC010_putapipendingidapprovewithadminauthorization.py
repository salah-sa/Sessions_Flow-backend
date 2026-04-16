import requests
import time

BASE_URL = "http://localhost:5180"
LOGIN_ENDPOINT = "/api/auth/login"
PENDING_APPROVE_ENDPOINT = "/api/pending/{id}/approve"
REGISTER_ENDPOINT = "/api/auth/register"

ADMIN_EMAIL = "admin@sessionflow.local"
ADMIN_PASSWORD = "Admin1234!"

TIMEOUT = 30


def test_put_api_pending_id_approve_with_admin_authorization():
    # Step 1: Authenticate as admin to get token
    login_payload = {
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    }
    login_resp = requests.post(
        BASE_URL + LOGIN_ENDPOINT,
        json=login_payload,
        timeout=TIMEOUT
    )
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    token = login_resp.json().get("token")
    assert token, "No token received from login"

    headers = {
        "Authorization": f"Bearer {token}"
    }

    # Step 2: Create a new pending engineer to get a valid pending ID
    unique_email = f"pending{int(time.time())}@sessionflow.local"
    register_payload = {
        "name": "Pending Engineer",
        "email": unique_email,
        "password": "SomePassword123!",
        "accessCode": "ENG1"
    }
    register_resp = requests.post(
        BASE_URL + REGISTER_ENDPOINT,
        json=register_payload,
        timeout=TIMEOUT
    )
    assert register_resp.status_code == 201, f"Register failed: {register_resp.text}"
    pending_engineer = register_resp.json()

    # Try to get 'id' directly or nested
    pending_id = pending_engineer.get("id")
    if not pending_id and isinstance(pending_engineer, dict):
        # check if nested under 'engineer'
        pending_id = pending_engineer.get("engineer", {}).get("id")
    assert pending_id, f"No pending engineer ID returned in response: {register_resp.text}"

    # Step 3: Approve the pending engineer using PUT /api/pending/{id}/approve
    approve_resp = requests.put(
        BASE_URL + PENDING_APPROVE_ENDPOINT.format(id=pending_id),
        headers=headers,
        timeout=TIMEOUT
    )
    assert approve_resp.status_code == 200, f"Approve failed: {approve_resp.text}"


test_put_api_pending_id_approve_with_admin_authorization()
