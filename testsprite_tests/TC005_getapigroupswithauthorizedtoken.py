import requests
import uuid

BASE_URL = "http://localhost:5180"
ADMIN_EMAIL = "admin@sessionflow.local"
ADMIN_PASSWORD = "Admin1234!"
TIMEOUT = 30

def admin_login():
    url = f"{BASE_URL}/api/auth/login"
    payload = {
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    }
    try:
        resp = requests.post(url, json=payload, timeout=TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
        assert data.get("token"), "Login did not return a token"
        token = data.get("token")
        return token
    except Exception as e:
        raise RuntimeError(f"Admin login failed: {e}")

def create_group(token):
    url = f"{BASE_URL}/api/groups"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # Payload conforms to PRD Groups API requirements with schedule slots for frequency=2
    payload = {
        "name": f"Test Group {uuid.uuid4()}",
        "level": 2,
        "frequency": 2,
        "tags": ["test", "sessionflow"],
        "activeEngineerIds": [],
        "schedule": [
            {"day": "Monday", "start": "09:00", "end": "10:00"},
            {"day": "Wednesday", "start": "09:00", "end": "10:00"}
        ]
    }

    resp = requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)
    if resp.status_code != 201:
        raise RuntimeError(f"Failed to create group. Status: {resp.status_code}, Response: {resp.text}")
    data = resp.json()
    group_id = data.get("id") or data.get("groupId")
    if not group_id:
        keys = list(data.keys())
        if keys:
            group_id = data[keys[0]]
    assert group_id, "Created group id not found in response"
    return group_id, payload

def delete_group(token, group_id):
    url = f"{BASE_URL}/api/groups/{group_id}"
    headers = {
        "Authorization": f"Bearer {token}"
    }
    try:
        resp = requests.delete(url, headers=headers, timeout=TIMEOUT)
        if resp.status_code not in [200, 204, 404]:
            raise RuntimeError(f"Failed to delete group ID {group_id}. Status: {resp.status_code}, Response: {resp.text}")
    except Exception as e:
        print(f"Warning: Exception occurred during group cleanup: {e}")

def test_get_api_groups_with_authorized_token():
    token = admin_login()
    group_id = None
    group_payload = None
    try:
        group_id, group_payload = create_group(token)

        url = f"{BASE_URL}/api/groups"
        headers = {
            "Authorization": f"Bearer {token}"
        }
        resp = requests.get(url, headers=headers, timeout=TIMEOUT)
        assert resp.status_code == 200, f"Expected 200 OK, got {resp.status_code}"

        data = resp.json()

        if isinstance(data, dict) and "status" in data:
            assert data["status"].lower() in ("success", "ok"), f"Unexpected status value: {data['status']}"

        groups_list = None
        if isinstance(data, dict) and "groups" in data:
            groups_list = data["groups"]
        elif isinstance(data, list):
            groups_list = data
        else:
            raise AssertionError("Response format of /api/groups unknown or missing groups list")

        assert any((str(g.get("id") or g.get("groupId")) == str(group_id) for g in groups_list)), "Created group not found in the groups list"
        assert any((g.get("name") == group_payload["name"] for g in groups_list)), "Created group name not found in the groups list"

    finally:
        if group_id:
            delete_group(token, group_id)

test_get_api_groups_with_authorized_token()
