import requests

BASE_URL = "http://localhost:5180"
AUTH_USERNAME = "admin@sessionflow.local"
AUTH_PASSWORD = "Admin1234!"
TIMEOUT = 30

def test_deleteapigroupsidsoftdelete():
    # Authenticate to get JWT token
    login_url = f"{BASE_URL}/api/auth/login"
    login_payload = {
        "Identifier": AUTH_USERNAME,
        "Password": AUTH_PASSWORD
    }
    login_resp = requests.post(login_url, json=login_payload, timeout=TIMEOUT)
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    token = login_resp.json().get("token")
    assert token, "No token in login response"

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # Create a new group to delete
    create_url = f"{BASE_URL}/api/groups"
    group_payload = {
        "Name": "Temp Group To Delete",
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
    group_id = None
    try:
        create_resp = requests.post(create_url, json=group_payload, headers=headers, timeout=TIMEOUT)
        assert create_resp.status_code == 201, f"Group creation failed: {create_resp.text}"
        group_id = create_resp.json().get("id")
        assert group_id, "No group id returned from create"

        # Now delete the group (soft-delete)
        delete_url = f"{BASE_URL}/api/groups/{group_id}"
        delete_resp = requests.delete(delete_url, headers=headers, timeout=TIMEOUT)
        assert delete_resp.status_code == 200, f"Delete request failed: {delete_resp.text}"
        json_resp = delete_resp.json()
        assert "message" in json_resp and isinstance(json_resp["message"], str), "No confirmation message in delete response"
    finally:
        # Cleanup: ensure group is deleted if it wasn't deleted properly
        if group_id:
            # Attempt delete again to ensure cleanup, ignoring errors
            try:
                requests.delete(f"{BASE_URL}/api/groups/{group_id}", headers=headers, timeout=TIMEOUT)
            except Exception:
                pass

test_deleteapigroupsidsoftdelete()
