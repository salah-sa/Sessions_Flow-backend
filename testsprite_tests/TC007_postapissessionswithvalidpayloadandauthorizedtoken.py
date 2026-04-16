import requests
import datetime

BASE_URL = "http://localhost:5180"
TIMEOUT = 30

ADMIN_EMAIL = "admin@sessionflow.local"
ADMIN_PASSWORD = "Admin1234!"


def get_admin_token():
    url = f"{BASE_URL}/api/auth/login"
    payload = {
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    }
    resp = requests.post(url, json=payload, timeout=TIMEOUT)
    resp.raise_for_status()
    data = resp.json()
    assert resp.status_code == 200
    assert "token" in data, "Token not found in login response"
    return data["token"]


def create_group(token):
    url = f"{BASE_URL}/api/groups"

    group_payload = {
        "name": "Test Group TC007",
        "level": 2,  # level between 1 and 4
        "frequency": 2,  # between 1 and 3
        "tags": [],
        "schedules": [
            {
                "dayOfWeek": 1,  # Monday as integer
                "startTime": "09:00:00",
                "endTime": "10:00:00"
            },
            {
                "dayOfWeek": 3,  # Wednesday as integer
                "startTime": "09:00:00",
                "endTime": "10:00:00"
            }
        ]
    }
    headers = {
        "Authorization": f"Bearer {token}"
    }
    resp = requests.post(url, json=group_payload, headers=headers, timeout=TIMEOUT)
    resp.raise_for_status()
    assert resp.status_code == 201
    data = resp.json()
    assert "id" in data, "Group creation response missing id"
    return data["id"]


def get_engineers(token):
    url = f"{BASE_URL}/api/engineers"
    headers = {
        "Authorization": f"Bearer {token}"
    }
    resp = requests.get(url, headers=headers, timeout=TIMEOUT)
    resp.raise_for_status()
    data = resp.json()
    assert isinstance(data, list), "Engineers list should be a list"
    return data


def post_session_with_valid_payload_and_authorized_token():
    admin_token = get_admin_token()
    headers = {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }

    group_id = None
    session_id = None
    try:
        group_id = create_group(admin_token)

        engineers = get_engineers(admin_token)
        assert len(engineers) > 0, "No engineers found to assign session"
        engineer_id = None

        for eng in engineers:
            if "id" in eng:
                engineer_id = eng["id"]
                break
        assert engineer_id is not None, "Engineer id not found"

        now = datetime.datetime.utcnow()
        start = now.replace(minute=0, second=0, microsecond=0) + datetime.timedelta(hours=1)
        end = start + datetime.timedelta(hours=1)

        payload = {
            "groupId": group_id,
            "start": start.isoformat() + "Z",
            "end": end.isoformat() + "Z",
            "engineerId": engineer_id
        }

        url = f"{BASE_URL}/api/sessions"
        resp = requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)
        if resp.status_code >= 400:
            try:
                error_data = resp.json()
            except Exception:
                error_data = resp.text
            resp.raise_for_status()
        assert resp.status_code == 201, f"Expected 201 Created but got {resp.status_code}"

        resp_data = resp.json()
        assert "id" in resp_data, "Response missing session id"
        session_id = resp_data["id"]

    finally:
        if session_id:
            url_del_session = f"{BASE_URL}/api/sessions/{session_id}"
            try:
                requests.delete(url_del_session, headers={"Authorization": f"Bearer {admin_token}"}, timeout=TIMEOUT)
            except Exception:
                pass
        if group_id:
            url_del_group = f"{BASE_URL}/api/groups/{group_id}"
            try:
                requests.delete(url_del_group, headers={"Authorization": f"Bearer {admin_token}"}, timeout=TIMEOUT)
            except Exception:
                pass


post_session_with_valid_payload_and_authorized_token()
