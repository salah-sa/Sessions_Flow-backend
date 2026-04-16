import requests
import datetime

BASE_URL = "http://localhost:5180"
AUTH_CREDENTIALS = {"Identifier": "admin@sessionflow.local", "Password": "Admin1234!"}
TIMEOUT = 30

def test_putapisessionsidattendanceupdatesuccess():
    # Authenticate
    resp = requests.post(f"{BASE_URL}/api/auth/login", json=AUTH_CREDENTIALS, timeout=TIMEOUT)
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    token = resp.json().get("token")
    assert token, "Missing auth token"
    auth_headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    group_id = None

    try:
        # 1. Create a group with schedule matching current day/time so auto-generated Session 1 is startable
        now = datetime.datetime.now(datetime.UTC)
        day_of_week = (now.weekday() + 1) % 7  # Python Mon=0 -> C# Sun=0

        group_payload = {
            "Name": "TC009 Attendance Group",
            "Description": "Group for TC009 attendance update test",
            "Level": 2,
            "Frequency": 1,
            "NumberOfStudents": 4,
            "StartingSessionNumber": 1,
            "TotalSessions": 12,
            "Schedules": [
                {"DayOfWeek": day_of_week, "StartTime": now.strftime("%H:%M:%S"), "DurationMinutes": 60}
            ]
        }
        resp = requests.post(f"{BASE_URL}/api/groups", json=group_payload, headers=auth_headers, timeout=TIMEOUT)
        assert resp.status_code == 201, f"Group creation failed: {resp.text}"
        group_id = resp.json().get("id")
        assert group_id, "No group ID returned"

        # 2. Add a student to the group
        resp = requests.post(f"{BASE_URL}/api/groups/{group_id}/students", json={"Name": "TC009 Student"}, headers=auth_headers, timeout=TIMEOUT)
        assert resp.status_code == 201, f"Add student failed: {resp.text}"
        student_id = resp.json().get("id")
        assert student_id, "No student ID returned"

        # 3. Fetch auto-generated Session 1 (paginated envelope uses 'items' key)
        resp = requests.get(f"{BASE_URL}/api/sessions?groupId={group_id}", headers=auth_headers, timeout=TIMEOUT)
        assert resp.status_code == 200, f"GET sessions failed: {resp.text}"
        items = resp.json().get("items", [])
        session_1 = next((s for s in items if s.get("sessionNumber") == 1), None)
        assert session_1 is not None, f"Failed to find auto-generated Session 1. Items: {items}"
        session_id = session_1.get("id")
        assert session_id, "Session 1 has no ID"

        # 4. Start the session (MANDATORY before attendance update)
        resp = requests.post(f"{BASE_URL}/api/sessions/{session_id}/start", headers=auth_headers, timeout=TIMEOUT)
        assert resp.status_code == 200, f"Start session failed: {resp.text}"

        # 5. Update attendance
        attendance_payload = [{"StudentId": student_id, "Status": "Present"}]
        resp = requests.put(f"{BASE_URL}/api/sessions/{session_id}/attendance", json=attendance_payload, headers=auth_headers, timeout=TIMEOUT)
        assert resp.status_code == 200, f"Attendance update failed: {resp.text}"

    finally:
        if group_id:
            try:
                requests.delete(f"{BASE_URL}/api/groups/{group_id}", headers=auth_headers, timeout=TIMEOUT)
            except Exception:
                pass

test_putapisessionsidattendanceupdatesuccess()
