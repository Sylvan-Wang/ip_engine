import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { FileText, Send, Archive, Clock, CheckCircle2 } from 'lucide-react'
import { contentsApi } from '../api'
import clsx from 'clsx'

const STATUS_LABELS: Record<string, string> = {
  draft: '草稿',
  published: '已发布',
  archived: '已归档',
}

const STATUS_ICONS: Record<string, any> = {
  draft: Clock,
  published: CheckCircle2,
  archived: Archive,
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'text-amber-600 bg-amber-50',
  published: 'text-green-600 bg-green-50',
  archived: 'text-gray-500 bg-gray-100',
}

export default function Contents() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [filter, setFilter] = useState<string>('all')

  const { data: contents, isLoading } = useQuery({
    queryKey: ['contents'],
    queryFn: () => contentsApi.list(),
  })

  const publishMutation = useMutation({
    mutationFn: (id: string) => contentsApi.publish(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contents'] }),
  })

  const filtered = contents?.filter((c: any) => {
    if (filter === 'all') return c.status !== 'archived'
    return c.status === filter
  }) ?? []

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-full">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 text-sm">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">内容库</h1>
          <p className="text-sm text-gray-500 mt-0.5">管理你的所有内容草稿和已发布内容</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5">
        {[
          { key: 'all', label: '全部' },
          { key: 'draft', label: '草稿' },
          { key: 'published', label: '已发布' },
          { key: 'archived', label: '已归档' },
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
            {key !== 'all' && contents && (
              <span className="ml-1 opacity-70">
                ({contents.filter((c: any) => c.status === key).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content list */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="card p-12 text-center">
            <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">
              {filter === 'all' ? '还没有内容，去「本周选题」一键生成吧' : `没有${STATUS_LABELS[filter] ?? ''}内容`}
            </p>
            {filter === 'all' && (
              <button
                onClick={() => navigate('/topics')}
                className="btn-primary mt-4 text-sm"
              >
                去选题
              </button>
            )}
          </div>
        )}

        {filtered.map((content: any) => (
          <ContentCard
            key={content.id}
            content={content}
            onOpen={() => navigate(`/contents/${content.id}`)}
            onPublish={() => publishMutation.mutate(content.id)}
            isPublishing={publishMutation.isPending && publishMutation.variables === content.id}
          />
        ))}
      </div>
    </div>
  )
}

function ContentCard({
  content, onOpen, onPublish, isPublishing,
}: {
  content: any
  onOpen: () => void
  onPublish: () => void
  isPublishing: boolean
}) {
  const Icon = STATUS_ICONS[content.status] ?? FileText
  const title = content.title_variants?.[0] || content.title || '无标题'
  const preview = content.body?.slice(0, 120) || ''

  return (
    <div
      className="card p-5 cursor-pointer hover:shadow-md transition-shadow group"
      onClick={onOpen}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Status badge */}
          <div className="flex items-center gap-2 mb-2">
            <span className={clsx('inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full', STATUS_COLORS[content.status])}>
              <Icon className="w-3 h-3" />
              {STATUS_LABELS[content.status] || content.status}
            </span>
            {content.platform && (
              <span className="text-xs text-gray-400">{content.platform}</span>
            )}
          </div>

          {/* Title */}
          <h3 className="font-semibold text-gray-900 leading-snug group-hover:text-blue-600 transition-colors">
            {title}
          </h3>

          {/* Preview */}
          {preview && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2 leading-relaxed">
              {preview}
            </p>
          )}

          {/* Meta */}
          <div className="flex items-center gap-3 mt-2">
            {content.hashtags && content.hashtags.length > 0 && (
              <span className="text-xs text-gray-400">
                {content.hashtags.slice(0, 3).map((h: string) => `#${h}`).join(' ')}
                {content.hashtags.length > 3 && ` +${content.hashtags.length - 3}`}
              </span>
            )}
            <span className="text-xs text-gray-400">
              {new Date(content.created_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Actions */}
        {content.status === 'draft' && (
          <button
            onClick={(e) => { e.stopPropagation(); onPublish() }}
            disabled={isPublishing}
            className="btn-secondary flex items-center gap-1.5 text-xs whitespace-nowrap shrink-0"
          >
            <Send className="w-3 h-3" />
            {isPublishing ? '...' : '标记发布'}
          </button>
        )}
      </div>
    </div>
  )
}
