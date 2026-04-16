import requests
import datetime

BASE_URL = "http://localhost:5180"
AUTH_CREDENTIALS = {"Identifier": "admin@sessionflow.local", "Password": "Admin1234!"}
TIMEOUT = 30

def test_put_api_sessions_id_attendance_update_success():
    token = None
    group_id = None
    student_id = None
    session_id = None

    headers = {"Content-Type": "application/json"}

    try:
        # 1. Authenticate & get JWT token
        resp = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=AUTH_CREDENTIALS,
            timeout=TIMEOUT,
            headers=headers,
        )
        resp.raise_for_status()
        token = resp.json().get("token")
        assert token, "Missing auth token"
        auth_headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

        # 2. Create a group
        now = datetime.datetime.now(datetime.UTC)
        day_of_week = (now.weekday() + 1) % 7 # Map python 0=Mon to C# 0=Sun
        # We set the schedule EXACtLY to now, so Session 1 is scheduled for today right now.
        # This bypasses the 30-minute timing restriction on /start.
        group_payload = {
            "Name": "Test Group TC009 Fixed",
            "Description": "Test group for TC009",
            "Level": 2,
            "Frequency": 1,
            "NumberOfStudents": 4, # Level 2 max is 4
            "StartingSessionNumber": 1,
            "TotalSessions": 12,
            "Schedules": [
                {"DayOfWeek": day_of_week, "StartTime": now.strftime("%H:%M:%S"), "DurationMinutes": 60},
            ],
        }
        resp = requests.post(f"{BASE_URL}/api/groups", json=group_payload, headers=auth_headers, timeout=TIMEOUT)
        resp.raise_for_status()
        assert resp.status_code == 201
        group_id = resp.json().get("id")
        assert group_id, "Group creation failed to return id"

        # 3. Add a student to the group
        student_payload = {"Name": "Test Student TC009 Auto"}
        resp = requests.post(f"{BASE_URL}/api/groups/{group_id}/students", json=student_payload, headers=auth_headers, timeout=TIMEOUT)
        resp.raise_for_status()
        assert resp.status_code == 201
        student_id = resp.json().get("id")
        assert student_id, "Student creation failed to return id"

        # 4. Fetch the auto-generated Session 1
        resp = requests.get(f"{BASE_URL}/api/sessions?groupId={group_id}", headers=auth_headers, timeout=TIMEOUT)
        resp.raise_for_status()
        sessions = resp.json().get("items", [])
        
        # Sort or find Session 1 (since it auto-generates 1 to 12)
        print("SESSIONS API RESPONSE:", sessions)
        session_1 = next((s for s in sessions if s.get("sessionNumber") == 1), None)
        assert session_1 is not None, "Failed to find auto-generated Session 1"
        session_id = session_1.get("id")
        assert session_id, "Session 1 has no ID"

        # 4.5 Start session
        resp = requests.post(f"{BASE_URL}/api/sessions/{session_id}/start", headers=auth_headers, timeout=TIMEOUT)
        if resp.status_code != 200:
            print("Start Session Failed:", resp.text)
        resp.raise_for_status()
        assert resp.status_code == 200

        # 5. Update attendance via PUT /api/sessions/{id}/attendance
        attendance_payload = [{"StudentId": student_id, "Status": "Present"}]
        resp = requests.put(f"{BASE_URL}/api/sessions/{session_id}/attendance", json=attendance_payload, headers=auth_headers, timeout=TIMEOUT)
        resp.raise_for_status()
        assert resp.status_code == 200

    finally:
        # Cleanup: delete session if possible
        if session_id:
            try:
                requests.delete(
                    f"{BASE_URL}/api/sessions/{session_id}",
                    headers=auth_headers,
                    timeout=TIMEOUT,
                )
            except Exception:
                pass

        # Cleanup: delete group also deletes students presumably, else delete student first
        if group_id:
            try:
                requests.delete(
                    f"{BASE_URL}/api/groups/{group_id}",
                    headers=auth_headers,
                    timeout=TIMEOUT,
                )
            except Exception:
                pass


test_put_api_sessions_id_attendance_update_success()
