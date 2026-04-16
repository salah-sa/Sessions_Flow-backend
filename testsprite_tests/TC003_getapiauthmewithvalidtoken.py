import requests

BASE_URL = "http://localhost:5180"
LOGIN_ENDPOINT = "/api/auth/login"
AUTH_ME_ENDPOINT = "/api/auth/me"
TIMEOUT = 30

def test_getapiauthmewithvalidtoken():
    login_url = BASE_URL + LOGIN_ENDPOINT
    auth_me_url = BASE_URL + AUTH_ME_ENDPOINT

    login_payload = {
        "email": "admin@sessionflow.local",
        "password": "Admin1234!"
    }
    headers = {
        "Content-Type": "application/json"
    }
    try:
        # Login to get JWT token
        login_resp = requests.post(login_url, json=login_payload, headers=headers, timeout=TIMEOUT)
        assert login_resp.status_code == 200, f"Login failed with status code {login_resp.status_code}"
        login_data = login_resp.json()
        token = login_data.get("token")
        assert token and isinstance(token, str), "JWT token not found in login response"

        # Use token to access /api/auth/me
        auth_headers = {
            "Authorization": f"Bearer {token}"
        }
        auth_me_resp = requests.get(auth_me_url, headers=auth_headers, timeout=TIMEOUT)
        assert auth_me_resp.status_code == 200, f"/api/auth/me failed with status code {auth_me_resp.status_code}"
        user_profile = auth_me_resp.json()
        assert isinstance(user_profile, dict), "User profile response is not a JSON object"
        assert "email" in user_profile, "User profile does not contain 'email'"
        assert user_profile["email"].lower() == "admin@sessionflow.local", "User email in profile does not match login email"

    except requests.RequestException as e:
        assert False, f"HTTP request failed: {e}"

test_getapiauthmewithvalidtoken()