import requests

def test_post_api_auth_login_with_valid_credentials():
    url = "http://localhost:5180/api/auth/login"
    payload = {
        "email": "admin@sessionflow.local",
        "password": "Admin1234!"
    }
    headers = {
        "Content-Type": "application/json"
    }
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        response.raise_for_status()
    except requests.RequestException as e:
        assert False, f"Request to {url} failed: {e}"

    assert response.status_code == 200, f"Expected 200 OK, got {response.status_code}"
    json_data = response.json()
    assert "token" in json_data or "jwt" in json_data, "Response JSON does not contain 'token' or 'jwt'"
    token = json_data.get("token") or json_data.get("jwt")
    assert isinstance(token, str) and len(token) > 0, "JWT token is empty or not a string"

test_post_api_auth_login_with_valid_credentials()