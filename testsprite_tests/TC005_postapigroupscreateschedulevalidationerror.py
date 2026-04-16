import requests

def test_postapigroupscreateschedulevalidationerror():
    base_url = "http://localhost:5180"
    login_url = f"{base_url}/api/auth/login"
    groups_url = f"{base_url}/api/groups"
    auth = ("admin@sessionflow.local", "Admin1234!")
    timeout = 30

    # Login to get JWT token
    login_payload = {
        "Identifier": "admin@sessionflow.local",
        "Password": "Admin1234!"
    }
    login_response = requests.post(login_url, json=login_payload, timeout=timeout)
    assert login_response.status_code == 200, f"Login failed with status {login_response.status_code}"
    token = login_response.json().get("token")
    assert token, "Token not found in login response"

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # Prepare payload with schedules count not matching frequency to trigger 400 validation error
    invalid_group_payload = {
        "Name": "Invalid schedule",
        "Level": 1,
        "Frequency": 2,
        "Schedules": [
            {
                "DayOfWeek": 2,
                "StartTime": "10:00:00",
                "DurationMinutes": 60
            }
        ]
    }

    response = requests.post(groups_url, json=invalid_group_payload, headers=headers, timeout=timeout)
    assert response.status_code == 400, f"Expected 400 but got {response.status_code}"

test_postapigroupscreateschedulevalidationerror()