import requests

def test_post_api_auth_login_with_valid_credentials():
    base_url = "http://localhost:5180"
    url = f"{base_url}/api/auth/login"
    headers = {
        "Content-Type": "application/json"
    }
    # Assuming these credentials are valid for the test environment.
    payload = {
        "email": "validuser@example.com",
        "password": "ValidPassword123!"
    }
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        assert response.status_code == 200, f"Expected status code 200, got {response.status_code}"
        json_response = response.json()
        assert "token" in json_response or "jwt" in json_response, "JWT token missing from response"
        token = json_response.get("token") or json_response.get("jwt")
        assert isinstance(token, str) and len(token) > 0, "JWT token is empty or not a string"
    except requests.exceptions.RequestException as e:
        assert False, f"Request failed: {e}"

test_post_api_auth_login_with_valid_credentials()