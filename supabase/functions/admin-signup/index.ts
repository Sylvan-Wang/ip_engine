// Edge Function: admin-signup
// Creates user with email pre-confirmed (bypasses email rate limit entirely)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, optionsResponse, jsonResponse, errorResponse } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return optionsResponse()

  try {
    const { email, password, name } = await req.json()
    if (!email || !password) return errorResponse('email and password required', 400)

    // Admin client uses service role key — never exposed to browser
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Create user with email already confirmed — no email sent
    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: name || '' },
    })
    if (createErr) {
      // If user already exists, just let them sign in normally
      if (createErr.message?.includes('already been registered')) {
        return errorResponse('该邮箱已注册，请直接登录', 400)
      }
      return errorResponse(createErr.message, 400)
    }

    // Sign in immediately to return a valid session
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
