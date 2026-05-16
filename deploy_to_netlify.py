import urllib.request
import urllib.error
import json
import zipfile
import io
import os

TOKEN = "nfp_p4V3sZ528RfH4gLNqebwjrz3CobFZJ8y5df8"
SITE_ID = "3da20d6b-8faa-4068-b858-103611068fa9"

# Read index.html to find which asset files are referenced
dist_dir = os.path.join(os.path.dirname(__file__), "frontend", "dist")
with open(os.path.join(dist_dir, 'index.html'), encoding='utf-8') as f:
    html = f.read()

# Find referenced asset filenames
import re
js_file = re.search(r'assets/(index-[^"]+\\.js)', html)
css_file = re.search(r'assets/(index-[^"]+\\.css)', html)
js_name = js_file.group(1) if js_file else None
css_name = css_file.group(1) if css_file else None

print(f"Packing: index.html, {js_name}, {css_name}, _redirects")

buf = io.BytesIO()
with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
    z.write(os.path.join(dist_dir, "index.html"), "index.html")
    if js_name:
        z.write(os.path.join(dist_dir, "assets", js_name), f"assets/{js_name}")
    if css_name:
        z.write(os.path.join(dist_dir, "assets", css_name), f"assets/{css_name}")
    redirects = os.path.join(dist_dir, "_redirects")
    if os.path.exists(redirects):
        z.write(redirects, "_redirects")
buf.seek(0)
data = buf.read()
print(f"Zip size: {len(data)//1024}KB")

req = urllib.request.Request(
    f"https://api.netlify.com/api/v1/sites/{SITE_ID}/deploys",
    data=data,
    headers={"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/zip"},
    method="POST"
)
try:
    with urllib.request.urlopen(req, timeout=60) as resp:
        result = json.loads(resp.read())
        print(f"State: {result.get('state')}")
        print(f"URL:   https://ip-engine.netlify.app")
        print("Deploy complete!")
except urllib.error.HTTPError as e:
    print(f"HTTP {e.code}: {e.read().decode()}")
except Exception as e:
    print(f"Error: {e}")

input("\nPress Enter to close...")
