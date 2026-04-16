import requests
from requests.auth import HTTPBasicAuth

BASE_URL = "http://localhost:5180"


def test_get_api_auth_me_authenticated_user():
    login_url = f"{BASE_URL}/api/auth/login"
    auth_me_url = f"{BASE_URL}/api/auth/me"

    login_payload = {
        "Identifier": "admin@sessionflow.local",
        "Password": "Admin1234!"
    }

    try:
        # Authenticate and get JWT token
        login_resp = requests.post(login_url, json=login_payload, timeout=30)
        assert login_resp.status_code == 200, f"Login failed with status {login_resp.status_code}"
        login_data = login_resp.json()
        token = login_data.get("token")
        assert token, "JWT token not found in login response"

        # Use JWT token to get the authenticated user's profile
        headers = {
            "Authorization": f"Bearer {token}"
        }
        auth_me_resp = requests.get(auth_me_url, headers=headers, timeout=30)
        assert auth_me_resp.status_code == 200, f"GET /api/auth/me failed with status {auth_me_resp.status_code}"

        user_profile = auth_me_resp.json()
        assert isinstance(user_profile, dict), "User profile response is not a JSON object"
        # Basic checks for expected user profile fields, if known, could be added here as well

    except requests.RequestException as e:
        assert False, f"Request failed: {e}"


test_get_api_auth_me_authenticated_user()