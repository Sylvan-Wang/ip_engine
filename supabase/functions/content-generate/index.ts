// Edge Function: content-generate
// 一键成稿：根据选题 + IP 画像 + 素材库 → 生成小红书草稿
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { optionsResponse, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { callAI, parseJSON } from '../_shared/ai.ts'

const SYSTEM = `你是一个专注小红书内容创作的写手，擅长把专业知识写成让人想收藏的内容。

生成规则：
1. 内容基于用户IP定位，体现他的真实经历和观点，拒绝泛泛而谈
2. 开头前3行决定是否被看完——用场景/问题/数字开头，绝不用"大家好"
3. 正文用短段落（每段2-4行），有节奏感，不堆砌信息
4. 结尾引导互动，自然不刻意
5. 如果提供了素材，优先引用真实案例，不要编造数据
6. 禁止使用："当然"、"首先"、"总结一下"、"毋庸置疑"等 AI 腔词汇

返回 JSON 对象：
{
  "title_variants": ["标题版本1（带情绪/数字）", "标题版本2（不同角度）", "标题版本3（问句式）"],
  "body": "正文全文，用\\n分段",
  "cover_copy": "封面文案（10字内，抓眼球）",
  "hashtags": ["标签1", "标签2", "标签3", "标签4", "标签5"],
  "comment_hook": "评论引导语（引发互动的一句话）"
}

只返回 JSON，不要其他文字。`

function mockContent(title: string) {
  return {
    title_variants: [title, `${title}（亲测有效）`, `做到这一点，你也可以${title.slice(-6)}`],
    body: `说真的，一年前的我完全不知道这些。\n\n那时候我也是每天瞎忙，结果全靠运气。\n\n直到我搞明白了一件事...\n\n【关键发现】\n不是努力不够，是方向没对。\n\n具体怎么做？\n\n第一步：先搞清楚你在帮谁解决什么问题\n第二步：用他们听得懂的语言说\n第三步：持续输出，让算法记住你\n\n听起来简单，但真正做到的人不多。\n\n你现在卡在哪一步？`,
    cover_copy: title.slice(0, 12),
    hashtags: ['小红书运营', '内容创作', 'IP打造', '副业', '知识变现'],
    comment_hook: '你现在做内容最大的卡点是什么？评论区说说，我看看能不能帮你~',
  }
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

  const { recommendation_id, platform = 'xiaohongshu' } = await req.json()

  // 获取选题
  const { data: topic } = await supabase
    .from('topic_recommendations')
    .select('*, content_columns(*)')
    .eq('id', recommendation_id)
    .eq('user_id', user.id)
    .single()

  if (!topic) return errorResponse('Topic not found')

  // 获取活跃画像
  const { data: profile } = await supabase
    .from('ip_profiles')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!profile) return errorResponse('No active profile')

  // 获取最近10条素材
  const { data: materials } = await supabase
    .from('materials')
    .select('type, title, content')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  // 构建 prompt 上下文
  const context = {
    profile: {
      domain: profile.domain,
      identity: profile.identity,
      solve_problem: profile.solve_problem,
      unique_opinion: profile.unique_opinion,
      tone_tags: profile.tone_tags,
      tagline: profile.tagline,
      style_memory: profile.style_memory,
    },
    topic: {
      title: topic.customized_title,
      content_type: topic.content_type,
      audience_tier: topic.audience_tier,
      column: topic.content_columns?.name,
    },
    materials: materials?.slice(0, 5) ?? [],
    platform,
  }

  const raw = await callAI(SYSTEM, JSON.stringify(context), { temperature: 0.85 })
  const generated = raw === '__MOCK__'
    ? mockContent(topic.customized_title)
    : parseJSON(raw, mockContent(topic.customized_title))

  // 插入内容草稿
  const { data: content, error } = await supabase
    .from('contents')
    .insert({
      user_id: user.id,
      profile_id: profile.id,
      recommendation_id,
      title: (generated as { title_variants: string[] }).title_variants[0],
      body: (generated as { body: string }).body,
      title_variants: (generated as { title_variants: string[] }).title_variants,
      cover_copy: (generated as { cover_copy: string }).cover_copy,
      hashtags: (generated as { hashtags: string[] }).hashtags,
      comment_hook: (generated as { comment_hook: string }).comment_hook,
      platform,
      status: 'draft',
    })
    .select()
    .single()

  if (error) return errorResponse(error.message)

  // 标记选题为已采用
  await supabase
    .from('topic_recommendations')
    .update({ status: 'adopted' })
    .eq('id', recommendation_id)

  return jsonResponse(content)
})
