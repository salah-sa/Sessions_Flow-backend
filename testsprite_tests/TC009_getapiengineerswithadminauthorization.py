import requests

BASE_URL = "http://localhost:5180"
LOGIN_URL = f"{BASE_URL}/api/auth/login"
ENGINEERS_URL = f"{BASE_URL}/api/engineers"
TIMEOUT = 30

def test_get_api_engineers_with_admin_authorization():
    # Login with admin credentials to get JWT token containing Admin claim
    login_payload = {
        "email": "admin@sessionflow.local",
        "password": "Admin1234!"
    }
    try:
        login_resp = requests.post(LOGIN_URL, json=login_payload, timeout=TIMEOUT)
        assert login_resp.status_code == 200, f"Login failed with status {login_resp.status_code}"
        login_data = login_resp.json()
        assert "token" in login_data, "JWT token not found in login response"
        token = login_data["token"]
    except (requests.RequestException, AssertionError) as e:
        raise AssertionError(f"Authentication failed: {str(e)}")

    headers = {
        "Authorization": f"Bearer {token}"
    }
    try:
        resp = requests.get(ENGINEERS_URL, headers=headers, timeout=TIMEOUT)
        assert resp.status_code == 200, f"Expected 200 OK, got {resp.status_code}"
        engineers_list = resp.json()
        assert isinstance(engineers_list, list), "Expected list of engineers"
    except (requests.RequestException, AssertionError) as e:
        raise AssertionError(f"Fetching engineers failed: {str(e)}")

test_get_api_engineers_with_admin_authorization()