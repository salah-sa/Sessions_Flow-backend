import urllib.request
import urllib.parse
import json

base = "https://sessionsflow-backend-production.up.railway.app/api/auth"
queries = ["AR", "unity", "Mid", "salah", "a", "b", "c", "3c"]

for q in queries:
    url = base + "/discover-group?name=" + urllib.parse.quote(q)
    try:
        with urllib.request.urlopen(url, timeout=15) as r:
            data = json.loads(r.read())
            print("'" + q + "' -> FOUND: " + str(data.get("groupName")))
    except urllib.error.HTTPError as e:
        body = json.loads(e.read())
        suggestions = body.get("suggestions", [])
        print("'" + q + "' -> 404 | suggestions: " + str(suggestions))
    except Exception as e:
        print("'" + q + "' -> ERROR: " + str(e))
