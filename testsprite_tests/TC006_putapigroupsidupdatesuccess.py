import requests
import uuid

BASE_URL = "http://localhost:5180"
USERNAME = "admin@sessionflow.local"
PASSWORD = "Admin1234!"

def obtain_jwt_token():
    login_payload = {"Identifier": USERNAME, "Password": PASSWORD}
    response = requests.post(f"{BASE_URL}/api/auth/login", json=login_payload, timeout=30)
    assert response.status_code == 200, f"Login failed with status {response.status_code}"
    data = response.json()
    assert "token" in data, "Login response missing token"
    return data["token"]

def test_put_api_groups_id_update_success():
    token = obtain_jwt_token()
    headers = {"Authorization": f"Bearer {token}"}

    group_create_payload = {
        "Name": f"TC006-{uuid.uuid4().hex[:6]}",
        "Description": "Afternoon cohort",
        "Level": 2,
        "Frequency": 2,
        "NumberOfStudents": 4,  # Level 2 max is 4
        "StartingSessionNumber": 1,
        "TotalSessions": 12,
        "Schedules": [
            {"DayOfWeek": 1, "StartTime": "14:00:00", "DurationMinutes": 60},
            {"DayOfWeek": 3, "StartTime": "14:00:00", "DurationMinutes": 60}
        ]
    }

    group_id = None
    try:
        response_create = requests.post(f"{BASE_URL}/api/groups", json=group_create_payload, headers=headers, timeout=30)
        assert response_create.status_code == 201, f"Expected 201, got {response_create.status_code}: {response_create.text}"
        group_data = response_create.json()
        assert "id" in group_data, "Response JSON missing 'id'"
        group_id = group_data["id"]

        update_payload = {
            "Name": f"Updated-{uuid.uuid4().hex[:6]}",
            "Description": "Updated description",
            "Level": 3
        }

        response_put = requests.put(f"{BASE_URL}/api/groups/{group_id}", json=update_payload, headers=headers, timeout=30)
        assert response_put.status_code == 200, f"Expected 200, got {response_put.status_code}: {response_put.text}"
        updated_group = response_put.json()
        assert updated_group.get("name") == update_payload["Name"]
        assert updated_group.get("description") == update_payload["Description"]
        assert updated_group.get("level") == update_payload["Level"]

    finally:
        if group_id:
            try:
                requests.delete(f"{BASE_URL}/api/groups/{group_id}", headers=headers, timeout=30)
            except Exception:
                pass

test_put_api_groups_id_update_success()
