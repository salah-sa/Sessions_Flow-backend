import requests

BASE_URL = "http://localhost:5180"
TIMEOUT = 30

def test_get_api_engineers_with_admin_authorization():
    # Use known admin credentials to obtain JWT token with Admin claim
    login_url = f"{BASE_URL}/api/auth/login"
    admin_credentials = {
        "email": "admin@example.com",
        "password": "AdminPassword123!"
    }

    try:
        login_resp = requests.post(login_url, json=admin_credentials, timeout=TIMEOUT)
        assert login_resp.status_code == 200, f"Expected 200 OK from login, got {login_resp.status_code}"
        token = login_resp.json().get("token")
        assert token, "JWT token not found in login response"

        headers = {
            "Authorization": f"Bearer {token}"
        }

        engineers_url = f"{BASE_URL}/api/engineers"
        resp = requests.get(engineers_url, headers=headers, timeout=TIMEOUT)

        assert resp.status_code == 200, f"Expected 200 OK from GET /api/engineers, got {resp.status_code}"

        data = resp.json()
        assert isinstance(data, list), "Response payload should be a list of engineers"

        # Each item should be a dict (engineer object) with at least an 'id' key or other identifying fields
        for engineer in data:
            assert isinstance(engineer, dict), "Each engineer should be a dictionary"
            assert "id" in engineer or "email" in engineer, "Engineer object missing expected keys"

    except requests.RequestException as e:
        assert False, f"HTTP request failed: {e}"

test_get_api_engineers_with_admin_authorization()