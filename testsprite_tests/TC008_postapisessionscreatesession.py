import requests
import datetime
import uuid

BASE_URL = "http://localhost:5180"
AUTH_CREDENTIALS = {
    "Identifier": "admin@sessionflow.local",
    "Password": "Admin1234!"
}
TIMEOUT = 30

def test_postapisessionscreatesession():
    # Authenticate
    login_resp = requests.post(f"{BASE_URL}/api/auth/login", json=AUTH_CREDENTIALS, timeout=TIMEOUT)
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    token = login_resp.json().get("token")
    assert token, "Token missing"
    headers = {"Authorization": f"Bearer {token}"}

    group_id = None
    session_id = None

    try:
        # Create a group with unique name
        create_group_payload = {
            "Name": f"TC008-{uuid.uuid4().hex[:6]}",
            "Description": "Created for session creation test",
            "Level": 1,
            "Frequency": 1,
            "NumberOfStudents": 4,
            "StartingSessionNumber": 1,
            "TotalSessions": 5,
            "Schedules": [
                {"DayOfWeek": 1, "StartTime": "14:00:00", "DurationMinutes": 60}
            ]
        }
        group_resp = requests.post(f"{BASE_URL}/api/groups", headers=headers, json=create_group_payload, timeout=TIMEOUT)
        assert group_resp.status_code == 201, f"Group creation failed: {group_resp.text}"
        group_id = group_resp.json().get("id")
        assert group_id, "Group ID missing"

        # Create session — use strftime to produce clean ISO string
        now_utc = datetime.datetime.now(datetime.UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
        create_session_payload = {"GroupId": group_id, "ScheduledAt": now_utc}
        session_resp = requests.post(f"{BASE_URL}/api/sessions", headers=headers, json=create_session_payload, timeout=TIMEOUT)
        assert session_resp.status_code == 201, f"Session creation failed: {session_resp.text}"
        session_id = session_resp.json().get("id")
        assert session_id, "Session ID missing"

        # Verify: GET /api/sessions?groupId={id} returns paginated envelope with our session
        get_resp = requests.get(f"{BASE_URL}/api/sessions?groupId={group_id}", headers=headers, timeout=TIMEOUT)
        assert get_resp.status_code == 200, f"Get sessions failed: {get_resp.text}"
        envelope = get_resp.json()
        items = envelope.get("items", [])
        assert any(s.get("id") == session_id for s in items), "Created session not found in sessions list"

    finally:
        if group_id:
            try:
                requests.delete(f"{BASE_URL}/api/groups/{group_id}", headers=headers, timeout=TIMEOUT)
            except Exception:
                pass

test_postapisessionscreatesession()