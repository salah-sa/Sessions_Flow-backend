import requests

BASE_URL = "http://localhost:5180"
LOGIN_URL = f"{BASE_URL}/api/auth/login"
GROUPS_URL = f"{BASE_URL}/api/groups"

ADMIN_EMAIL = "admin@sessionflow.local"
ADMIN_PASSWORD = "Admin1234!"
TIMEOUT = 30

def test_get_api_groups_with_authorized_token():
    # Authenticate and get Bearer token
    auth_payload = {
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    }
    login_resp = requests.post(LOGIN_URL, json=auth_payload, timeout=TIMEOUT)
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    token = login_resp.json().get("token")
    assert token, "No token found in login response"

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    created_group_id = None
    group_payload = {
        "name": "Test Group TC005",
        "description": "Group created for test case TC005",
        "level": 1,
        "frequency": 1
    }

    try:
        # Create a new group to verify it is included in the GET response
        create_resp = requests.post(GROUPS_URL, headers=headers, json=group_payload, timeout=TIMEOUT)
        assert create_resp.status_code == 201, f"Group creation failed: {create_resp.text}"
        created_group_id = create_resp.json().get("id")
        assert created_group_id, "No group id returned on creation"

        # Get groups list with authorized token
        get_resp = requests.get(GROUPS_URL, headers=headers, timeout=TIMEOUT)
        assert get_resp.status_code == 200, f"GET /api/groups failed: {get_resp.text}"

        groups = get_resp.json()
        assert isinstance(groups, list), f"Groups response is not a list: {groups}"

        # Check that the newly created group is in the list
        matched_groups = [g for g in groups if g.get("id") == created_group_id]
        assert len(matched_groups) == 1, "Newly created group not found in GET /api/groups response"

    finally:
        # Cleanup: delete created group if possible
        if created_group_id:
            requests.delete(f"{GROUPS_URL}/{created_group_id}", headers=headers, timeout=TIMEOUT)

test_get_api_groups_with_authorized_token()
