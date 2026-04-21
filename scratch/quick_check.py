import urllib.request
import urllib.error
import json

# Check auth status endpoint (no auth required)
url = "http://localhost:5180/api/auth/status"
try:
    with urllib.request.urlopen(url, timeout=5) as resp:
        print(f"Auth status: {resp.read().decode('utf-8')}")
except urllib.error.HTTPError as e:
    print(f"Auth status: {e.code} - {e.read().decode('utf-8')}")

# Test discover with empty-ish string
url2 = "http://localhost:5180/api/auth/discover-group?name=test"
try:
    with urllib.request.urlopen(url2, timeout=5) as resp:
        print(f"Discover: {resp.read().decode('utf-8')}")
except urllib.error.HTTPError as e:
    body = e.read().decode('utf-8')
    print(f"Discover: {e.code} - {body}")
except Exception as e:
    print(f"Discover error: {e}")
