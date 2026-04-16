import requests

BASE_URL = "http://localhost:5180"

def test_postapiauthloginvalidcredentials():
    url = f"{BASE_URL}/api/auth/login"
    payload = {
        "Identifier": "admin@sessionflow.local",
        "Password": "Admin1234!"
    }
    headers = {
        "Content-Type": "application/json"
    }
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        assert response.status_code == 200, f"Expected status 200, got {response.status_code}"
        data = response.json()
        assert "token" in data, "Response JSON missing 'token'"
        assert isinstance(data["token"], str) and len(data["token"]) > 0, "'token' should be a non-empty string"
        assert "user" in data, "Response JSON missing 'user'"
        assert isinstance(data["user"], dict) and len(data["user"]) > 0, "'user' should be a non-empty object"
    except requests.RequestException as e:
        assert False, f"Request failed with exception: {e}"

test_postapiauthloginvalidcredentials()