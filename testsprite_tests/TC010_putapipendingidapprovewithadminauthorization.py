import requests
import uuid

BASE_URL = "http://localhost:5180"
TIMEOUT = 30

ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "AdminPassword123!"


def login(email: str, password: str) -> str:
    url = f"{BASE_URL}/api/auth/login"
    payload = {"email": email, "password": password}
    r = requests.post(url, json=payload, timeout=TIMEOUT)
    assert r.status_code == 200, f"Login failed with status {r.status_code} and message {r.text}"
    data = r.json()
    assert "token" in data, "JWT token missing in login response"
    return data["token"]


def register_pending_engineer(admin_token: str) -> dict:
    # Generates a unique email and registers a new pending engineer using a valid access code "ENG1"
    url = f"{BASE_URL}/api/auth/register"
    unique_email = f"pending-{uuid.uuid4().hex}@example.com"
    payload = {
        "name": "Pending Engineer",
        "email": unique_email,
        "password": "PendingEngPass123!",
        "accessCode": "ENG1"
    }
    # Removed headers, registration does not require auth
    r = requests.post(url, json=payload, timeout=TIMEOUT)
    assert r.status_code == 201, f"Expected 201 Created, got {r.status_code}"
    data = r.json()
    # Response must include at least the id and status (pending)
    assert "id" in data, "No id in register response"
    assert "status" in data, "No status in register response"
    assert data["status"].lower() == "pending", "Engineer status is not pending"
    return data


def delete_engineer(admin_token: str, engineer_id: str):
    # There is no documented DELETE for engineer; assuming no delete available
    # Skipping actual delete, since PRD does not mention engineer delete endpoint
    pass


def test_putapipendingidapprovewithadminauthorization():
    # Step 1: Login as admin to get token
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Step 2: Create a new pending engineer to approve
    pending_engineer = None
    try:
        pending_engineer = register_pending_engineer(admin_token)
        pending_id = pending_engineer["id"]

        # Step 3: Approve pending engineer
        url = f"{BASE_URL}/api/pending/{pending_id}/approve"
        r = requests.put(url, headers=headers, timeout=TIMEOUT)

        # Validate response is 200 OK confirming approval
        assert r.status_code == 200, f"Expected 200 OK, got {r.status_code}"

        # Response body might confirm approval, check json includes confirmation or updated status
        try:
            data = r.json()
            # If status is returned, ensure it's not pending anymore
            if "status" in data:
                assert data["status"].lower() != "pending", "Engineer status still pending after approval"
        except ValueError:
            # If no JSON body, that's acceptable if status code is 200
            pass

    finally:
        # No documented method to delete engineer, so no cleanup possible
        # If there was a delete endpoint, perform it here
        pass


# Execute the test function
test_putapipendingidapprovewithadminauthorization()
