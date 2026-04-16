import requests
from requests.auth import HTTPBasicAuth
import uuid

BASE_URL = "http://localhost:5180"
AUTH_USER = "admin@sessionflow.local"
AUTH_PASS = "Admin1234!"
TIMEOUT = 30


def test_postapigroupsidstudentsaddstudent():
    # Authenticate to get JWT token
    auth_resp = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"Identifier": AUTH_USER, "Password": AUTH_PASS},
        timeout=TIMEOUT,
    )
    assert auth_resp.status_code == 200, f"Authentication failed: {auth_resp.text}"
    token = auth_resp.json().get("token")
    assert token, "No token received from login"

    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    # Create a new group to add student into
    group_payload = {
        "Name": f"Test Group {str(uuid.uuid4())[:8]}",
        "Description": "Test group for adding student",
        "Level": 1,
        "Frequency": 1,
        "NumberOfStudents": 4,
        "StartingSessionNumber": 1,
        "TotalSessions": 10,
        "Schedules": [
            {"DayOfWeek": 1, "StartTime": "09:00:00", "DurationMinutes": 60}
        ],
    }
    group_id = None
    student_id = None

    try:
        group_resp = requests.post(
            f"{BASE_URL}/api/groups", json=group_payload, headers=headers, timeout=TIMEOUT
        )
        assert group_resp.status_code == 201, f"Group creation failed: {group_resp.text}"
        group_data = group_resp.json()
        group_id = group_data.get("id")
        assert group_id, "Group ID not returned on creation"

        # Add a student to the group
        student_name = f"Student {str(uuid.uuid4())[:8]}"
        student_payload = {"Name": student_name}
        student_resp = requests.post(
            f"{BASE_URL}/api/groups/{group_id}/students",
            json=student_payload,
            headers=headers,
            timeout=TIMEOUT,
        )
        assert student_resp.status_code == 201, f"Add student failed: {student_resp.text}"
        student_data = student_resp.json()
        student_id = student_data.get("id")

        # Verify response includes id, name, uniqueStudentCode
        assert student_id, "Student ID not returned"
        assert student_data.get("name") == student_name, "Student name mismatch"
        assert isinstance(student_data.get("uniqueStudentCode"), str) and len(student_data.get("uniqueStudentCode")) > 0, "Invalid uniqueStudentCode"

    finally:
        # Clean up: delete the group (which should cascade or remove associated students)
        if group_id:
            del_resp = requests.delete(
                f"{BASE_URL}/api/groups/{group_id}", headers=headers, timeout=TIMEOUT
            )
            assert del_resp.status_code == 200, f"Group deletion failed: {del_resp.text}"


test_postapigroupsidstudentsaddstudent()
