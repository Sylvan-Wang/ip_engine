import urllib.request
import urllib.error
import json

TOKEN = "sbp_cafc2fff3362a44b99b635ece6decb7b5a9c26e9"
PROJECT_REF = "gsfzugfoiyodxszuunpw"

print("Disabling email confirmation for ip_engine...")

data = json.dumps({"mailer_autoconfirm": True}).encode()
req = urllib.request.Request(
    f"https://api.supabase.com/v1/projects/{PROJECT_REF}/config/auth",
    data=data,
    headers={
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json"
    },
    method="PATCH"
)
try:
    with urllib.request.urlopen(req, timeout=30) as resp:
        result = json.loads(resp.read())
        autoconfirm = result.get("mailer_autoconfirm", "?")
        print(f"SUCCESS! mailer_autoconfirm = {autoconfirm}")
        print("Email confirmation is now DISABLED.")
        print("Users can sign up without verifying their email.")
except urllib.error.HTTPError as e:
    print(f"HTTP ERROR {e.code}: {e.read().decode()}")
except Exception as e:
    print(f"ERROR: {e}")

input("\nPress Enter to close...")
