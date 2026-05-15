import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Lightbulb, FileText, Sparkles, ArrowRight, User } from 'lucide-react'
import { profileApi, topicsApi, contentsApi } from '../api'
import { useAuthStore } from '../stores/authStore'

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: profileApi.get, retry: false })
  const { data: topics } = useQuery({ queryKey: ['topics-weekly'], queryFn: topicsApi.weekly, enabled: !!profile, retry: false })
  const { data: contents } = useQuery({ queryKey: ['contents'], queryFn: () => contentsApi.list(), enabled: !!profile, retry: false })
  const { data: columns } = useQuery({ queryKey: ['columns'], queryFn: profileApi.getColumns, enabled: !!profile, retry: false })

  const publishedCount = contents?.filter((c: any) => c.status === 'published').length ?? 0
  const draftCount = contents?.filter((c: any) => c.status === 'draft').length ?? 0
  const pendingTopics = topics?.filter((t: any) => t.status === 'pending').length ?? 0

  // 没有画像 → 引导 onboarding
  if (!profile) {
    return (
      <div className="p-8 flex items-center justify-center min-h-full">
        <div className="text-center max-w-md space-y-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
            <User className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">先建立你的IP画像</h2>
          <p className="text-gray-500 text-sm">只需5分钟，系统就能为你生成个性化的选题推荐和内容栏目。</p>
          <button onClick={() => navigate('/onboarding')} className="btn-primary">
            开始建立IP画像
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          你好，{user?.user_metadata?.name || '创作者'} 👋
        </h1>
        <p className="text-gray-500 mt-1 text-sm">这是你的IP经营概览</p>
      </div>

      {/* IP Summary Card */}
      {profile.summary_card && (
        <div className="card p-5 mb-6 border-l-4 border-blue-500 bg-blue-50">
          <div className="flex items-start justify-between mb-2">
            <span className="text-xs font-medium text-blue-600 uppercase tracking-wide">你的IP定位</span>
            <button onClick={() => navigate('/onboarding')} className="text-xs text-blue-500 hover:underline">编辑画像</button>
          </div>
          <div className="space-y-1">
            {profile.summary_card.split('\n').slice(0, 4).map((line: string, i: number) => (
              <p key={i} className={`text-sm ${line.startsWith('【') ? 'font-semibold text-blue-900' : 'text-blue-800'}`}>
                {line}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: '待发选题', value: pendingTopics, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: '内容草稿', value: draftCount, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: '已发布', value: publishedCount, color: 'text-green-600', bg: 'bg-green-50' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className="card p-4">
            <div className={`text-3xl font-bold ${color} mb-1`}>{value}</div>
            <div className="text-sm text-gray-500">{label}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <button
          onClick={() => navigate('/topics')}
          className="card p-5 text-left hover:shadow-md transition-shadow group"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-blue-600" />
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
          </div>
          <h3 className="font-semibold text-gray-900">本周选题</h3>
          <p className="text-sm text-gray-500 mt-1">
            {pendingTopics > 0 ? `${pendingTopics} 个话题等你选` : '查看本周推荐选题'}
          </p>
        </button>

        <button
          onClick={() => navigate('/contents')}
          className="card p-5 text-left hover:shadow-md transition-shadow group"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-green-600" />
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-green-600 transition-colors" />
          </div>
          <h3 className="font-semibold text-gray-900">内容草稿</h3>
          <p className="text-sm text-gray-500 mt-1">
            {draftCount > 0 ? `${draftCount} 篇草稿待发布` : '从选题开始生成内容'}
          </p>
        </button>
      </div>

      {/* Columns */}
      {columns && columns.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            你的内容栏目
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {columns.map((col: any) => (
              <div key={col.id} className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm text-gray-900">{col.name}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    col.content_type === 'awareness' ? 'tag-awareness' :
                    col.content_type === 'trust' ? 'tag-trust' : 'tag-conversion'
                  }`}>
                    {col.content_type === 'awareness' ? '认知' : col.content_type === 'trust' ? '信任' : '转化'}
                  </span>
                </div>
                <p className="text-xs text-gray-500">{col.description}</p>
                {col.frequency && <p className="text-xs text-gray-400 mt-1">{col.frequency}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
