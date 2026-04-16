import requests

BASE_URL = "http://localhost:5180"
TIMEOUT = 30
VALID_EMAIL = "admin@example.com"
VALID_PASSWORD = "Password123!"

def test_get_api_auth_me_with_valid_token():
    login_url = f"{BASE_URL}/api/auth/login"
    me_url = f"{BASE_URL}/api/auth/me"
    login_payload = {
        "email": VALID_EMAIL,
        "password": VALID_PASSWORD
    }
    try:
        # Step 1: Login to get a valid JWT token
        login_response = requests.post(login_url, json=login_payload, timeout=TIMEOUT)
        assert login_response.status_code == 200, f"Login failed with status {login_response.status_code}"
        login_json = login_response.json()
        assert "token" in login_json, "JWT token not found in login response"
        token = login_json["token"]

        # Step 2: Use the token to call GET /api/auth/me
        headers = {
            "Authorization": f"Bearer {token}"
        }
        me_response = requests.get(me_url, headers=headers, timeout=TIMEOUT)
        assert me_response.status_code == 200, f"GET /api/auth/me failed with status {me_response.status_code}"
        user_profile = me_response.json()
        # Basic checks on user profile
        assert isinstance(user_profile, dict), "User profile response is not a JSON object"
        assert "email" in user_profile, "User profile missing email field"
        assert user_profile["email"].lower() == VALID_EMAIL.lower(), "User profile email does not match login email"
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

test_get_api_auth_me_with_valid_token()