import requests

BASE_URL = "http://localhost:5180"
LOGIN_URL = f"{BASE_URL}/api/auth/login"
GROUPS_URL = f"{BASE_URL}/api/groups"
AUTH_CREDENTIALS = {
    "email": "admin@sessionflow.local",
    "password": "Admin1234!"
}
TIMEOUT = 30


def test_put_api_groups_id_with_valid_id_and_payload():
    token = None
    group_id = None

    try:
        # Authenticate and get JWT token
        login_resp = requests.post(LOGIN_URL, json=AUTH_CREDENTIALS, timeout=TIMEOUT)
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        token = login_resp.json().get("token") or login_resp.json().get("jwt") or login_resp.json().get("accessToken") or login_resp.json().get("access_token")
        assert token, "JWT token not found in login response"

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

        # Create a new group to update it later
        create_payload = {
            "name": "Test Group for PUT",
            "description": "Initial Description",
            "cohorts": [],
            "tags": [],
            "levels": [2],
            "activeEngineerIds": []
        }
        create_resp = requests.post(GROUPS_URL, json=create_payload, headers=headers, timeout=TIMEOUT)
        assert create_resp.status_code == 201, f"Group creation failed: {create_resp.text}"
        group = create_resp.json()
        group_id = group.get("id") or group.get("groupId")
        assert group_id, "Created group id not found"

        # Prepare updated data for PUT
        update_payload = {
            "name": "Updated Test Group",
            "description": "Updated Description",
            "cohorts": ["Spring2026"],
            "tags": ["updated", "test"],
            "levels": [2],
            "activeEngineerIds": []
        }

        # Perform PUT to update the group
        put_url = f"{GROUPS_URL}/{group_id}"
        put_resp = requests.put(put_url, json=update_payload, headers=headers, timeout=TIMEOUT)
        assert put_resp.status_code == 200, f"PUT update failed: {put_resp.text}"
        updated_group = put_resp.json()

        # Validate updated fields
        assert updated_group.get("name") == update_payload["name"], "Group name not updated correctly"
        assert updated_group.get("description") == update_payload["description"], "Group description not updated correctly"
        assert sorted(updated_group.get("cohorts", [])) == sorted(update_payload["cohorts"]), "Group cohorts not updated correctly"
        assert sorted(updated_group.get("tags", [])) == sorted(update_payload["tags"]), "Group tags not updated correctly"
        assert sorted(updated_group.get("levels", [])) == sorted(update_payload["levels"]), "Group levels not updated correctly"
        assert updated_group.get("activeEngineerIds", []) == update_payload["activeEngineerIds"], "Active engineer IDs not updated correctly"

    finally:
        # Cleanup: Delete the created group if it exists
        if group_id and token:
            try:
                del_headers = {"Authorization": f"Bearer {token}"}
                requests.delete(f"{GROUPS_URL}/{group_id}", headers=del_headers, timeout=TIMEOUT)
            except Exception:
                pass


test_put_api_groups_id_with_valid_id_and_payload()
