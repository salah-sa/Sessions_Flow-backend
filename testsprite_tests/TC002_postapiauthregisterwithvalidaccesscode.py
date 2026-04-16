import requests
import uuid

BASE_URL = "http://localhost:5180"
TIMEOUT = 30

ADMIN_EMAIL = "admin@sessionflow.local"
ADMIN_PASSWORD = "Admin1234!"


def login_admin():
    url = f"{BASE_URL}/api/auth/login"
    payload = {
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    }
    response = requests.post(url, json=payload, timeout=TIMEOUT)
    response.raise_for_status()
    data = response.json()
    token = data.get("token")
    assert token and isinstance(token, str)
    return token


def test_post_api_auth_register_with_valid_access_code():
    register_url = f"{BASE_URL}/api/auth/register"
    login_url = f"{BASE_URL}/api/auth/login"

    # Generate unique email to avoid conflicts
    unique_email = f"user_{uuid.uuid4().hex[:8]}@example.com"
    registration_payload = {
        "name": "Test User",
        "email": unique_email,
        "password": "ValidPass123!",
        "accessCode": "ENG1"
    }

    # Register user with valid access code
    register_response = requests.post(register_url, json=registration_payload, timeout=TIMEOUT)
    assert register_response.status_code == 201, f"Expected 201 Created but got {register_response.status_code}"
    reg_data = register_response.json()
    # Check for status field in response is "Pending"
    assert reg_data.get("status") == "Pending", f"Expected status 'Pending' but got {reg_data.get('status')}"

    # Attempt login with newly registered pending user - expect 400 Bad Request
    login_payload = {
        "email": unique_email,
        "password": "ValidPass123!"
    }
    login_response = requests.post(login_url, json=login_payload, timeout=TIMEOUT)
    assert login_response.status_code == 400, f"Login should fail with 400 but got {login_response.status_code}"
    login_data = login_response.json()
    # Confirm error message presence in login failure
    assert "error" in login_data or "message" in login_data

    # Finally, ensure Admin user can still login (force original admin login)
    admin_token = login_admin()
    assert admin_token


test_post_api_auth_register_with_valid_access_code()
