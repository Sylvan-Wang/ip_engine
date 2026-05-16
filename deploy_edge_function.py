"""
Deploy admin-signup Edge Function to Supabase with verify_jwt=false
Run this script to fix the "Failed to send a request to the Edge Function" error
"""
import urllib.request
import urllib.error
import json
import base64
import zipfile
import io

TOKEN = "sbp_cafc2fff3362a44b99b635ece6decb7b5a9c26e9"
PROJECT_REF = "gsfzugfoiyodxszuunpw"

FUNCTION_CODE = r'''import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, optionsResponse, jsonResponse, errorResponse } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return optionsResponse()

  try {
    const { email, password, name } = await req.json()
    if (!email || !password) return errorResponse('email and password required', 400)

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: name || '' },
    })
    if (createErr) {
      if (createErr.message?.includes('already been registered')) {
        return errorResponse('该邮箱已注册，请直接登录', 400)
      }
      return errorResponse(createErr.message, 400)
    }

    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    )
    const { data: session, error: signInErr } = await anonClient.auth.signInWithPassword({ email, password })
    if (signInErr) return errorResponse(signInErr.message, 400)

    return jsonResponse({ user: session.user, session: session.session })
  } catch (e: any) {
    return errorResponse(e.message || 'Internal error', 500)
  }
})
'''

CORS_CODE = r'''export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

export function optionsResponse() {
  return new Response(null, { status: 204, headers: corsHeaders })
}

export function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

export function errorResponse(message: string, status = 400) {
  return jsonResponse({ error: message }, status)
}
'''

def make_request(url, method, data=None, headers=None):
    all_headers = {"Authorization": f"Bearer {TOKEN}"}
    if headers:
        all_headers.update(headers)
    req = urllib.request.Request(url, data=data, headers=all_headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.status, resp.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()

print("Deploying admin-signup Edge Function...")
print("=" * 50)

# Step 1: Check if function exists
status, body = make_request(
    f"https://api.supabase.com/v1/projects/{PROJECT_REF}/functions/admin-signup",
    "GET"
)
exists = status == 200
print(f"Function exists: {exists} (status {status})")

# Step 2: Create or update the function metadata
func_data = json.dumps({
    "name": "admin-signup",
    "verify_jwt": False,
    "import_map": False,
}).encode()

if exists:
    # Update
    status, body = make_request(
        f"https://api.supabase.com/v1/projects/{PROJECT_REF}/functions/admin-signup",
        "PATCH",
        data=func_data,
        headers={"Content-Type": "application/json"}
    )
    print(f"Update metadata: {status}")
else:
    # Create
    status, body = make_request(
        f"https://api.supabase.com/v1/projects/{PROJECT_REF}/functions",
        "POST",
        data=func_data,
        headers={"Content-Type": "application/json"}
    )
    print(f"Create function: {status}")

if status not in (200, 201):
    print(f"Response: {body[:500]}")
    print("\nAPI blocked. Please set verify_jwt=false manually in Supabase Dashboard:")
    print("  Functions → admin-signup → Settings → uncheck 'Enforce JWT Verification'")
    input("\nPress Enter to close...")
    exit(1)

print(f"✓ Function configured with verify_jwt=false")

# Step 3: Deploy the code via multipart
# Build zip with both files
zip_buf = io.BytesIO()
with zipfile.ZipFile(zip_buf, 'w') as z:
    z.writestr('index.ts', FUNCTION_CODE)
    z.writestr('../_shared/cors.ts', CORS_CODE)
zip_buf.seek(0)
zip_data = zip_buf.read()

status, body = make_request(
    f"https://api.supabase.com/v1/projects/{PROJECT_REF}/functions/admin-signup",
    "POST",
    data=zip_data,
    headers={"Content-Type": "application/octet-stream"}
)
print(f"Deploy code: {status}")
if status not in (200, 201):
    print(f"Response: {body[:300]}")

print("\n✓ Done! Try registering on https://ip-engine.netlify.app now.")
input("Press Enter to close...")
