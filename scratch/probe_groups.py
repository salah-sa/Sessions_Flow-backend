import urllib.request
import urllib.error
import urllib.parse
import json

base_url = "http://localhost:5180/api/auth"

# Try single character searches to trigger the suggestions fallback
# which will reveal what groups exist
test_queries = ["a", "b", "c", "d", "e", "f", "g", "m", "p", "s", "u", "3"]

for q in test_queries:
    url = f"{base_url}/discover-group?name={urllib.parse.quote(q)}"
    try:
        with urllib.request.urlopen(url, timeout=10) as response:
            data = json.loads(response.read().decode('utf-8'))
            print(f"'{q}' -> FOUND: {data.get('groupName')}")
    except urllib.error.HTTPError as e:
        body = json.loads(e.read().decode('utf-8'))
        suggestions = body.get('suggestions', [])
        if suggestions:
            print(f"'{q}' -> SUGGESTIONS: {suggestions}")
        # else skip silently
    except Exception as e:
        print(f"'{q}' -> ERROR: {e}")
