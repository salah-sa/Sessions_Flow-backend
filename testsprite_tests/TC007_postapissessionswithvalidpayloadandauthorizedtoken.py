import requests
from datetime import datetime, timedelta

BASE_URL = "http://localhost:5180"
LOGIN_URL = f"{BASE_URL}/api/auth/login"
SESSIONS_URL = f"{BASE_URL}/api/sessions"
GROUPS_URL = f"{BASE_URL}/api/groups"


def test_post_api_sessions_with_valid_payload_and_authorized_token():
    try:
        # Authenticate and get JWT token
        auth_payload = {
            "email": "admin@sessionflow.local",
            "password": "Admin1234!"
        }
        auth_resp = requests.post(LOGIN_URL, json=auth_payload, timeout=30)
        assert auth_resp.status_code == 200, f"Auth failed with status {auth_resp.status_code}"
        token = auth_resp.json().get("token")
        assert token, "JWT token not found in auth response"
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

        # Create a new group to use groupId for session
        group_payload = {
            "name": "Test Group",
            "cohorts": [],
            "tags": [],
            "level": "Beginner",
            "activeEngineerIDs": []
        }
        create_group_resp = requests.post(GROUPS_URL, headers=headers, json=group_payload, timeout=30)
        assert create_group_resp.status_code == 201, f"Group creation failed with status {create_group_resp.status_code}"
        group_id = create_group_resp.json().get("id")
        assert group_id, "Group id not returned after creation"

        # Get current user's profile to obtain engineerId
        me_resp = requests.get(f"{BASE_URL}/api/auth/me", headers=headers, timeout=30)
        assert me_resp.status_code == 200, f"Get current user failed with status {me_resp.status_code}"
        engineer_id = me_resp.json().get("id")
        assert engineer_id, "EngineerId not found in user profile"

        # Prepare payload for session creation
        start_time = datetime.utcnow() + timedelta(minutes=5)
        end_time = start_time + timedelta(hours=1)
        session_payload = {
            "groupId": group_id,
            "engineerId": engineer_id,
            "start": start_time.isoformat() + "Z",
            "end": end_time.isoformat() + "Z"
        }

        # Create a new session
        session_resp = requests.post(SESSIONS_URL, json=session_payload, headers=headers, timeout=30)
        assert session_resp.status_code == 201, f"Session creation failed with status {session_resp.status_code}"
        session_data = session_resp.json()
        session_id = session_data.get("id")
        assert session_id, "Session id not returned after creation"

    finally:
        # Cleanup: Delete the created session if exists
        if 'session_id' in locals():
            try:
                requests.delete(f"{SESSIONS_URL}/{session_id}", headers=headers, timeout=30)
            except Exception:
                pass
        # Cleanup: Delete the created group if exists
        if 'group_id' in locals():
            try:
                requests.delete(f"{GROUPS_URL}/{group_id}", headers=headers, timeout=30)
            except Exception:
                pass


test_post_api_sessions_with_valid_payload_and_authorized_token()
