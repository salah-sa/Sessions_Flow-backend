import requests

BASE_URL = "http://localhost:5180"

# Test user credentials for login (should exist in the system for this test)
TEST_USER_EMAIL = "engineer1@example.com"
TEST_USER_PASSWORD = "TestPass123!"

def test_put_api_sessions_id_attendance_with_valid_payload_and_authorized_token():
    # Login to get JWT token
    login_url = f"{BASE_URL}/api/auth/login"
    login_payload = {
        "email": TEST_USER_EMAIL,
        "password": TEST_USER_PASSWORD
    }
    login_response = requests.post(login_url, json=login_payload, timeout=30)
    assert login_response.status_code == 200, f"Login failed: {login_response.text}"
    token = login_response.json().get("token") or login_response.json().get("accessToken")
    assert token, "No JWT token received from login"

    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    # Create required group to schedule a session
    group_payload = {"name": "Attendance Test Group", "description": "Group for attendance test"}
    group_response = requests.post(f"{BASE_URL}/api/groups", json=group_payload, headers=headers, timeout=30)
    assert group_response.status_code == 201, f"Group creation failed: {group_response.text}"
    group_id = group_response.json().get("id") or group_response.json().get("groupId")
    assert group_id, "No group ID returned"

    # Get current user profile to obtain engineerId
    me_response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers, timeout=30)
    assert me_response.status_code == 200, f"Failed to get user profile: {me_response.text}"
    engineer_id = me_response.json().get("id")
    assert engineer_id, "No engineer ID found in user profile"

    # Create a new teaching session
    from datetime import datetime, timedelta
    start_iso = (datetime.utcnow() + timedelta(minutes=5)).isoformat() + "Z"
    end_iso = (datetime.utcnow() + timedelta(hours=1)).isoformat() + "Z"
    session_payload = {
        "groupId": group_id,
        "start": start_iso,
        "end": end_iso,
        "engineerId": engineer_id
    }
    session_response = requests.post(f"{BASE_URL}/api/sessions", json=session_payload, headers=headers, timeout=30)
    assert session_response.status_code == 201, f"Session creation failed: {session_response.text}"
    session_id = session_response.json().get("id") or session_response.json().get("sessionId")
    assert session_id, "No session ID returned"

    try:
        # Prepare attendance payload - example attendance records
        attendance_payload = [
            {
                "engineerId": engineer_id,
                "status": "Present"
            }
        ]

        attendance_url = f"{BASE_URL}/api/sessions/{session_id}/attendance"
        attendance_response = requests.put(attendance_url, json=attendance_payload, headers=headers, timeout=30)
        assert attendance_response.status_code == 200, f"Attendance update failed: {attendance_response.text}"

        json_response = attendance_response.json()
        # Expect the response to confirm that attendance records were stored
        assert isinstance(json_response, dict) or isinstance(json_response, list), "Invalid response format for attendance"
        # Additional validation can be done here if API returns detailed confirmation

    finally:
        # Clean up created session
        requests.delete(f"{BASE_URL}/api/sessions/{session_id}", headers=headers, timeout=30)
        # Clean up created group
        requests.delete(f"{BASE_URL}/api/groups/{group_id}", headers=headers, timeout=30)

test_put_api_sessions_id_attendance_with_valid_payload_and_authorized_token()