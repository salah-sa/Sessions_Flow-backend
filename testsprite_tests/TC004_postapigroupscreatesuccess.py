import requests

BASE_URL = "http://localhost:5180"
LOGIN_PATH = "/api/auth/login"
GROUPS_PATH = "/api/groups"
TIMEOUT = 30

AUTH_CREDENTIALS = {
    "Identifier": "admin@sessionflow.local",
    "Password": "Admin1234!"
}

def test_postapigroupscreatesuccess():
    # Authenticate and get token
    try:
        auth_resp = requests.post(
            BASE_URL + LOGIN_PATH,
            json=AUTH_CREDENTIALS,
            timeout=TIMEOUT
        )
        assert auth_resp.status_code == 200, f"Auth failed with status {auth_resp.status_code}"
        auth_data = auth_resp.json()
        token = auth_data.get("token")
        assert token, "Token not found in auth response"

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

        # Prepare valid group data with schedules matching frequency
        group_data = {
            "Name": "Test Group Level 2 Frequency 2",
            "Description": "Test group with 2 schedules matching frequency",
            "Level": 2,
            "Frequency": 2,
            "NumberOfStudents": 4,  # Must be 4 or less for Levels 1-3
            "StartingSessionNumber": 1,
            "TotalSessions": 10,
            "Schedules": [
                {"DayOfWeek": 1, "StartTime": "14:00:00", "DurationMinutes": 60},
                {"DayOfWeek": 3, "StartTime": "14:00:00", "DurationMinutes": 60}
            ]
        }

        group_id = None
        group_name = None
        # Create group
        create_resp = requests.post(
            BASE_URL + GROUPS_PATH,
            headers=headers,
            json=group_data,
            timeout=TIMEOUT
        )
        assert create_resp.status_code == 201, f"Group creation failed with status {create_resp.status_code}"
        create_data = create_resp.json()
        group_id = create_data.get("id")
        group_name = create_data.get("name")
        assert group_id and isinstance(group_id, str), "Group id missing or invalid"
        assert group_name == group_data["Name"], "Group name mismatch"

    finally:
        # Cleanup - delete the created group if it was created
        if 'headers' in locals() and group_id:
            try:
                del_resp = requests.delete(
                    f"{BASE_URL}{GROUPS_PATH}/{group_id}",
                    headers=headers,
                    timeout=TIMEOUT
                )
                # Accept 200 or 404 if already deleted
                assert del_resp.status_code in (200,404), f"Delete cleanup failed with status {del_resp.status_code}"
            except Exception:
                pass

test_postapigroupscreatesuccess()