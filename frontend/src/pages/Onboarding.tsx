import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, ChevronLeft, CheckCircle2, Sparkles } from 'lucide-react'
import { profileApi } from '../api'

const TONE_OPTIONS = ['知识干货', '轻松对话', '故事叙述', '专业严肃', '幽默风趣', '励志感召']

const STEPS = [
  { title: '你在做什么领域？', subtitle: '一两句话描述你的专业方向和身份' },
  { title: '你想帮助谁？', subtitle: '描述你的目标受众，越具体越好' },
  { title: '你能解决什么、你的观点是什么？', subtitle: '说说你能帮受众解决的问题和你的独特看法' },
  { title: '你的内容风格是什么？', subtitle: '选择你想要的表达方式（可多选）' },
  { title: '你希望怎么被记住？', subtitle: '一句话定位——别人提到你时想到什么（可选）' },
]

interface FormData {
  domain: string
  identity: string
  core_audience: { description: string; age?: string; occupation?: string }
  solve_problem: string
  unique_opinion: string
  tone_tags: string[]
  tagline: string
  monetization_goal: string
  historical_contents: string
}

export default function Onboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [summaryCard, setSummaryCard] = useState('')
  const [form, setForm] = useState<FormData>({
    domain: '', identity: '', core_audience: { description: '' },
    solve_problem: '', unique_opinion: '', tone_tags: [],
    tagline: '', monetization_goal: '', historical_contents: '',
  })

  const update = (key: keyof FormData, val: any) => setForm((f) => ({ ...f, [key]: val }))

  const canNext = () => {
    if (step === 0) return form.domain.trim().length > 0
    if (step === 1) return form.core_audience.description.trim().length > 0
    if (step === 2) return form.solve_problem.trim().length > 0
    if (step === 3) return form.tone_tags.length > 0
    return true
  }

  const handleNext = async () => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1)
      return
    }
    // 最后一步，提交
    setLoading(true)
    try {
      const payload = {
        domain: form.domain,
        identity: form.identity,
        core_audience: form.core_audience,
        solve_problem: form.solve_problem,
        unique_opinion: form.unique_opinion,
        tone_tags: form.tone_tags,
        tagline: form.tagline || undefined,
        monetization_goal: form.monetization_goal || undefined,
      }
      const profile = await profileApi.create(payload)
      setSummaryCard(profile.summary_card || '')

      // 如果有历史内容，提取风格
      if (form.historical_contents.trim()) {
        const contents = form.historical_contents.split('\n---\n').filter(Boolean)
        if (contents.length > 0) {
          await profileApi.extractStyle(contents)
        }
      }

      // 自动生成栏目
      await profileApi.generateColumns()

      setDone(true)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-6">
        <div className="max-w-lg w-full text-center space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">你的IP画像建立好了！</h2>
            <p className="text-gray-500 mt-2">以下是系统对你的IP方向的理解：</p>
          </div>
          {summaryCard && (
            <div className="card p-6 text-left space-y-3">
              {summaryCard.split('\n').map((line, i) => (
                <p key={i} className={line.startsWith('【') ? 'font-semibold text-blue-900' : 'text-gray-700 text-sm leading-relaxed'}>
                  {line}
                </p>
              ))}
            </div>
          )}
          <div className="space-y-3">
            <button onClick={() => navigate('/topics')} className="btn-primary w-full flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4" />
              查看本周为你推荐的选题
            </button>
            <button onClick={() => navigate('/dashboard')} className="btn-secondary w-full">
              先去看看概览
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex items-center gap-1.5 mb-8">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? 'bg-blue-600' : 'bg-gray-200'}`}
            />
          ))}
        </div>

        <div className="card p-8">
          <p className="text-xs text-blue-600 font-medium mb-2">第 {step + 1} 步，共 {STEPS.length} 步</p>
          <h2 className="text-xl font-bold text-gray-900 mb-1">{STEPS[step].title}</h2>
          <p className="text-sm text-gray-500 mb-6">{STEPS[step].subtitle}</p>

          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  你在做什么领域？ <span className="text-red-500">*</span>
                </label>
                <textarea
                  className="input-base resize-none" rows={2}
                  placeholder="例如：AI工具在职场中的实际应用；亲子教育与家庭关系；个人财务规划..."
                  value={form.domain} onChange={(e) => update('domain', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">你的身份标签（可选）</label>
                <input
                  type="text" className="input-base"
                  placeholder="例如：在大厂做了5年的产品经理；全职妈妈；独立设计师..."
                  value={form.identity} onChange={(e) => update('identity', e.target.value)}
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  你主要想影响哪类人？ <span className="text-red-500">*</span>
                </label>
                <textarea
                  className="input-base resize-none" rows={2}
                  placeholder="例如：刚开始接触AI的25-35岁职场人；想做副业但不知道从哪里开始的上班族..."
                  value={form.core_audience.description}
                  onChange={(e) => update('core_audience', { ...form.core_audience, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">年龄范围（可选）</label>
                  <input type="text" className="input-base" placeholder="例如：25-35岁" value={form.core_audience.age || ''} onChange={(e) => update('core_audience', { ...form.core_audience, age: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">职业背景（可选）</label>
                  <input type="text" className="input-base" placeholder="例如：互联网从业者" value={form.core_audience.occupation || ''} onChange={(e) => update('core_audience', { ...form.core_audience, occupation: e.target.value })} />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  你能帮受众解决什么具体问题？ <span className="text-red-500">*</span>
                </label>
                <textarea
                  className="input-base resize-none" rows={2}
                  placeholder="例如：不知道AI工具怎么用进日常工作流；不知道副业从哪个方向切入..."
                  value={form.solve_problem} onChange={(e) => update('solve_problem', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">你有什么独特观点？（可选）</label>
                <textarea
                  className="input-base resize-none" rows={2}
                  placeholder="例如：工具不是重点，流程才是；副业失败90%是因为太早谈钱..."
                  value={form.unique_opinion} onChange={(e) => update('unique_opinion', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">变现目标（可选）</label>
                <input type="text" className="input-base" placeholder="例如：咨询/课程/私域/带货..." value={form.monetization_goal} onChange={(e) => update('monetization_goal', e.target.value)} />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {TONE_OPTIONS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      const tags = form.tone_tags.includes(t)
                        ? form.tone_tags.filter((x) => x !== t)
                        : [...form.tone_tags, t]
                      update('tone_tags', tags)
                    }}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      form.tone_tags.includes(t)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  粘贴你发过的内容（可选，用于学习你的风格）
                </label>
                <p className="text-xs text-gray-400 mb-2">多条内容用 --- 隔开，最多5条。粘贴后系统会提取你的写作风格。</p>
                <textarea
                  className="input-base resize-none" rows={4}
                  placeholder={'内容1...\n---\n内容2...'}
                  value={form.historical_contents} onChange={(e) => update('historical_contents', e.target.value)}
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">你的一句话定位（可选）</label>
                <input
                  type="text" className="input-base"
                  placeholder="例如：用AI把复杂工作变成可复用系统；帮职场新人少走5年弯路..."
                  value={form.tagline} onChange={(e) => update('tagline', e.target.value)}
                />
                <p className="text-xs text-gray-400 mt-1">不填也没关系，系统会根据你的信息帮你生成一个</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
                <p className="font-medium mb-1">点击「完成」后，系统会：</p>
                <ul className="space-y-1 text-xs text-blue-700">
                  <li>· 生成你的IP定位卡</li>
                  <li>· 自动创建3-5个内容栏目</li>
                  <li>· 为你生成本周个性化选题推荐</li>
                </ul>
              </div>
            </div>
          )}

          <div className="flex gap-3 mt-8">
            {step > 0 && (
              <button onClick={() => setStep((s) => s - 1)} className="btn-secondary flex items-center gap-1">
                <ChevronLeft className="w-4 h-4" /> 上一步
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={!canNext() || loading}
              className="btn-primary flex-1 flex items-center justify-center gap-1"
            >
              {loading ? (
                <span>AI 正在生成你的画像...</span>
              ) : step < STEPS.length - 1 ? (
                <><span>下一步</span><ChevronRight className="w-4 h-4" /></>
              ) : (
                <><Sparkles className="w-4 h-4" /><span>完成，生成我的IP画像</span></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
