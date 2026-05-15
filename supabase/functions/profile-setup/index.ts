// Edge Function: profile-setup
// 接收 IP 画像原始数据 → AI 生成 summary_card + 内容栏目 → 存入 DB
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, optionsResponse, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { callAI, parseJSON } from '../_shared/ai.ts'

const SUMMARY_SYSTEM = `你是一个专注小红书IP经营的定位顾问。根据用户填写的信息，生成一张简洁有力的「IP定位卡」。
格式严格如下（每行一条，不加序号）：
【IP定位】一句话描述他是谁、做什么领域
【目标受众】核心受众画像
【核心价值】他能帮受众解决什么问题
【内容风格】风格标签用·分隔
【变现方向】变现路径

要求：每行不超过40字，口语化，有记忆点，禁止套话。`

const COLUMNS_SYSTEM = `你是小红书内容策略专家。根据IP定位信息，生成3-4个内容栏目（系列）。
每个栏目专注一个内容方向，覆盖认知→信任→转化漏斗。

返回 JSON 数组，每项格式：
{
  "name": "栏目名（4-8字）",
  "description": "这个栏目发什么内容（20字内）",
  "goal": "目的：建立专业度/情感连接/促进转化",
  "frequency": "建议发布频率",
  "content_type": "awareness 或 trust 或 conversion"
}

只返回 JSON，不要其他文字。`

// Mock 数据
function mockSummary(d: Record<string, unknown>): string {
  const audience = (d.core_audience as Record<string, string>)?.description ?? '目标受众'
  const tones = (d.tone_tags as string[])?.join('·') ?? '知识干货'
  return `【IP定位】${d.domain ?? '领域专家'}${d.identity ? '，' + d.identity : ''}\n【目标受众】${audience}\n【核心价值】${d.solve_problem ?? '解决核心问题'}\n【内容风格】${tones}\n【变现方向】${d.monetization_goal ?? '咨询/课程'}`
}

const MOCK_COLUMNS = [
  { name: '实战干货', description: '可落地的方法、工具、步骤', goal: '建立专业可信度', frequency: '每周2篇', content_type: 'awareness' },
  { name: '真实故事', description: '亲身经历的案例与感悟', goal: '建立情感连接', frequency: '每周1篇', content_type: 'trust' },
  { name: '答疑解惑', description: '回答受众最常见的困惑', goal: '促进咨询转化', frequency: '每周1篇', content_type: 'conversion' },
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse()

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return errorResponse('Unauthorized', 401)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return errorResponse('Unauthorized', 401)

  const body = await req.json()

  // 1. 生成 summary_card
  const summaryRaw = await callAI(SUMMARY_SYSTEM, JSON.stringify(body))
  const summaryCard = summaryRaw === '__MOCK__' ? mockSummary(body) : summaryRaw

  // 2. 停用旧画像
  await supabase.from('ip_profiles').update({ is_active: false }).eq('user_id', user.id)

  // 3. 插入新画像
  const { data: profile, error: profileErr } = await supabase
    .from('ip_profiles')
    .insert({
      user_id: user.id,
      domain: body.domain,
      identity: body.identity ?? null,
      tagline: body.tagline ?? null,
      solve_problem: body.solve_problem,
      unique_opinion: body.unique_opinion ?? null,
      core_audience: body.core_audience ?? {},
      tone_tags: body.tone_tags ?? [],
      monetization_goal: body.monetization_goal ?? null,
      summary_card: summaryCard,
    })
    .select()
    .single()

  if (profileErr) return errorResponse(profileErr.message)

  // 4. 生成内容栏目
  const colRaw = await callAI(COLUMNS_SYSTEM, JSON.stringify(body))
  const colData = colRaw === '__MOCK__'
    ? MOCK_COLUMNS
    : parseJSON<typeof MOCK_COLUMNS>(colRaw, MOCK_COLUMNS)

  const { data: columns } = await supabase
    .from('content_columns')
    .insert(colData.map((c) => ({ ...c, user_id: user.id, profile_id: profile.id })))
    .select()

  return jsonResponse({ profile, columns })
})
