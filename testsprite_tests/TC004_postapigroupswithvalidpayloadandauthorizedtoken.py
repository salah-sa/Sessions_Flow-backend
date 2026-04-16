import requests

BASE_URL = "http://localhost:5180"
ADMIN_EMAIL = "admin@sessionflow.local"
ADMIN_PASSWORD = "Admin1234!"
TIMEOUT = 30

def test_post_api_groups_with_valid_payload_and_authorized_token():
    # Authenticate as admin to get Bearer token
    login_url = f"{BASE_URL}/api/auth/login"
    login_payload = {"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    login_resp = requests.post(login_url, json=login_payload, timeout=TIMEOUT)
    assert login_resp.status_code == 200, f"Admin login failed: {login_resp.text}"
    token = login_resp.json().get("token")
    assert token, "Bearer token missing in login response"

    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    group_payload = {
        "name": "Test Group TC004",
        "level": 2,
        "tags": []
    }

    create_group_url = f"{BASE_URL}/api/groups"
    resp = requests.post(create_group_url, headers=headers, json=group_payload, timeout=TIMEOUT)

    assert resp.status_code == 201, f"Expected 201 Created, got {resp.status_code}: {resp.text}"

    resp_json = resp.json()
    group_id = resp_json.get("id")
    assert group_id is not None, f"Response JSON missing group id: {resp.text}"

    if "status" in resp_json:
        assert resp_json["status"].lower() in ("created", "success"), f"Unexpected status value: {resp_json['status']}"

    try:
        pass
    finally:
        delete_url = f"{BASE_URL}/api/groups/{group_id}"
        delete_resp = requests.delete(delete_url, headers=headers, timeout=TIMEOUT)
        assert delete_resp.status_code in (200, 204), f"Failed to delete created group: {delete_resp.text}"

test_post_api_groups_with_valid_payload_and_authorized_token()
