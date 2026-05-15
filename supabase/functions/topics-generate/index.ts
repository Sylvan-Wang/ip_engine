// Edge Function: topics-generate
// 根据 IP 画像生成本周个性化选题推荐（5-8条）
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { optionsResponse, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { callAI, parseJSON } from '../_shared/ai.ts'

const SYSTEM = `你是一个专注小红书IP经营的内容策略师。根据用户的IP定位，生成本周 6 个选题推荐。

选题要求：
1. 基于IP定位，不是热搜榜——个性化而非通用
2. 覆盖三种类型：认知内容(awareness)×2、信任内容(trust)×2、转化内容(conversion)×2
3. 覆盖三层受众：核心受众(core)×3、扩展受众(expanded)×2、泛兴趣受众(broad)×1
4. 标题要具体、有吸引力，带场景感或数字

返回 JSON 数组，每项格式：
{
  "customized_title": "具体的选题标题",
  "reason": "推荐理由（40字内，说清楚为什么这个选题适合他）",
  "audience_tier": "core 或 expanded 或 broad",
  "content_type": "awareness 或 trust 或 conversion",
  "column_name": "对应的内容栏目名称（必须是已有栏目之一）"
}

只返回 JSON，不要其他文字。`

function mockTopics(profileDomain: string): object[] {
  return [
    { customized_title: `我用3个月在${profileDomain}领域从0积累了第一批铁粉，这是我的完整路径`, reason: '真实经历类内容转化率最高，适合建立信任', audience_tier: 'core', content_type: 'trust', column_name: '真实故事' },
    { customized_title: `${profileDomain}新手最容易踩的5个坑（第3个我也踩过）`, reason: '痛点内容扩散快，核心受众强共鸣', audience_tier: 'core', content_type: 'awareness', column_name: '实战干货' },
    { customized_title: `想在${profileDomain}赚到第一笔钱？先搞清楚这件事`, reason: '转化意图明确，适合漏斗底部用户', audience_tier: 'core', content_type: 'conversion', column_name: '答疑解惑' },
    { customized_title: `普通人做${profileDomain}副业，月入5000真的可行吗？`, reason: '扩展受众对副业高度感兴趣，可带来新粉', audience_tier: 'expanded', content_type: 'awareness', column_name: '实战干货' },
    { customized_title: `我和一个学员聊了2小时，发现她卡住的原因根本不是技术问题`, reason: '故事类内容扩展受众有强烈代入感', audience_tier: 'expanded', content_type: 'trust', column_name: '真实故事' },
    { customized_title: `你有没有想过，为什么努力了半年还没有结果？`, reason: '泛情感共鸣，破圈传播，带来新流量', audience_tier: 'broad', content_type: 'awareness', column_name: '实战干货' },
  ]
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse()

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return errorResponse('Unauthorized', 401)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return errorResponse('Unauthorized', 401)

  // 获取活跃画像
  const { data: profile } = await supabase
    .from('ip_profiles')
    .select('*, content_columns(*)')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!profile) return errorResponse('No active IP profile found')

  // 本周 Monday
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  const weekOf = new Date(now.setDate(diff)).toISOString().split('T')[0]

  // 删除本周旧选题（refresh 场景）
  const { force } = await req.json().catch(() => ({ force: false }))
  if (force) {
    await supabase
      .from('topic_recommendations')
      .delete()
      .eq('user_id', user.id)
      .eq('week_of', weekOf)
      .eq('status', 'pending')
  }

  // 已有选题则直接返回
  const { data: existing } = await supabase
    .from('topic_recommendations')
    .select('*, content_columns(*)')
    .eq('user_id', user.id)
    .eq('week_of', weekOf)
    .neq('status', 'skipped')

  if (existing && existing.length > 0 && !force) {
    return jsonResponse(existing)
  }

  // AI 生成
  const columns = (profile.content_columns ?? []) as Array<{ name: string; content_type: string }>
  const profileContext = {
    domain: profile.domain,
    identity: profile.identity,
    solve_problem: profile.solve_problem,
    unique_opinion: profile.unique_opinion,
    core_audience: profile.core_audience,
    tone_tags: profile.tone_tags,
    columns: columns.map((c) => c.name),
  }

  const raw = await callAI(SYSTEM, JSON.stringify(profileContext))
  const topicData = raw === '__MOCK__'
    ? mockTopics(profile.domain)
    : parseJSON<object[]>(raw, mockTopics(profile.domain))

  // 匹配 column_id
  const colMap = Object.fromEntries(columns.map((c: { id?: string; name: string }) => [c.name, c.id]))

  const toInsert = topicData.map((t: Record<string, unknown>) => ({
    user_id: user.id,
    profile_id: profile.id,
    column_id: colMap[(t.column_name as string)] ?? null,
    customized_title: t.customized_title,
    reason: t.reason,
    audience_tier: t.audience_tier,
    content_type: t.content_type,
    status: 'pending',
    week_of: weekOf,
  }))

  const { data: inserted } = await supabase
    .from('topic_recommendations')
    .insert(toInsert)
    .select('*, content_columns(*)')

  return jsonResponse(inserted ?? [])
})
