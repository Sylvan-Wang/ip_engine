// All API calls via Supabase client (DB + Edge Functions)
import { supabase } from '../lib/supabase'

// ─────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────
export const authApi = {
  register: async ({ email, password, name }: { email: string; password: string; name: string }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    })
    if (error) throw error
    return data
  },

  login: async ({ email, password }: { email: string; password: string }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  },

  logout: async () => {
    await supabase.auth.signOut()
  },

  me: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  },
}

// ─────────────────────────────────────────────
// IP Profile
// ─────────────────────────────────────────────
export const profileApi = {
  get: async () => {
    const { data, error } = await supabase
      .from('ip_profiles')
      .select('*')
      .eq('is_active', true)
      .maybeSingle()
    if (error) throw error
    return data
  },

  // Calls Edge Function: profile-setup (AI generation + DB insert)
  create: async (profileData: object) => {
    const { data, error } = await supabase.functions.invoke('profile-setup', { body: profileData })
    if (error) throw error
    return data.profile
  },

  update: async (id: string, updates: object) => {
    const { data, error } = await supabase
      .from('ip_profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  getColumns: async () => {
    const { data: profile } = await supabase
      .from('ip_profiles')
      .select('id')
      .eq('is_active', true)
      .maybeSingle()
    if (!profile) return []
    const { data, error } = await supabase
      .from('content_columns')
      .select('*')
      .eq('profile_id', profile.id)
      .order('created_at')
    if (error) throw error
    return data
  },

  extractStyle: async (contents: string[]) => {
    const { data, error } = await supabase.functions.invoke('style-extract', { body: { contents } })
    if (error) throw error
    return data
  },

  // Kept for API compat — columns are generated as part of profile-setup
  generateColumns: async () => null,
}

// ─────────────────────────────────────────────
// Topics
// ─────────────────────────────────────────────
function currentWeekOf(): string {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(now.getFullYear(), now.getMonth(), diff).toISOString().split('T')[0]
}

export const topicsApi = {
  weekly: async () => {
    const weekOf = currentWeekOf()
    const { data: existing } = await supabase
      .from('topic_recommendations')
      .select('*, content_columns(*)')
      .eq('week_of', weekOf)
      .neq('status', 'skipped')
      .order('created_at')

    if (existing && existing.length > 0) return existing

    // Auto-generate if none exist this week
    const { data, error } = await supabase.functions.invoke('topics-generate', { body: {} })
    if (error) throw error
    return data ?? []
  },

  refresh: async () => {
    const { data, error } = await supabase.functions.invoke('topics-generate', { body: { force: true } })
    if (error) throw error
    return data ?? []
  },

  skip: async (id: string) => {
    const { error } = await supabase
      .from('topic_recommendations')
      .update({ status: 'skipped' })
      .eq('id', id)
    if (error) throw error
  },
}

// ─────────────────────────────────────────────
// Contents
// ─────────────────────────────────────────────
export const contentsApi = {
  list: async () => {
    const { data, error } = await supabase
      .from('contents')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  get: async (id: string) => {
    const { data, error } = await supabase
      .from('contents')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  generate: async (params: { recommendation_id: string; platform?: string }) => {
    const { data, error } = await supabase.functions.invoke('content-generate', { body: params })
    if (error) throw error
    return data
  },

  update: async (id: string, updates: object) => {
    const { data, error } = await supabase
      .from('contents')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  publish: async (id: string) => {
    const { data, error } = await supabase
      .from('contents')
      .update({ status: 'published', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  createReview: async (reviewData: object) => {
    const { data, error } = await supabase.functions.invoke('review-analyze', { body: reviewData })
    if (error) throw error
    return data
  },

  getReview: async (contentId: string) => {
    const { data } = await supabase
      .from('content_reviews')
      .select('*')
      .eq('content_id', contentId)
      .maybeSingle()
    return data
  },
}

// ─────────────────────────────────────────────
// Materials
// ─────────────────────────────────────────────
export const materialsApi = {
  list: async (type?: string) => {
    let q = supabase.from('materials').select('*').order('created_at', { ascending: false })
    if (type) q = q.eq('type', type)
    const { data, error } = await q
    if (error) throw error
    return data
  },

  create: async (data: object) => {
    const { data: inserted, error } = await supabase
      .from('materials').insert(data).select().single()
    if (error) throw error
    return inserted
  },

  update: async (id: string, data: object) => {
    const { data: updated, error } = await supabase
      .from('materials').update(data).eq('id', id).select().single()
    if (error) throw error
    return updated
  },

  delete: async (id: string) => {
    const { error } = await supabase.from('materials').delete().eq('id', id)
    if (error) throw error
  },
}
