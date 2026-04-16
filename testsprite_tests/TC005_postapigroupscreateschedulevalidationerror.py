import requests

BASE_URL = "http://localhost:5180"
LOGIN_URL = f"{BASE_URL}/api/auth/login"
GROUPS_URL = f"{BASE_URL}/api/groups"

AUTH_CREDENTIALS = {"Identifier": "admin@sessionflow.local", "Password": "Admin1234!"}
TIMEOUT = 30


def test_postapigroupscreateschedulevalidationerror():
    # Authenticate to get JWT token
    try:
        login_resp = requests.post(LOGIN_URL, json=AUTH_CREDENTIALS, timeout=TIMEOUT)
        assert login_resp.status_code == 200, f"Login failed with status {login_resp.status_code}"
        token = login_resp.json().get("token")
        assert token, "No token returned in login response"
    except Exception as e:
        assert False, f"Authentication failed: {e}"

    headers = {"Authorization": f"Bearer {token}"}

    # Prepare group data with Frequency=2 but only 1 schedule to trigger validation error
    group_data = {
        "Name": "Test Group with Schedule Mismatch",
        "Description": "Should fail due to schedule count mismatch",
        "Level": 2,
        "Frequency": 2,  # Frequency is 2
        "NumberOfStudents": 4,
        "StartingSessionNumber": 1,
        "TotalSessions": 10,
        "Schedules": [  # Only 1 schedule provided instead of 2
            {
                "DayOfWeek": 1,
                "StartTime": "10:00:00",
                "DurationMinutes": 60
            }
        ]
    }

    try:
        resp = requests.post(GROUPS_URL, json=group_data, headers=headers, timeout=TIMEOUT)
    except Exception as e:
        assert False, f"Request to create group failed: {e}"

    # Verification: status code must be 400 for validation error
    assert resp.status_code == 400, f"Expected 400 validation error but got {resp.status_code}"


test_postapigroupscreateschedulevalidationerror()