import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Save, Send, Copy, ChevronLeft, BarChart2, Hash } from 'lucide-react'
import { contentsApi } from '../api'

export default function ContentEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: content, isLoading } = useQuery({
    queryKey: ['content', id],
    queryFn: () => contentsApi.get(id!),
    enabled: !!id,
  })

  const [body, setBody] = useState('')
  const [selectedTitle, setSelectedTitle] = useState(0)
  const [showReview, setShowReview] = useState(false)
  const [reviewForm, setReviewForm] = useState({ views: '', likes: '', saves: '', comments: '', new_followers: '', led_to_inquiry: false, notes: '' })
  const [reviewResult, setReviewResult] = useState<any>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (content) {
      setBody(content.body)
      setSelectedTitle(0)
    }
  }, [content])

  const saveMutation = useMutation({
    mutationFn: () => contentsApi.update(id!, { body, title: content?.title_variants?.[selectedTitle] }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['content', id] }),
  })

  const publishMutation = useMutation({
    mutationFn: () => contentsApi.publish(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['content', id] })
      qc.invalidateQueries({ queryKey: ['contents'] })
    },
  })

  const reviewMutation = useMutation({
    mutationFn: () => contentsApi.createReview({
      content_id: id,
      views: reviewForm.views ? parseInt(reviewForm.views) : undefined,
      likes: reviewForm.likes ? parseInt(reviewForm.likes) : undefined,
      saves: reviewForm.saves ? parseInt(reviewForm.saves) : undefined,
      comments: reviewForm.comments ? parseInt(reviewForm.comments) : undefined,
      new_followers: reviewForm.new_followers ? parseInt(reviewForm.new_followers) : undefined,
      led_to_inquiry: reviewForm.led_to_inquiry,
      notes: reviewForm.notes || undefined,
    }),
    onSuccess: (data) => setReviewResult(data),
  })

  const handleCopy = () => {
    const title = content?.title_variants?.[selectedTitle] || ''
    const text = `${title}\n\n${body}\n\n${content?.hashtags?.map((h: string) => `#${h}`).join(' ') || ''}`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (isLoading) return <div className="p-8 text-gray-500">加载中...</div>
  if (!content) return <div className="p-8 text-gray-500">内容不存在</div>

  return (
    <div className="h-full flex flex-col">
      {/* Topbar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
        <button onClick={() => navigate('/contents')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ChevronLeft className="w-4 h-4" /> 返回内容列表
        </button>
        <div className="flex gap-2">
          <button onClick={handleCopy} className="btn-secondary flex items-center gap-1.5 text-sm">
            <Copy className="w-3.5 h-3.5" />{copied ? '已复制！' : '复制全文'}
          </button>
          <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="btn-secondary flex items-center gap-1.5 text-sm">
            <Save className="w-3.5 h-3.5" />{saveMutation.isPending ? '保存中...' : '保存草稿'}
          </button>
          {content.status !== 'published' && (
            <button onClick={() => publishMutation.mutate()} disabled={publishMutation.isPending} className="btn-primary flex items-center gap-1.5 text-sm">
              <Send className="w-3.5 h-3.5" />{publishMutation.isPending ? '...' : '标记已发布'}
            </button>
          )}
          {content.status === 'published' && !reviewResult && (
            <button onClick={() => setShowReview(!showReview)} className="btn-secondary flex items-center gap-1.5 text-sm">
              <BarChart2 className="w-3.5 h-3.5" />录入复盘数据
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main editor */}
        <div className="flex-1 p-6 overflow-auto">
          {/* Title variants */}
          {content.title_variants && content.title_variants.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2 font-medium">选择标题（共 {content.title_variants.length} 个版本）</p>
              <div className="space-y-2">
                {content.title_variants.map((title: string, i: number) => (
                  <label key={i} className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors ${selectedTitle === i ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input type="radio" checked={selectedTitle === i} onChange={() => setSelectedTitle(i)} className="mt-0.5" />
                    <span className="text-sm font-medium text-gray-900">{title}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Body */}
          <div>
            <p className="text-xs text-gray-500 mb-2 font-medium">正文内容</p>
            <textarea
              className="input-base resize-none leading-relaxed min-h-96"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={20}
            />
          </div>
        </div>

        {/* Side panel */}
        <div className="w-72 border-l border-gray-100 bg-white p-5 overflow-auto space-y-5">
          {/* Status */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1.5">发布状态</p>
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${content.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
              {content.status === 'published' ? '已发布' : '草稿'}
            </span>
          </div>

          {/* Cover copy */}
          {content.cover_copy && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1.5">封面文案</p>
              <p className="text-sm bg-gray-50 rounded-lg p-2.5 text-gray-800">{content.cover_copy}</p>
            </div>
          )}

          {/* Hashtags */}
          {content.hashtags && content.hashtags.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1.5">
                <Hash className="w-3 h-3 inline mr-0.5" />标签
              </p>
              <div className="flex flex-wrap gap-1.5">
                {content.hashtags.map((tag: string, i: number) => (
                  <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">#{tag}</span>
                ))}
              </div>
            </div>
          )}

          {/* Comment hook */}
          {content.comment_hook && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1.5">评论引导</p>
              <p className="text-sm bg-gray-50 rounded-lg p-2.5 text-gray-800 italic">{content.comment_hook}</p>
            </div>
          )}

          {/* Review form */}
          {showReview && !reviewResult && (
            <div className="border-t pt-4 space-y-3">
              <p className="text-xs font-medium text-gray-700">录入发布数据</p>
              {[
                ['views', '浏览量'], ['likes', '点赞'], ['saves', '收藏'],
                ['comments', '评论'], ['new_followers', '新增粉丝'],
              ].map(([key, label]) => (
                <div key={key}>
                  <label className="text-xs text-gray-500">{label}</label>
                  <input
                    type="number" className="input-base mt-0.5" placeholder="0"
                    value={(reviewForm as any)[key]}
                    onChange={(e) => setReviewForm((f) => ({ ...f, [key]: e.target.value }))}
                  />
                </div>
              ))}
              <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                <input type="checkbox" checked={reviewForm.led_to_inquiry} onChange={(e) => setReviewForm((f) => ({ ...f, led_to_inquiry: e.target.checked }))} />
                这条内容带来了咨询/私信
              </label>
              <textarea className="input-base resize-none" rows={2} placeholder="备注（可选）" value={reviewForm.notes} onChange={(e) => setReviewForm((f) => ({ ...f, notes: e.target.value }))} />
              <button onClick={() => reviewMutation.mutate()} disabled={reviewMutation.isPending} className="btn-primary w-full text-sm">
                {reviewMutation.isPending ? 'AI分析中...' : '提交复盘'}
              </button>
            </div>
          )}

          {/* Review result */}
          {reviewResult?.ai_analysis && (
            <div className="border-t pt-4 space-y-3">
              <p className="text-xs font-medium text-gray-700 flex items-center gap-1"><BarChart2 className="w-3 h-3" />AI复盘分析</p>
              <div className="bg-blue-50 rounded-lg p-3 space-y-2">
                <p className="text-xs font-semibold text-blue-900">{reviewResult.ai_analysis.key_insight}</p>
                {reviewResult.ai_analysis.next_topic_hints?.map((hint: string, i: number) => (
                  <p key={i} className="text-xs text-blue-700">· {hint}</p>
                ))}
                <p className="text-xs text-blue-600 italic">{reviewResult.ai_analysis.conversion_readiness}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
