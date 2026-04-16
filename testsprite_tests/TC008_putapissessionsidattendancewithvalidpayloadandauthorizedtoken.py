import requests

BASE_URL = "http://localhost:5180"

ADMIN_EMAIL = "admin@sessionflow.local"
ADMIN_PASSWORD = "Admin1234!"
TIMEOUT = 30


def authenticate(email, password):
    url = f"{BASE_URL}/api/auth/login"
    payload = {"email": email, "password": password}
    resp = requests.post(url, json=payload, timeout=TIMEOUT)
    resp.raise_for_status()
    token = resp.json().get("token")
    if not token:
        raise Exception("Authentication failed: No token received")
    return token


def create_group(token):
    url = f"{BASE_URL}/api/groups"
    payload = {"name": "Test Group", "tags": [], "level": "beginner", "active": True}
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)
    resp.raise_for_status()
    group_id = resp.json().get("id")
    if not group_id:
        raise Exception("Failed to create group for session")
    return group_id


def delete_group(token, group_id):
    # No explicit DELETE endpoint given in PRD, so skipping cleanup for group.
    # If implemented, add here.
    pass


def create_session(token, group_id, engineer_id):
    url = f"{BASE_URL}/api/sessions"
    import datetime
    start = (datetime.datetime.utcnow() + datetime.timedelta(minutes=5)).isoformat() + "Z"
    end = (datetime.datetime.utcnow() + datetime.timedelta(minutes=65)).isoformat() + "Z"
    payload = {
        "groupId": group_id,
        "start": start,
        "end": end,
        "engineerId": engineer_id,
    }
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)
    resp.raise_for_status()
    session_id = resp.json().get("id")
    if not session_id:
        raise Exception("Failed to create session")
    return session_id


def delete_session(token, session_id):
    # No explicit DELETE endpoint for sessions given; skipping cleanup.
    pass


def get_current_user_id(token):
    url = f"{BASE_URL}/api/auth/me"
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(url, headers=headers, timeout=TIMEOUT)
    resp.raise_for_status()
    user_info = resp.json()
    user_id = user_info.get("id")
    if not user_id:
        raise Exception("Failed to get current user ID")
    return user_id


def put_session_attendance(token, session_id, attendance_payload):
    url = f"{BASE_URL}/api/sessions/{session_id}/attendance"
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.put(url, json=attendance_payload, headers=headers, timeout=TIMEOUT)
    return resp


def test_put_api_sessions_id_attendance_with_valid_payload_and_authorized_token():
    token = authenticate(ADMIN_EMAIL, ADMIN_PASSWORD)

    engineer_id = get_current_user_id(token)
    assert engineer_id is not None, "Engineer ID must not be None"

    group_id = create_group(token)

    session_id = create_session(token, group_id, engineer_id)

    try:
        attendance_payload = [
            {"engineerId": engineer_id, "status": "Present"}
        ]

        resp = put_session_attendance(token, session_id, attendance_payload)
        assert resp.status_code == 200, f"Expected 200 OK, got {resp.status_code}"
        resp_json = resp.json()
        assert isinstance(resp_json, dict), "Response should be a JSON object"
        assert "attendance" in resp_json or "message" in resp_json, "Response confirmation missing"
    finally:
        delete_session(token, session_id)
        delete_group(token, group_id)


test_put_api_sessions_id_attendance_with_valid_payload_and_authorized_token()