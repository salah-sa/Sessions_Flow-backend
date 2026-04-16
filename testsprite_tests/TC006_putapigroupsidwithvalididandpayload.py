import requests

BASE_URL = "http://localhost:5180"
TIMEOUT = 30

def test_put_api_groups_id_with_valid_id_and_payload():
    # First, authenticate to get a valid token (using assumed valid credentials)
    login_url = f"{BASE_URL}/api/auth/login"
    login_payload = {
        "email": "admin@example.com",
        "password": "AdminPass123!"
    }
    login_resp = requests.post(login_url, json=login_payload, timeout=TIMEOUT)
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    token = login_resp.json().get("token") or login_resp.json().get("access_token")
    assert token, "No token received from login"

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    created_group_id = None
    try:
        # Create a new group first to have a valid group id to update
        create_group_url = f"{BASE_URL}/api/groups"
        create_group_payload = {
            "name": "Test Group PUT",
            "description": "Initial description for test group",
            "tags": ["test", "put"],
            "level": "Beginner",
            "isActive": True
        }
        create_resp = requests.post(create_group_url, json=create_group_payload, headers=headers, timeout=TIMEOUT)
        assert create_resp.status_code == 201, f"Group creation failed: {create_resp.text}"
        created_group_id = create_resp.json().get("id")
        assert created_group_id, "Created group ID not returned"

        # Prepare updated group fields for the PUT call
        update_payload = {
            "name": "Test Group PUT Updated",
            "description": "Updated description after PUT",
            "tags": ["test", "put", "updated"],
            "level": "Intermediate",
            "isActive": False
        }

        put_url = f"{BASE_URL}/api/groups/{created_group_id}"
        put_resp = requests.put(put_url, json=update_payload, headers=headers, timeout=TIMEOUT)
        assert put_resp.status_code == 200, f"PUT /api/groups/{created_group_id} failed: {put_resp.text}"

        updated_group = put_resp.json()
        # Validate that the updated group details match the payload sent
        assert updated_group.get("id") == created_group_id
        assert updated_group.get("name") == update_payload["name"]
        assert updated_group.get("description") == update_payload["description"]
        assert sorted(updated_group.get("tags", [])) == sorted(update_payload["tags"])
        assert updated_group.get("level") == update_payload["level"]
        assert updated_group.get("isActive") == update_payload["isActive"]

    finally:
        # Cleanup: delete the created group to keep environment clean
        if created_group_id:
            del_url = f"{BASE_URL}/api/groups/{created_group_id}"
            try:
                del_resp = requests.delete(del_url, headers=headers, timeout=TIMEOUT)
                # It's okay if delete fails here, so no assertions
            except Exception:
                pass

test_put_api_groups_id_with_valid_id_and_payload()