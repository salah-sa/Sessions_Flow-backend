import urllib.request
import urllib.error
import urllib.parse
import json

base_url = "http://localhost:5180/api/auth"

def test_discover(name):
    print(f"\n{'='*50}")
    print(f"Testing discovery for: '{name}'")
    print(f"{'='*50}")
    url = f"{base_url}/discover-group?name={urllib.parse.quote(name)}"
    try:
        with urllib.request.urlopen(url, timeout=10) as response:
            data = json.loads(response.read().decode('utf-8'))
            print(f"Status: {response.getcode()} OK")
            print(f"Group: {data.get('groupName', 'N/A')}")
            print(f"Engineer: {data.get('engineerName', 'N/A')}")
            students = data.get('students', [])
            print(f"Students: {len(students)}")
            for s in students[:3]:
                print(f"  - {s['name']} ({s['status']})")
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8')
        data = json.loads(body)
        print(f"Status: {e.code}")
        print(f"Error: {data.get('error', 'Unknown')}")
        suggestions = data.get('suggestions', [])
        if suggestions:
            print(f"Suggestions ({len(suggestions)}):")
            for s in suggestions:
                print(f"  -> {s}")
        else:
            print("No suggestions returned.")
    except Exception as e:
        print(f"Connection Error: {e}")

if __name__ == "__main__":
    # Test 1: Partial match (fuzzy)
    test_discover("Unity")
    
    # Test 2: With 3C prefix
    test_discover("3c.Unity")
    
    # Test 3: Completely invalid
    test_discover("NonExistentGroupXYZ123")
    
    # Test 4: Short input
    test_discover("Mid")
    
    # Test 5: Very short
    test_discover("Py")
