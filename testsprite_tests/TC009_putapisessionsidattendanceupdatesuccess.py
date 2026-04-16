import requests
from datetime import datetime, timedelta
import random
import string

BASE_URL = "http://localhost:5180"

AUTH_CREDENTIALS = {
    "Identifier": "admin@sessionflow.local",
    "Password": "Admin1234!"
}

TIMEOUT = 30


def get_token():
    login_url = f"{BASE_URL}/api/auth/login"
    resp = requests.post(login_url, json=AUTH_CREDENTIALS, timeout=TIMEOUT)
    resp.raise_for_status()
    token = resp.json().get("token")
    assert token, "Login response missing token"
    return token


def create_group(token):
    # create a group with valid attributes respecting constraints:
    # Level (1-4), Frequency (1-3)
    # NumberOfStudents must be 4 or less if Level 1-3; 2 or less if Level 4
    # Schedules array length equals Frequency
    level = 2
    frequency = 2
    number_of_students = 4  # Level 2 => max 4
    schedules = [
        {"DayOfWeek": 1, "StartTime": "14:00:00", "DurationMinutes": 60},
        {"DayOfWeek": 3, "StartTime": "14:00:00", "DurationMinutes": 60},
    ]
    group_data = {
        "Name": "Test Group for Attendance",
        "Description": "Auto created group for test",
        "Level": level,
        "Frequency": frequency,
        "NumberOfStudents": number_of_students,
        "StartingSessionNumber": 1,
        "TotalSessions": 10,
        "Schedules": schedules,
    }
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.post(f"{BASE_URL}/api/groups", json=group_data, headers=headers, timeout=TIMEOUT)
    resp.raise_for_status()
    resp_body = resp.json()
    group_id = resp_body.get("id")
    assert group_id, "Group creation response missing id"
    return group_id


def delete_group(token, group_id):
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.delete(f"{BASE_URL}/api/groups/{group_id}", headers=headers, timeout=TIMEOUT)
    resp.raise_for_status()


def add_student(token, group_id, name):
    headers = {"Authorization": f"Bearer {token}"}
    student_data = {"Name": name}
    resp = requests.post(f"{BASE_URL}/api/groups/{group_id}/students", json=student_data, headers=headers, timeout=TIMEOUT)
    resp.raise_for_status()
    body = resp.json()
    student_id = body.get("id")
    assert student_id, "Add student response missing id"
    return student_id


def create_session(token, group_id):
    headers = {"Authorization": f"Bearer {token}"}
    # Schedule session one day from now, UTC ISO 8601 format
    scheduled_time = (datetime.utcnow() + timedelta(days=1)).replace(microsecond=0).isoformat() + "Z"
    session_data = {"GroupId": group_id, "ScheduledAt": scheduled_time}
    resp = requests.post(f"{BASE_URL}/api/sessions", json=session_data, headers=headers, timeout=TIMEOUT)
    resp.raise_for_status()
    body = resp.json()
    session_id = body.get("id")
    assert session_id, "Create session response missing id"
    return session_id


def update_attendance(token, session_id, attendance_payload):
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.put(f"{BASE_URL}/api/sessions/{session_id}/attendance", json=attendance_payload, headers=headers, timeout=TIMEOUT)
    return resp


def list_students(token):
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(f"{BASE_URL}/api/students", headers=headers, timeout=TIMEOUT)
    resp.raise_for_status()
    return resp.json()


def putapisessionsidattendanceupdatesuccess():
    token = get_token()
    headers = {"Authorization": f"Bearer {token}"}
    group_id = None
    session_id = None
    try:
        group_id = create_group(token)

        # Add two students to this group (up to the NumberOfStudents limit)
        student1_id = add_student(token, group_id, "Test Student 1")
        student2_id = add_student(token, group_id, "Test Student 2")

        # Create session for the group
        session_id = create_session(token, group_id)

        # Removed start_session call because /start is not in PRD and causes 400 error

        # Prepare attendance payload for the session
        attendance_payload = [
            {"StudentId": student1_id, "Status": "Present"},
            {"StudentId": student2_id, "Status": "Late"}
        ]

        # Update attendance using PUT /api/sessions/{id}/attendance
        resp = update_attendance(token, session_id, attendance_payload)
        assert resp.status_code == 200, f"Expected 200 on attendance update, got {resp.status_code}"
        # Optionally check response content for confirmation
        try:
            json_resp = resp.json()
            assert json_resp is not None
        except Exception:
            assert False, "Response to attendance update is not JSON"

    finally:
        # Cleanup: delete session not supported by spec, so just delete group (cascade delete not specified)
        if group_id:
            delete_group(token, group_id)


putapisessionsidattendanceupdatesuccess()
