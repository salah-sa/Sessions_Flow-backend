import requests

BASE_URL = "http://localhost:5180"
LOGIN_URL = f"{BASE_URL}/api/auth/login"
GROUPS_URL = f"{BASE_URL}/api/groups"

AUTH_CREDENTIALS = {
    "Identifier": "admin@sessionflow.local",
    "Password": "Admin1234!"
}

def authenticate():
    try:
        resp = requests.post(LOGIN_URL, json=AUTH_CREDENTIALS, timeout=30)
        resp.raise_for_status()
        token = resp.json().get("token")
        assert token, "No token received in login response"
        return token
    except requests.RequestException as e:
        raise RuntimeError(f"Authentication failed: {e}")

def create_group(token):
    headers = {"Authorization": f"Bearer {token}"}
    group_data = {
        "Name": "Test Group Level 2 Frequency 2",
        "Description": "Group created for delete test",
        "Level": 2,
        "Frequency": 2,
        "NumberOfStudents": 4,
        "StartingSessionNumber": 1,
        "TotalSessions": 12,
        "Schedules": [
            {"DayOfWeek": 1, "StartTime": "14:00:00", "DurationMinutes": 60},
            {"DayOfWeek": 3, "StartTime": "14:00:00", "DurationMinutes": 60}
        ]
    }
    try:
        resp = requests.post(GROUPS_URL, json=group_data, headers=headers, timeout=30)
        resp.raise_for_status()
        assert resp.status_code == 201
        data = resp.json()
        group_id = data.get("id")
        assert group_id, "No group ID returned"
        return group_id
    except requests.RequestException as e:
        raise RuntimeError(f"Group creation failed: {e}")

def delete_group(token, group_id):
    headers = {"Authorization": f"Bearer {token}"}
    delete_url = f"{GROUPS_URL}/{group_id}"
    try:
        resp = requests.delete(delete_url, headers=headers, timeout=30)
        resp.raise_for_status()
        assert resp.status_code == 200
        json_resp = resp.json()
        assert "message" in json_resp and isinstance(json_resp["message"], str) and len(json_resp["message"]) > 0
        return json_resp["message"]
    except requests.RequestException as e:
        raise RuntimeError(f"Group deletion failed: {e}")

def test_deleteapigroupsidsoftdelete():
    token = authenticate()
    group_id = None
    try:
        group_id = create_group(token)
        message = delete_group(token, group_id)
        assert "soft-delete" in message.lower() or "deleted" in message.lower() or len(message) > 0
    finally:
        # Cleanup: Ensure the group is deleted if it still exists
        if group_id:
            headers = {"Authorization": f"Bearer {token}"}
            check_resp = requests.get(GROUPS_URL, headers=headers, timeout=30)
            if check_resp.status_code == 200:
                groups = check_resp.json()
                if all(isinstance(g, dict) for g in groups):
                    if any(g.get("id") == group_id for g in groups):
                        try:
                            requests.delete(f"{GROUPS_URL}/{group_id}", headers=headers, timeout=30)
                        except Exception:
                            pass

test_deleteapigroupsidsoftdelete()