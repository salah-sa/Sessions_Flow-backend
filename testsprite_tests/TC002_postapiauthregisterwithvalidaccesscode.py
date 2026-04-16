import requests
import uuid

BASE_URL = "http://localhost:5180"
TIMEOUT = 30


def test_post_api_auth_register_with_valid_access_code():
    url = f"{BASE_URL}/api/auth/register"
    unique_email = f"testuser_{uuid.uuid4().hex[:8]}@example.com"
    payload = {
        "name": "Test User",
        "email": unique_email,
        "password": "StrongP@ssw0rd!",
        "accessCode": "ENG1"
    }
    headers = {
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Request to {url} failed with exception: {e}"

    # Assert status code 201 Created
    assert response.status_code == 201, f"Expected status code 201, got {response.status_code}"
    
    try:
        data = response.json()
    except ValueError:
        assert False, "Response is not a valid JSON"

    # Verify the engineer registration status presence
    assert "status" in data, "Response JSON does not contain 'status' field"
    assert data["status"].lower() in ("pending", "active"), f"Engineer registration status expected to be 'pending' or 'active', got '{data['status']}'"

    # Optionally verify other fields such as name and email match
    assert data.get("email") == unique_email, f"Response email does not match registration email"
    assert data.get("name") == payload["name"], f"Response name does not match registration name"


test_post_api_auth_register_with_valid_access_code()