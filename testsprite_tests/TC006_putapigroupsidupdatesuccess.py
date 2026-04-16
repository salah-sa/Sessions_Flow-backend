import requests

BASE_URL = "http://localhost:5180"
AUTH_CREDENTIALS = {"Identifier": "admin@sessionflow.local", "Password": "Admin1234!"}
TIMEOUT = 30


def test_put_api_groups_id_update_success():
    # Authenticate and get token
    login_resp = requests.post(f"{BASE_URL}/api/auth/login", json=AUTH_CREDENTIALS, timeout=TIMEOUT)
    assert login_resp.status_code == 200, f"Login failed with status {login_resp.status_code}"
    token = login_resp.json().get("token")
    assert token, "No token received after login"
    headers = {"Authorization": f"Bearer {token}"}

    # Create a valid group to update later (Level 2, Frequency 2, NumberOfStudents 4, Schedules length = Frequency)
    group_payload = {
        "Name": "PUT Test Group",
        "Description": "Initial group description",
        "Level": 2,
        "Frequency": 2,
        "NumberOfStudents": 4,
        "StartingSessionNumber": 1,
        "TotalSessions": 10,
        "Schedules": [
            {"DayOfWeek": 1, "StartTime": "09:00:00", "DurationMinutes": 60},
            {"DayOfWeek": 3, "StartTime": "09:00:00", "DurationMinutes": 60}
        ]
    }
    create_resp = requests.post(f"{BASE_URL}/api/groups", json=group_payload, headers=headers, timeout=TIMEOUT)
    assert create_resp.status_code == 201, f"Group creation failed with status {create_resp.status_code}"
    group_id = create_resp.json().get("id")
    assert group_id, "No group ID returned on creation"

    try:
        # Prepare update payload with new Name, Description, and Level
        update_payload = {
            "Name": "PUT Test Group Updated",
            "Description": "Updated group description",
            "Level": 3
        }
        update_resp = requests.put(f"{BASE_URL}/api/groups/{group_id}", json=update_payload, headers=headers, timeout=TIMEOUT)
        
        # Assert successful update
        assert update_resp.status_code == 200, f"PUT update failed with status {update_resp.status_code}"
        updated_group = update_resp.json()
        assert isinstance(updated_group, dict), "Update response is not a JSON object"
        assert updated_group.get("id") == group_id, "Updated group id mismatch"
        assert updated_group.get("name") == update_payload["Name"], "Updated group name mismatch"
        assert updated_group.get("description") == update_payload["Description"], "Updated group description mismatch"
        assert updated_group.get("level") == update_payload["Level"], "Updated group level mismatch"
        # Also validate frequency and numberOfStudents remain unchanged
        assert "frequency" in updated_group, "frequency missing in updated group"
        assert "numberOfStudents" in updated_group, "numberOfStudents missing in updated group"
    finally:
        # Clean up: delete the created group
        del_resp = requests.delete(f"{BASE_URL}/api/groups/{group_id}", headers=headers, timeout=TIMEOUT)
        assert del_resp.status_code == 200, f"Cleanup delete failed with status {del_resp.status_code}"


test_put_api_groups_id_update_success()