import requests

BASE_URL = "http://localhost:5180"
ADMIN_EMAIL = "admin@sessionflow.local"
ADMIN_PASSWORD = "Admin1234!"
TIMEOUT = 30

def admin_login():
    url = f"{BASE_URL}/api/auth/login"
    payload = {"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    resp = requests.post(url, json=payload, timeout=TIMEOUT)
    resp.raise_for_status()
    data = resp.json()
    assert "token" in data and data.get("status") != "Pending"
    return data["token"]

def create_group(token):
    url = f"{BASE_URL}/api/groups"
    # PRD 4.2 group creation schema example compliant
    payload = {
        "name": "Test Group TC006",
        "level": 2,
        "schedules": [
            {"day": "Monday", "start": "09:00", "end": "11:00"},
            {"day": "Wednesday", "start": "10:00", "end": "12:00"}
        ]
    }
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)
    resp.raise_for_status()
    data = resp.json()
    assert "id" in data
    return data["id"], payload

def delete_group(token, group_id):
    url = f"{BASE_URL}/api/groups/{group_id}"
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.delete(url, headers=headers, timeout=TIMEOUT)
    if resp.status_code not in (200, 204, 404):
        resp.raise_for_status()

def test_put_api_groups_id_with_valid_id_and_payload():
    token = admin_login()
    group_id, original_payload = create_group(token)

    try:
        url = f"{BASE_URL}/api/groups/{group_id}"
        headers = {"Authorization": f"Bearer {token}"}
        # Modified valid payload compliant with PRD 4.2: update some fields
        updated_payload = {
            "name": "Updated Test Group TC006",
            "level": 3,
            "schedules": [
                {"day": "Tuesday", "start": "08:00", "end": "10:00"},
                {"day": "Thursday", "start": "09:00", "end": "11:00"},
                {"day": "Friday", "start": "14:00", "end": "16:00"}
            ]
        }
        resp = requests.put(url, json=updated_payload, headers=headers, timeout=TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
        assert resp.status_code == 200
        assert isinstance(data, dict)
        assert data.get("id") == group_id
        assert data.get("name") == updated_payload["name"]
        assert data.get("level") == updated_payload["level"]
        assert "schedules" in data and len(data["schedules"]) == len(updated_payload["schedules"])
        # Validate schedules content length and keys
        for sched in data["schedules"]:
            assert "day" in sched and "start" in sched and "end" in sched
    finally:
        delete_group(token, group_id)


test_put_api_groups_id_with_valid_id_and_payload()