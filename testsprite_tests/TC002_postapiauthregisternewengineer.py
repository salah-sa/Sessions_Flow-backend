import requests
import uuid

BASE_URL = "http://localhost:5180"
REGISTER_ENDPOINT = f"{BASE_URL}/api/auth/register"
LOGIN_ENDPOINT = f"{BASE_URL}/api/auth/login"
TIMEOUT = 30

def test_postapiauthregisternewengineer():
    unique_email = f"newengineer_{uuid.uuid4().hex[:8]}@eng.local"
    register_payload = {
        "Name": "New Eng",
        "Email": unique_email,
        "Password": "EngPass1!"
    }

    # Register new engineer
    response = requests.post(REGISTER_ENDPOINT, json=register_payload, timeout=TIMEOUT)
    assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
    json_resp = response.json()
    assert "engineer" in json_resp and "id" in json_resp["engineer"], "Engineer ID missing in response"
    assert "status" in json_resp, "Status missing in response"
    assert json_resp["status"] == "Pending", f"Expected status 'Pending', got {json_resp['status']}"

    # Attempt login with same credentials — pending accounts return 400 (not 401)
    login_payload = {
        "Identifier": unique_email,
        "Password": "EngPass1!"
    }
    login_response = requests.post(LOGIN_ENDPOINT, json=login_payload, timeout=TIMEOUT)
    assert login_response.status_code == 400, f"Expected 400 when logging in with pending account, got {login_response.status_code}"
    login_json = login_response.json()
    assert "error" in login_json, "Expected error field in response for pending account login"

test_postapiauthregisternewengineer()