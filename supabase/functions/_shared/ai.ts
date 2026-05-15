// Shared AI engine — DeepSeek primary, Qwen fallback, OpenAI fallback, mock last resort
// Compatible with any OpenAI-spec endpoint

const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions'
const QWEN_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'

// AI 腔检测 — 过滤高频废话
const CLICHES = [
  /^当然[，,，。\s]/gm,
  /^首先[，,，。\s]/gm,
  /^总结一下[，,，。\s]/gm,
  /值得注意的是[，,，]/g,
  /不得不说[，,，]/g,
  /毋庸置疑[，,，]?/g,
  /众所周知[，,，]?/g,
  /^总的来说[，,，。\s]/gm,
]

function clean(text: string): string {
  let t = text
  for (const p of CLICHES) t = t.replace(p, '')
  return t.trim()
}

async function tryFetch(url: string, apiKey: string, model: string, payload: object): Promise<string | null> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, model }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return clean(data.choices?.[0]?.message?.content ?? '')
  } catch {
    return null
  }
}

export async function callAI(
  system: string,
  user: string,
  opts: { temperature?: number; maxTokens?: number } = {},
): Promise<string> {
  if (Deno.env.get('AI_MOCK_MODE') === 'true') return '__MOCK__'

  const payload = {
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: opts.temperature ?? 0.75,
    max_tokens: opts.maxTokens ?? 2500,
  }

  const deepseekKey = Deno.env.get('DEEPSEEK_API_KEY')
  if (deepseekKey) {
    const result = await tryFetch(DEEPSEEK_URL, deepseekKey, 'deepseek-chat', payload)
    if (result) return result
  }

  const qwenKey = Deno.env.get('QWEN_API_KEY')
  if (qwenKey) {
    const result = await tryFetch(QWEN_URL, qwenKey, 'qwen-turbo', payload)
    if (result) return result
  }

  const openaiKey = Deno.env.get('OPENAI_API_KEY')
  if (openaiKey) {
    const result = await tryFetch(OPENAI_URL, openaiKey, 'gpt-4o-mini', payload)
    if (result) return result
  }

  return '__MOCK__'
}

/** 从 AI 返回中安全提取 JSON */
export function parseJSON<T>(raw: string, fallback: T): T {
  try {
    // strip markdown code fences if present
    const cleaned = raw.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()
    return JSON.parse(cleaned) as T
  } catch {
    return fallback
  }
}
