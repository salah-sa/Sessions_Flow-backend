import requests
from datetime import datetime, timedelta
import uuid

BASE_URL = "http://localhost:5180"
AUTH_CREDENTIALS = {"Identifier": "admin@sessionflow.local", "Password": "Admin1234!"}
TIMEOUT = 30


def test_postapisessionscreatesession():
    session = requests.Session()
    try:
        # Login to get JWT token
        login_resp = session.post(
            f"{BASE_URL}/api/auth/login",
            json=AUTH_CREDENTIALS,
            timeout=TIMEOUT,
        )
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        token = login_resp.json().get("token")
        assert token, "JWT token missing in login response"

        headers = {"Authorization": f"Bearer {token}"}

        # Create a valid group following the constraints
        # Level 2 (1-4), Frequency 2 (1-3), NumberOfStudents 4 or less for Levels 1-3
        group_payload = {
            "Name": f"Test Group {uuid.uuid4()}",
            "Description": "Test group for session creation",
            "Level": 2,
            "Frequency": 2,
            "NumberOfStudents": 4,
            "StartingSessionNumber": 1,
            "TotalSessions": 10,
            "Schedules": [
                {"DayOfWeek": 1, "StartTime": "09:00:00", "DurationMinutes": 60},
                {"DayOfWeek": 3, "StartTime": "09:00:00", "DurationMinutes": 60},
            ],
        }
        group_resp = session.post(
            f"{BASE_URL}/api/groups", json=group_payload, headers=headers, timeout=TIMEOUT
        )
        assert group_resp.status_code == 201, f"Group creation failed: {group_resp.text}"
        group_data = group_resp.json()
        group_id = group_data.get("id")
        assert group_id, "Group ID missing in response"

        # Create a session with valid GroupId and ScheduledAt
        scheduled_at = (datetime.utcnow() + timedelta(days=1)).replace(microsecond=0).isoformat() + "Z"
        session_payload = {"GroupId": group_id, "ScheduledAt": scheduled_at}
        session_resp = session.post(
            f"{BASE_URL}/api/sessions", json=session_payload, headers=headers, timeout=TIMEOUT
        )
        assert session_resp.status_code == 201, f"Session creation failed: {session_resp.text}"
        session_id = session_resp.json().get("id")
        assert session_id, "Session ID missing in response"

    finally:
        # Cleanup: delete group
        if 'group_id' in locals():
            del_resp = session.delete(
                f"{BASE_URL}/api/groups/{group_id}", headers=headers, timeout=TIMEOUT
            )
            # We do not assert on delete failure to not mask original failures

test_postapisessionscreatesession()