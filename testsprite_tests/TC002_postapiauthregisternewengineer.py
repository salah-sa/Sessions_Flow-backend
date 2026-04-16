import requests
import uuid

BASE_URL = "http://localhost:5180"
TIMEOUT = 30
ADMIN_LOGIN_PAYLOAD = {
    "Identifier": "admin@sessionflow.local",
    "Password": "Admin1234!"
}

def test_postapiauthregisternewengineer():
    # Generate unique email and name for registration to avoid conflicts
    unique_suffix = str(uuid.uuid4())
    new_engineer_name = f"New Eng {unique_suffix}"
    new_engineer_email = f"neweng{unique_suffix}@eng.local"
    new_engineer_password = "EngPass1!"

    register_url = f"{BASE_URL}/api/auth/register"
    register_payload = {
        "Name": new_engineer_name,
        "Email": new_engineer_email,
        "Password": new_engineer_password
    }

    # POST /api/auth/register without authentication header (auth not required)
    try:
        response = requests.post(register_url, json=register_payload, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Request to register new engineer failed: {e}"

    # Validate response status code and body
    assert response.status_code == 201, f"Expected status 201, got {response.status_code}"
    resp_json = response.json()
    assert "engineer" in resp_json, "Response missing 'engineer' object"
    assert "id" in resp_json["engineer"], "Response 'engineer' missing 'id'"
    assert "status" in resp_json, "Response missing 'status'"
    assert resp_json["status"] == "Pending", f"Expected status 'Pending', got {resp_json['status']}"

    engineer_id = resp_json["engineer"]["id"]
    assert isinstance(engineer_id, str) and engineer_id, "Engineer ID should be a non-empty string"
    # Registration creates pending engineer, do NOT attempt login per instructions

test_postapiauthregisternewengineer()