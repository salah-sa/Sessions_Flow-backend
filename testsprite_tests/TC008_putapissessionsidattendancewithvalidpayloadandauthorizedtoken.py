import requests

BASE_URL = "http://localhost:5180"
ADMIN_EMAIL = "admin@sessionflow.local"
ADMIN_PASSWORD = "Admin1234!"
TIMEOUT = 30


def login_admin():
    login_url = f"{BASE_URL}/api/auth/login"
    login_payload = {"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    resp = requests.post(login_url, json=login_payload, timeout=TIMEOUT)
    resp.raise_for_status()
    data = resp.json()
    assert data.get("status") != "Pending"
    token = data.get("token")
    assert token, "No token received from login"
    return token


def create_group(token):
    group_url = f"{BASE_URL}/api/groups"
    # Valid group payload without 'frequency' field as per PRD
    group_payload = {
        "name": "Test Group TC008",
        "level": 2,
        "schedules": [
            {"day": "Monday", "start": "09:00", "end": "11:00"},
            {"day": "Wednesday", "start": "09:00", "end": "11:00"}
        ]
    }
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.post(group_url, json=group_payload, headers=headers, timeout=TIMEOUT)
    resp.raise_for_status()
    data = resp.json()
    group_id = data.get("id") or data.get("groupId")
    assert group_id, "No group id returned on group creation"
    return group_id


def create_session(token, group_id, engineer_id):
    session_url = f"{BASE_URL}/api/sessions"
    # Create session for tomorrow with 2 hours duration
    import datetime
    start = (datetime.datetime.utcnow() + datetime.timedelta(days=1)).replace(hour=9, minute=0, second=0, microsecond=0).isoformat() + "Z"
    end = (datetime.datetime.utcnow() + datetime.timedelta(days=1)).replace(hour=11, minute=0, second=0, microsecond=0).isoformat() + "Z"
    session_payload = {
        "groupId": group_id,
        "start": start,
        "end": end,
        "engineerId": engineer_id
    }
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.post(session_url, json=session_payload, headers=headers, timeout=TIMEOUT)
    resp.raise_for_status()
    data = resp.json()
    session_id = data.get("id") or data.get("sessionId")
    assert session_id, "No session id returned on session creation"
    return session_id


def get_current_user(token):
    url = f"{BASE_URL}/api/auth/me"
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(url, headers=headers, timeout=TIMEOUT)
    resp.raise_for_status()
    data = resp.json()
    user_id = data.get("id") or data.get("userId")
    assert user_id, "No user id in current user info"
    return user_id


def delete_session(token, session_id):
    url = f"{BASE_URL}/api/sessions/{session_id}"
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.delete(url, headers=headers, timeout=TIMEOUT)
    # If delete endpoint not available or fails, ignore
    # No assertion here


def test_put_api_sessions_id_attendance_with_valid_payload_and_authorized_token():
    token = login_admin()
    headers = {"Authorization": f"Bearer {token}"}

    group_id = None
    session_id = None

    try:
        group_id = create_group(token)
        engineer_id = get_current_user(token)
        session_id = create_session(token, group_id, engineer_id)

        attendance_url = f"{BASE_URL}/api/sessions/{session_id}/attendance"
        # Assume attendance schema: [{"engineerId": <>, "status": "Present"/"Absent"/"Late"}]
        attendance_payload = [
            {"engineerId": engineer_id, "status": "Present"}
        ]

        resp = requests.put(attendance_url, json=attendance_payload, headers=headers, timeout=TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
        # Confirm HTTP 200 OK and check that attendance records stored are acknowledged
        # We expect status code 200 from raise_for_status and a successful response with message or data.
        assert resp.status_code == 200
        # Since no specific response schema for PUT attendance is given,
        # assert presence of 'attendance' or 'success' indication in response
        assert data, "Empty response received"
        # Optionally confirm attendance data stored or success attribute
        # We check if 'status' in response as a success confirmation
        if isinstance(data, dict):
            assert "status" not in data or data.get("status") in ["Success", "OK"], "Unexpected status in response"
    finally:
        if session_id:
            delete_session(token, session_id)


test_put_api_sessions_id_attendance_with_valid_payload_and_authorized_token()
