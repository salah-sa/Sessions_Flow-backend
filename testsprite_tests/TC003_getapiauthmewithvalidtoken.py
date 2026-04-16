import requests

BASE_URL = "http://localhost:5180"
LOGIN_URL = f"{BASE_URL}/api/auth/login"
ME_URL = f"{BASE_URL}/api/auth/me"
EMAIL = "admin@sessionflow.local"
PASSWORD = "Admin1234!"
TIMEOUT = 30


def test_get_api_auth_me_with_valid_token():
    try:
        # Step 1: Authenticate to get a JWT token
        login_payload = {
            "email": EMAIL,
            "password": PASSWORD
        }
        login_response = requests.post(LOGIN_URL, json=login_payload, timeout=TIMEOUT)
        assert login_response.status_code == 200, f"Login failed with status {login_response.status_code}"
        login_json = login_response.json()
        assert "token" in login_json, "JWT token not found in login response"
        token = login_json["token"]

        headers = {
            "Authorization": f"Bearer {token}"
        }
        # Step 2: Use token to get current user profile
        me_response = requests.get(ME_URL, headers=headers, timeout=TIMEOUT)
        assert me_response.status_code == 200, f"GET /api/auth/me failed with status {me_response.status_code}"
        me_json = me_response.json()
        # Validate that response has expected user info fields (typically at least email)
        assert "email" in me_json, "User profile missing 'email'"
        assert me_json["email"].lower() == EMAIL.lower(), "Returned user email does not match login email"
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"


test_get_api_auth_me_with_valid_token()