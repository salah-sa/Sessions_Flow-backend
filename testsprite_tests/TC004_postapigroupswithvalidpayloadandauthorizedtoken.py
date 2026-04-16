import requests

BASE_URL = "http://localhost:5180"
TIMEOUT = 30

def test_post_api_groups_with_valid_payload_and_authorized_token():
    # First, authenticate to get a valid JWT token
    login_url = f"{BASE_URL}/api/auth/login"
    login_payload = {
        "email": "admin@example.com",
        "password": "AdminPassword123!"
    }
    try:
        login_response = requests.post(login_url, json=login_payload, timeout=TIMEOUT)
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        token = login_response.json().get("token") or login_response.json().get("jwt") or login_response.json().get("accessToken")
        assert token, "JWT token not found in login response"
    except Exception as e:
        raise AssertionError(f"Authentication failed: {e}")

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    group_url = f"{BASE_URL}/api/groups"
    group_payload = {
        "name": "Test Group",
        "description": "Group created for test case TC004",
        "tags": ["test", "automation"],
        "level": "Beginner",
        "activeEngineerIds": []
    }

    created_group_id = None

    try:
        response = requests.post(group_url, json=group_payload, headers=headers, timeout=TIMEOUT)
        assert response.status_code == 201, f"Expected 201 Created, got {response.status_code}, response: {response.text}"
        response_data = response.json()
        created_group_id = response_data.get("id") or response_data.get("groupId")
        assert created_group_id, "Response does not contain new group id"
    finally:
        # Clean up the created group if possible
        if created_group_id:
            delete_url = f"{group_url}/{created_group_id}"
            try:
                requests.delete(delete_url, headers=headers, timeout=TIMEOUT)
            except Exception:
                pass

test_post_api_groups_with_valid_payload_and_authorized_token()