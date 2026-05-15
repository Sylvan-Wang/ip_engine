import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { RefreshCw, Sparkles, ChevronRight, Users, Zap, Heart, Target } from 'lucide-react'
import { topicsApi, contentsApi } from '../api'
import clsx from 'clsx'

const TIER_LABELS: Record<string, string> = { core: '核心受众', expanded: '扩展受众', broad: '泛兴趣' }
const TYPE_LABELS: Record<string, string> = { awareness: '认知内容', trust: '信任内容', conversion: '转化内容' }

export default function Topics() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [generating, setGenerating] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')

  const { data: topics, isLoading, refetch } = useQuery({
    queryKey: ['topics-weekly'],
    queryFn: topicsApi.weekly,
  })

  const refreshMutation = useMutation({
    mutationFn: topicsApi.refresh,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['topics-weekly'] }) },
  })

  const skipMutation = useMutation({
    mutationFn: topicsApi.skip,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['topics-weekly'] }),
  })

  const handleGenerate = async (topicId: string) => {
    setGenerating(topicId)
    try {
      const content = await contentsApi.generate({ recommendation_id: topicId })
      qc.invalidateQueries({ queryKey: ['contents'] })
      navigate(`/contents/${content.id}`)
    } catch (err) {
      console.error(err)
    } finally {
      setGenerating(null)
    }
  }

  const filtered = topics?.filter((t: any) => {
    if (filter === 'all') return t.status !== 'skipped'
    return t.status !== 'skipped' && t.content_type === filter
  }) ?? []

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-full">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 text-sm">AI 正在为你生成个性化选题...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">本周选题</h1>
          <p className="text-sm text-gray-500 mt-0.5">基于你的IP画像个性化推荐，不是热榜</p>
        </div>
        <button
          onClick={() => refreshMutation.mutate()}
          disabled={refreshMutation.isPending}
          className="btn-secondary flex items-center gap-1.5 text-sm"
        >
          <RefreshCw className={clsx('w-3.5 h-3.5', refreshMutation.isPending && 'animate-spin')} />
          刷新选题
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5">
        {[
          { key: 'all', label: '全部' },
          { key: 'awareness', label: '认知内容' },
          { key: 'trust', label: '信任内容' },
          { key: 'conversion', label: '转化内容' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={clsx(
              'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
              filter === key ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Topic cards */}
      <div className="space-y-4">
        {filtered.length === 0 && (
          <div className="card p-8 text-center text-gray-500">
            <p>暂无选题，点击「刷新选题」重新生成</p>
          </div>
        )}
        {filtered.map((topic: any) => (
          <TopicCard
            key={topic.id}
            topic={topic}
            isGenerating={generating === topic.id}
            onGenerate={() => handleGenerate(topic.id)}
            onSkip={() => skipMutation.mutate(topic.id)}
          />
        ))}
      </div>

      {/* Skipped */}
      {topics?.some((t: any) => t.status === 'skipped') && (
        <div className="mt-6 text-center">
          <button onClick={() => setFilter('all')} className="text-xs text-gray-400 hover:text-gray-600">
            显示已跳过的选题
          </button>
        </div>
      )}
    </div>
  )
}

function TopicCard({
  topic, isGenerating, onGenerate, onSkip,
}: {
  topic: any; isGenerating: boolean; onGenerate: () => void; onSkip: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const adopted = topic.status === 'adopted'

  return (
    <div className={clsx('card p-5 transition-all', adopted && 'opacity-60')}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 mb-2">
            <span className={`tag-${topic.audience_tier}`}>
              <Users className="w-2.5 h-2.5 inline mr-0.5" />
              {TIER_LABELS[topic.audience_tier] || topic.audience_tier}
            </span>
            <span className={`tag-${topic.content_type}`}>
              {TYPE_LABELS[topic.content_type] || topic.content_type}
            </span>
            {topic.column && (
              <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">
                {topic.column.name}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="font-semibold text-gray-900 leading-snug">{topic.customized_title}</h3>

          {/* Reason */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-blue-600 hover:underline mt-1.5 flex items-center gap-0.5"
          >
            {expanded ? '收起' : '为什么推荐这个？'}
            <ChevronRight className={clsx('w-3 h-3 transition-transform', expanded && 'rotate-90')} />
          </button>
          {expanded && (
            <p className="text-sm text-gray-600 bg-blue-50 rounded-lg p-3 mt-2 leading-relaxed">
              {topic.reason}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      {!adopted && (
        <div className="flex gap-2 mt-4">
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            className="btn-primary flex items-center gap-1.5 text-sm flex-1"
          >
            {isGenerating ? (
              <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />AI 生成中...</>
            ) : (
              <><Sparkles className="w-3.5 h-3.5" />一键成稿</>
            )}
          </button>
          <button onClick={onSkip} className="btn-secondary text-sm px-4">跳过</button>
        </div>
      )}
      {adopted && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-green-600">
          <Zap className="w-3.5 h-3.5" />已生成草稿
        </div>
      )}
    </div>
  )
}
