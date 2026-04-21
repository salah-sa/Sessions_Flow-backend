import urllib.request
import urllib.error
import json

base_url = "http://localhost:5180/api/auth"

def test_discover(name):
    print(f"Testing discovery for: '{name}'")
    url = f"{base_url}/discover-group?name={urllib.parse.quote(name)}"
    try:
        with urllib.request.urlopen(url) as response:
            print(f"Status: {response.getcode()}")
            print(f"Body: {response.read().decode('utf-8')}")
    except urllib.error.HTTPError as e:
        print(f"Status: {e.code}")
        print(f"Body: {e.read().decode('utf-8')}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_discover("Unity")
    test_discover("3c.Unity")
    test_discover("NonExistentGroupXYZ")
