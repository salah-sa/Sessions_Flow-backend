import requests

BASE_URL = "http://localhost:5180"
TIMEOUT = 30

def test_get_api_groups_with_authorized_token():
    # Step 1: Login to get a valid token (using generic test user)
    login_url = f"{BASE_URL}/api/auth/login"
    login_payload = {
        "email": "engineer@example.com",
        "password": "Password123!"
    }

    token = None
    group_id = None
    headers = None

    try:
        login_resp = requests.post(login_url, json=login_payload, timeout=TIMEOUT)
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        token = login_resp.json().get("token")
        assert token, "No token received from login"

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

        # Step 2: Create a new group to verify it appears in the list
        create_group_url = f"{BASE_URL}/api/groups"
        new_group_payload = {
            "name": "Test Group for TC005",
            "description": "Group created during automated test TC005"
        }

        create_resp = requests.post(create_group_url, json=new_group_payload, headers=headers, timeout=TIMEOUT)
        assert create_resp.status_code == 201, f"Group creation failed: {create_resp.text}"
        group_data = create_resp.json()
        group_id = group_data.get("id")
        assert group_id, "No group id returned from group creation"

        # Step 3: GET /api/groups with Authorization header
        get_groups_url = f"{BASE_URL}/api/groups"
        get_resp = requests.get(get_groups_url, headers=headers, timeout=TIMEOUT)
        assert get_resp.status_code == 200, f"Failed to get groups: {get_resp.text}"
        groups_list = get_resp.json()
        assert isinstance(groups_list, list), "Groups response is not a list"

        # Step 4: Verify the newly created group is in the list
        group_ids = [str(group.get("id")) for group in groups_list if group.get("id") is not None]
        assert str(group_id) in group_ids, "Newly created group not found in groups list"

    finally:
        # Cleanup: Delete the created group if created
        if token and group_id:
            delete_url = f"{BASE_URL}/api/groups/{group_id}"
            try:
                # Assume DELETE /api/groups/{id} exists to delete group
                # It's not specified in PRD, but cleanup requires deleting resource to avoid pollution
                del_resp = requests.delete(delete_url, headers=headers, timeout=TIMEOUT)
                # No strict assert here, just attempt cleanup
            except Exception:
                pass

test_get_api_groups_with_authorized_token()