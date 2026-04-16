import requests

def test_post_api_auth_login_with_valid_credentials():
    base_url = "http://localhost:5180"
    url = f"{base_url}/api/auth/login"
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
        assert False, f"Request failed: {e}"

    assert response.status_code == 200, f"Expected status code 200 but got {response.status_code}"
    json_response = response.json()
    assert "token" in json_response, "Response JSON does not contain 'token'"
    assert isinstance(json_response["token"], str) and len(json_response["token"]) > 0, "JWT token is empty or not a string"

test_post_api_auth_login_with_valid_credentials()