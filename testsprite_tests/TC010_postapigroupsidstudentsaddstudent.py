import requests
import uuid

BASE_URL = "http://localhost:5180"
LOGIN_ENDPOINT = "/api/auth/login"
GROUPS_ENDPOINT = "/api/groups"
STUDENTS_ENDPOINT_TEMPLATE = "/api/groups/{id}/students"
GROUP_DELETE_ENDPOINT = "/api/groups/{id}"

AUTH_CREDENTIALS = {
    "Identifier": "admin@sessionflow.local",
    "Password": "Admin1234!"
}
REQUEST_TIMEOUT = 30

def test_post_api_groups_id_students_add_student():
    # Authenticate and get JWT token
    try:
        login_resp = requests.post(
            f"{BASE_URL}{LOGIN_ENDPOINT}",
            json=AUTH_CREDENTIALS,
            timeout=REQUEST_TIMEOUT
        )
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        token = login_resp.json().get("token")
        assert token, "No token returned in login response"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

        # Create a valid group to add a student to
        group_payload = {
            "Name": "Test Group for Student Add",
            "Description": "Group created for TC010 test",
            "Level": 2,
            "Frequency": 2,
            "NumberOfStudents": 4,
            "StartingSessionNumber": 1,
            "TotalSessions": 10,
            "Schedules": [
                {"DayOfWeek": 1, "StartTime": "10:00:00", "DurationMinutes": 60},
                {"DayOfWeek": 3, "StartTime": "10:00:00", "DurationMinutes": 60}
            ]
        }
        group_resp = requests.post(
            f"{BASE_URL}{GROUPS_ENDPOINT}",
            json=group_payload,
            headers=headers,
            timeout=REQUEST_TIMEOUT
        )
        assert group_resp.status_code == 201, f"Group creation failed: {group_resp.text}"
        group_data = group_resp.json()
        group_id = group_data.get("id")
        assert group_id, "Group ID missing in creation response"

        try:
            # Add a student to the created group
            unique_student_name = f"Student_{uuid.uuid4().hex[:8]}"
            student_payload = {
                "Name": unique_student_name
            }
            add_student_resp = requests.post(
                f"{BASE_URL}{STUDENTS_ENDPOINT_TEMPLATE.format(id=group_id)}",
                json=student_payload,
                headers=headers,
                timeout=REQUEST_TIMEOUT
            )
            assert add_student_resp.status_code == 201, f"Add student failed: {add_student_resp.text}"
            student_data = add_student_resp.json()
            # Validate response contains required fields
            for field in ("id", "name", "uniqueStudentCode"):
                assert field in student_data, f"Missing field '{field}' in add student response"
            assert student_data["name"] == unique_student_name, "Student name mismatch"

        finally:
            # Clean up: delete created group to not leave test data
            del_resp = requests.delete(
                f"{BASE_URL}{GROUP_DELETE_ENDPOINT.format(id=group_id)}",
                headers=headers,
                timeout=REQUEST_TIMEOUT
            )
            # Deletion might return 200 or 404 if already deleted, accept both
            assert del_resp.status_code in (200, 404), f"Failed to delete group: {del_resp.text}"

    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

test_post_api_groups_id_students_add_student()