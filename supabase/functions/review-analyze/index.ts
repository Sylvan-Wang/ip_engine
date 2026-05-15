// Edge Function: review-analyze
// 接收发布数据 → AI 复盘分析 → 存入 DB
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { optionsResponse, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { callAI, parseJSON } from '../_shared/ai.ts'

const SYSTEM = `你是一个小红书内容运营顾问，擅长从数据中找规律、给出下一步建议。

根据内容信息和发布数据，给出简洁有用的复盘分析。

返回 JSON 对象：
{
  "key_insight": "最核心的一条发现（40字内，直接说结论）",
  "performance_label": "超预期 / 正常 / 低于预期",
  "next_topic_hints": ["下一篇可以做的方向1（20字内）", "方向2", "方向3"],
  "conversion_readiness": "转化信号评估（40字内，说清楚现在适不适合加引导）"
}

只返回 JSON，不要其他文字。`

const MOCK_ANALYSIS = {
  key_insight: '收藏率高于点赞，说明内容有实用价值但情感共鸣不够强',
  performance_label: '正常',
  next_topic_hints: [
    '把这篇内容的某个步骤展开讲，做成系列',
    '用真实案例佐证核心观点，信任感更强',
    '回应评论中的高频问题，做一篇答疑',
  ],
  conversion_readiness: '收藏多说明用户有需求，可以在下一篇末尾加一句软性引导',
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

  const body = await req.json()
  const { content_id, views, likes, saves, comments, new_followers, led_to_inquiry, notes } = body

  // 获取内容摘要
  const { data: content } = await supabase
    .from('contents')
    .select('title, body, platform, hashtags')
    .eq('id', content_id)
    .eq('user_id', user.id)
    .single()

  if (!content) return errorResponse('Content not found')

  // 构建分析上下文
  const context = {
    content: {
      title: content.title,
      body_preview: (content.body as string)?.slice(0, 200),
      platform: content.platform,
      hashtags: content.hashtags,
    },
    metrics: { views, likes, saves, comments, new_followers, led_to_inquiry },
    notes,
    ratios: {
      like_rate: views && likes ? `${((likes / views) * 100).toFixed(1)}%` : null,
      save_rate: views && saves ? `${((saves / views) * 100).toFixed(1)}%` : null,
      comment_rate: views && comments ? `${((comments / views) * 100).toFixed(1)}%` : null,
    },
  }

  const raw = await callAI(SYSTEM, JSON.stringify(context))
  const analysis = raw === '__MOCK__' ? MOCK_ANALYSIS : parseJSON(raw, MOCK_ANALYSIS)

  // 插入复盘记录
  const { data: review, error } = await supabase
    .from('content_reviews')
    .insert({
      user_id: user.id,
      content_id,
      views: views ?? null,
      likes: likes ?? null,
      saves: saves ?? null,
      comments: comments ?? null,
      new_followers: new_followers ?? null,
      led_to_inquiry: led_to_inquiry ?? false,
      notes: notes ?? null,
      ai_analysis: analysis,
    })
    .select()
    .single()

  if (error) return errorResponse(error.message)

  return jsonResponse(review)
})
