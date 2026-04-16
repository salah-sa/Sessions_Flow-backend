import requests

BASE_URL = "http://localhost:5180"
LOGIN_PATH = "/api/auth/login"
GROUPS_PATH = "/api/groups"

def test_postapigroupscreatesuccess():
    username = "admin@sessionflow.local"
    password = "Admin1234!"

    # Authenticate
    login_url = f"{BASE_URL}{LOGIN_PATH}"
    login_payload = {"Identifier": username, "Password": password}
    login_response = requests.post(login_url, json=login_payload, timeout=30)
    assert login_response.status_code == 200, f"Login failed: {login_response.text}"
    login_data = login_response.json()
    assert "token" in login_data and "user" in login_data, "Login response missing token or user"
    token = login_data["token"]

    headers = {"Authorization": f"Bearer {token}"}
    group_url = f"{BASE_URL}{GROUPS_PATH}"

    # Level 2, Frequency 2, NumberOfStudents 4 (max for Level 1-3)
    import uuid
    group_payload = {
        "Name": f"Level 2 Cohort {uuid.uuid4().hex[:6]}",
        "Description": "Afternoon cohort for testing",
        "Level": 2,
        "Frequency": 2,
        "NumberOfStudents": 4,
        "StartingSessionNumber": 1,
        "TotalSessions": 12,
        "Schedules": [
            {"DayOfWeek": 2, "StartTime": "14:00:00", "DurationMinutes": 60},
            {"DayOfWeek": 4, "StartTime": "14:00:00", "DurationMinutes": 60}
        ]
    }

    created_group_id = None
    try:
        # Create the group
        create_response = requests.post(group_url, json=group_payload, headers=headers, timeout=30)
        assert create_response.status_code == 201, f"Expected 201, got {create_response.status_code}: {create_response.text}"
        create_data = create_response.json()
        assert "id" in create_data and "name" in create_data, "Response missing id or name"
        created_group_id = create_data["id"]

        # Verify group appears in GET /api/groups (paginated envelope with 'items' key)
        get_response = requests.get(group_url, headers=headers, timeout=30)
        assert get_response.status_code == 200, f"GET /api/groups failed: {get_response.status_code}"
        get_data = get_response.json()
        items = get_data.get("items", [])
        assert isinstance(items, list), "items field should be a list"
        found_group = next((g for g in items if g.get("id") == created_group_id), None)
        assert found_group is not None, "Created group not found in GET /api/groups response"

    finally:
        if created_group_id:
            try:
                requests.delete(f"{group_url}/{created_group_id}", headers=headers, timeout=30)
            except Exception:
                pass

test_postapigroupscreatesuccess()