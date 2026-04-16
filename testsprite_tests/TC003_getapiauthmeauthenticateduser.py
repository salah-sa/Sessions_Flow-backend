import requests

BASE_URL = "http://localhost:5180"
LOGIN_ENDPOINT = f"{BASE_URL}/api/auth/login"
AUTH_ME_ENDPOINT = f"{BASE_URL}/api/auth/me"
LOGIN_CREDENTIALS = {"Identifier": "admin@sessionflow.local", "Password": "Admin1234!"}
TIMEOUT = 30

def test_getapiauthmeauthenticateduser():
    try:
        # Authenticate and get JWT token
        login_resp = requests.post(
            LOGIN_ENDPOINT,
            json=LOGIN_CREDENTIALS,
            timeout=TIMEOUT
        )
        assert login_resp.status_code == 200, f"Login failed with status {login_resp.status_code}"
        login_data = login_resp.json()
        token = login_data.get("token")
        assert token, "Token not found in login response"

        # Use the JWT token to get authenticated user profile
        headers = {"Authorization": f"Bearer {token}"}
        me_resp = requests.get(
            AUTH_ME_ENDPOINT,
            headers=headers,
            timeout=TIMEOUT
        )
        assert me_resp.status_code == 200, f"GET /api/auth/me failed with status {me_resp.status_code}"
        user_profile = me_resp.json()
        assert isinstance(user_profile, dict), "User profile response is not a JSON object"
        # Basic fields check - token response indicates user object
        assert user_profile, "User profile is empty"
    except Exception as e:
        raise
    return

test_getapiauthmeauthenticateduser()