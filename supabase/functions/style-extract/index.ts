// Edge Function: style-extract
// 从历史内容中提取写作风格记忆，合并到 IP 画像
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { optionsResponse, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { callAI, parseJSON } from '../_shared/ai.ts'

const SYSTEM = `你是一个内容风格分析师。分析提供的多篇小红书内容样本，提取作者的写作风格特征。

返回 JSON 对象：
{
  "sentence_length": "短句为主 / 长短结合 / 长句为主",
  "opening_pattern": "描述开头习惯（如：故事开头/问题开头/结论先行）",
  "structural_preference": "描述段落结构习惯",
  "vocabulary_level": "口语化 / 专业术语 / 两者结合",
  "emotional_tone": "描述情绪风格（如：温暖鼓励/犀利直接/幽默轻松）",
  "unique_phrases": ["作者常用的特色短语或表达，最多5个"],
  "avoid_patterns": ["作者从不用的表达风格，最多3个"]
}

只返回 JSON，不要其他文字。`

const MOCK_STYLE = {
  sentence_length: '短句为主',
  opening_pattern: '故事或场景开头，制造代入感',
  structural_preference: '问题→分析→解决方案，每段不超过3行',
  vocabulary_level: '口语化',
  emotional_tone: '温暖实用，有陪伴感',
  unique_phrases: ['亲测有效', '说真的', '不骗你'],
  avoid_patterns: ['长篇大论', '官方腔调'],
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

  const { contents } = await req.json() as { contents: string[] }
  if (!contents || contents.length === 0) return errorResponse('No contents provided')

  // 提取风格
  const raw = await callAI(SYSTEM, contents.map((c, i) => `=== 样本${i + 1} ===\n${c}`).join('\n\n'))
  const newStyle = raw === '__MOCK__' ? MOCK_STYLE : parseJSON(raw, MOCK_STYLE)

  // 获取现有画像
  const { data: profile } = await supabase
    .from('ip_profiles')
    .select('id, style_memory')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!profile) return errorResponse('No active profile found')

  // 加权合并：0.7 历史 + 0.3 新样本
  let merged = newStyle
  if (profile.style_memory) {
    const existing = profile.style_memory as Record<string, unknown>
    merged = {
      ...newStyle,
      unique_phrases: [
        ...((existing.unique_phrases as string[]) ?? []).slice(0, 3),
        ...((newStyle.unique_phrases as string[]) ?? []).slice(0, 2),
      ].filter((v, i, a) => a.indexOf(v) === i),
    }
  }

  await supabase
    .from('ip_profiles')
    .update({ style_memory: merged })
    .eq('id', profile.id)

  return jsonResponse({ style_memory: merged })
})
