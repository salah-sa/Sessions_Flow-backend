import urllib.request
import urllib.error
import urllib.parse
import json

# We need auth to hit the /api/groups endpoint
# Let's login as admin first, then list groups

base = "http://localhost:5180"

def login_admin():
    """Login as admin to get JWT token"""
    data = json.dumps({
        "email": "admin@sessionflow.local",
        "password": "Admin1234!",
        "portal": "Admin"
    }).encode('utf-8')
    
    req = urllib.request.Request(
        f"{base}/api/auth/login",
        data=data,
        headers={"Content-Type": "application/json"}
    )
    
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            result = json.loads(resp.read().decode('utf-8'))
            return result.get('token')
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8')
        print(f"Login failed: {e.code} - {body}")
        return None
    except Exception as e:
        print(f"Login error: {e}")
        return None

def list_groups(token):
    """List all groups using auth token"""
    req = urllib.request.Request(
        f"{base}/api/groups?page=1&pageSize=50",
        headers={
            "Authorization": f"Bearer {token}",
            "X-Requested-With": "XMLHttpRequest"
        }
    )
    
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            # Could be paginated
            groups = data if isinstance(data, list) else data.get('items', data.get('groups', [data]))
            print(f"\nFound {len(groups) if isinstance(groups, list) else '?'} group(s):")
            if isinstance(groups, list):
                for g in groups:
                    name = g.get('name', 'N/A')
                    norm = g.get('normalizedGroupName', '')
                    std = g.get('standardizedName', '')
                    label = g.get('courseLabel', '')
                    deleted = g.get('isDeleted', False)
                    print(f"  Name: {name}")
                    if norm: print(f"    Normalized: {norm}")
                    if std: print(f"    Standardized: {std}")
                    if label: print(f"    CourseLabel: {label}")
                    if deleted: print(f"    [DELETED]")
                    print()
            else:
                print(json.dumps(data, indent=2)[:500])
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8')
        print(f"Groups request failed: {e.code} - {body[:300]}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    print("Logging in as admin...")
    token = login_admin()
    if token:
        print(f"Token obtained (first 20 chars): {token[:20]}...")
        list_groups(token)
    else:
        print("Could not authenticate. Check admin credentials.")
