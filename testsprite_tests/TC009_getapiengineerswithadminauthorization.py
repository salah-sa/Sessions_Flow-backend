import requests

def test_get_api_engineers_with_admin_authorization():
    base_url = "http://localhost:5180"
    login_url = f"{base_url}/api/auth/login"
    engineers_url = f"{base_url}/api/engineers"
    login_payload = {
        "email": "admin@sessionflow.local",
        "password": "Admin1234!"
    }
    headers = {
        "Content-Type": "application/json"
    }
    timeout = 30

    # Authenticate to get JWT token with Admin claim
    try:
        login_response = requests.post(login_url, json=login_payload, headers=headers, timeout=timeout)
        assert login_response.status_code == 200, f"Login failed with status code {login_response.status_code}"
        login_data = login_response.json()
        token = login_data.get("token")
        assert token is not None and isinstance(token, str) and len(token) > 0, "JWT token missing in login response"
    except requests.RequestException as e:
        assert False, f"Login request failed: {e}"

    auth_headers = {
        "Authorization": f"Bearer {token}"
    }

    # Call GET /api/engineers with Admin Authorization
    try:
        response = requests.get(engineers_url, headers=auth_headers, timeout=timeout)
        assert response.status_code == 200, f"Expected 200 OK but got {response.status_code}"
        engineers_list = response.json()
        assert isinstance(engineers_list, list), f"Response JSON is not a list: {engineers_list}"
    except requests.RequestException as e:
        assert False, f"GET /api/engineers request failed: {e}"

test_get_api_engineers_with_admin_authorization()