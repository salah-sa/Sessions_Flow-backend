import requests

def test_postapiauthloginvalidcredentials():
    base_url = "http://localhost:5180"
    url = f"{base_url}/api/auth/login"
    payload = {
        "Identifier": "admin@sessionflow.local",
        "Password": "Admin1234!"
    }
    headers = {
        "Content-Type": "application/json"
    }
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        assert response.status_code == 200, f"Expected status code 200 but got {response.status_code}"
        data = response.json()
        assert "token" in data and isinstance(data["token"], str) and data["token"], "JWT token missing or empty in response"
        assert "user" in data and isinstance(data["user"], dict) and data["user"], "User object missing or empty in response"
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

test_postapiauthloginvalidcredentials()