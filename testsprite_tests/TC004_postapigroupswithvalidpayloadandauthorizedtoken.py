import requests

BASE_URL = "http://localhost:5180"
LOGIN_URL = f"{BASE_URL}/api/auth/login"
GROUPS_URL = f"{BASE_URL}/api/groups"
TIMEOUT = 30

def test_post_api_groups_with_valid_payload_and_authorized_token():
    # Step 1: Authenticate to get a valid JWT token using provided admin credentials
    auth_payload = {
        "email": "admin@sessionflow.local",
        "password": "Admin1234!"
    }
    try:
        login_resp = requests.post(LOGIN_URL, json=auth_payload, timeout=TIMEOUT)
        assert login_resp.status_code == 200, f"Login failed with status {login_resp.status_code}"
        login_data = login_resp.json()
        token = login_data.get("token") or login_data.get("jwt") or login_data.get("accessToken")
        assert token, "JWT token not found in login response"
    except requests.RequestException as e:
        assert False, f"Login request error: {e}"

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # Step 2: Prepare valid group payload
    group_payload = {
        "name": "Test Group TC004",
        "tags": [],
        "cohort": None
    }

    group_id = None
    try:
        # Step 3: POST /api/groups with Authorization header and valid payload
        resp = requests.post(GROUPS_URL, json=group_payload, headers=headers, timeout=TIMEOUT)
        assert resp.status_code == 201, f"Expected 201 Created, got {resp.status_code}"
        resp_data = resp.json()
        assert "id" in resp_data, "Response does not contain new group id"
        group_id = resp_data["id"]
    except requests.RequestException as e:
        assert False, f"POST /api/groups request error: {e}"
    finally:
        # Cleanup: DELETE the created group to maintain test environment (if API supports DELETE)
        # If DELETE not supported or endpoint unknown, omit or implement alternative cleanup.
        if group_id:
            try:
                requests.delete(f"{GROUPS_URL}/{group_id}", headers=headers, timeout=TIMEOUT)
            except requests.RequestException:
                pass

test_post_api_groups_with_valid_payload_and_authorized_token()
