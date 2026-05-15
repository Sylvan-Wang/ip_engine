import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Edit2, X, Check, BookOpen, Lightbulb, MessageSquare, BarChart2, Star } from 'lucide-react'
import { materialsApi } from '../api'
import clsx from 'clsx'

const TYPE_OPTIONS = [
  { key: 'experience', label: '亲身经历', icon: Star, color: 'text-amber-600 bg-amber-50', desc: '你经历过的真实故事、转折点' },
  { key: 'method', label: '方法论', icon: Lightbulb, color: 'text-blue-600 bg-blue-50', desc: '你总结出的流程、框架、步骤' },
  { key: 'opinion', label: '独特观点', icon: MessageSquare, color: 'text-purple-600 bg-purple-50', desc: '你对某个问题的不同看法' },
  { key: 'data', label: '数据案例', icon: BarChart2, color: 'text-green-600 bg-green-50', desc: '你收集的数据、行业案例' },
  { key: 'feedback', label: '用户反馈', icon: BookOpen, color: 'text-rose-600 bg-rose-50', desc: '受众的问题、留言、互动内容' },
]

interface Material {
  id: string
  type: string
  title: string
  content: string
  tags: string[]
  created_at: string
}

interface FormState {
  type: string
  title: string
  content: string
  tags: string
}

const EMPTY_FORM: FormState = { type: 'experience', title: '', content: '', tags: '' }

export default function Materials() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)

  const { data: materials, isLoading } = useQuery<Material[]>({
    queryKey: ['materials'],
    queryFn: () => materialsApi.list() as Promise<Material[]>,
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => materialsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['materials'] })
      setShowForm(false)
      setForm(EMPTY_FORM)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => materialsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['materials'] })
      setEditId(null)
      setForm(EMPTY_FORM)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => materialsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['materials'] }),
  })

  const handleSubmit = () => {
    const payload = {
      type: form.type,
      title: form.title.trim(),
      content: form.content.trim(),
      tags: form.tags.split(/[，,\s]+/).filter(Boolean),
    }
    if (!payload.title || !payload.content) return
    if (editId) {
      updateMutation.mutate({ id: editId, data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const startEdit = (m: Material) => {
    setEditId(m.id)
    setForm({ type: m.type, title: m.title, content: m.content, tags: m.tags.join(', ') })
    setShowForm(true)
  }

  const cancelForm = () => {
    setShowForm(false)
    setEditId(null)
    setForm(EMPTY_FORM)
  }

  const filtered = materials?.filter((m: Material) => filter === 'all' || m.type === filter) ?? []

  return (
    <div className="p-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">素材库</h1>
          <p className="text-sm text-gray-500 mt-0.5">积累你的原生素材，AI 生成内容时会优先引用</p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-1.5 text-sm">
            <Plus className="w-4 h-4" />添加素材
          </button>
        )}
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <div className="card p-5 mb-6 border-blue-200 ring-1 ring-blue-100">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-gray-800">{editId ? '编辑素材' : '添加新素材'}</p>
            <button onClick={cancelForm} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Type selector */}
          <div className="flex flex-wrap gap-2 mb-4">
            {TYPE_OPTIONS.map(({ key, label, icon: Icon, color }) => (
              <button
                key={key}
                onClick={() => setForm((f) => ({ ...f, type: key }))}
                className={clsx(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all',
                  form.type === key ? `${color} border-current` : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300',
                )}
              >
                <Icon className="w-3 h-3" />{label}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <input
              type="text"
              className="input-base"
              placeholder="标题（简短说明这条素材是什么）"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
            <textarea
              className="input-base resize-none"
              rows={4}
              placeholder="详细内容..."
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            />
            <input
              type="text"
              className="input-base"
              placeholder="标签（用逗号或空格分隔，可选）"
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
            />
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={handleSubmit}
              disabled={!form.title.trim() || !form.content.trim() || createMutation.isPending || updateMutation.isPending}
              className="btn-primary flex items-center gap-1.5 text-sm"
            >
              <Check className="w-3.5 h-3.5" />
              {createMutation.isPending || updateMutation.isPending ? '保存中...' : '保存'}
            </button>
            <button onClick={cancelForm} className="btn-secondary text-sm">取消</button>
          </div>
        </div>
      )}

      {/* Type filter tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={clsx(
            'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
            filter === 'all' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300',
          )}
        >
          全部 {materials && `(${materials.length})`}
        </button>
        {TYPE_OPTIONS.map(({ key, label }) => {
          const count = materials?.filter((m: Material) => m.type === key).length ?? 0
          if (count === 0 && filter !== key) return null
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={clsx(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                filter === key ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300',
              )}
            >
              {label} {count > 0 && `(${count})`}
            </button>
          )
        })}
      </div>

      {/* Tips */}
      {(!materials || materials.length === 0) && !isLoading && (
        <div className="card p-6 mb-5 bg-blue-50 border-blue-100">
          <p className="text-sm font-semibold text-blue-900 mb-2">素材库是你的内容护城河</p>
          <p className="text-xs text-blue-700 leading-relaxed">
            把你的亲身经历、独特观点、数据案例存进来。AI 生成内容时会优先引用你的素材，让内容更真实、更有你的风格——而不是空洞的大道理。
          </p>
        </div>
      )}

      {/* Material cards */}
      <div className="space-y-3">
        {isLoading && (
          <div className="text-center py-8 text-gray-400 text-sm">加载中...</div>
        )}
        {!isLoading && filtered.length === 0 && materials && materials.length > 0 && (
          <div className="card p-8 text-center text-gray-500 text-sm">
            该分类暂无素材
          </div>
        )}
        {filtered.map((m: Material) => (
          <MaterialCard
            key={m.id}
            material={m}
            onEdit={() => startEdit(m)}
            onDelete={() => { if (confirm('确定删除这条素材吗？')) deleteMutation.mutate(m.id) }}
          />
        ))}
      </div>
    </div>
  )
}

function MaterialCard({
  material, onEdit, onDelete,
}: {
  material: Material
  onEdit: () => void
  onDelete: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const typeInfo = TYPE_OPTIONS.find((t) => t.key === material.type)
  const Icon = typeInfo?.icon ?? BookOpen

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Type badge */}
          <span className={clsx('inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full mb-2', typeInfo?.color ?? 'text-gray-600 bg-gray-100')}>
            <Icon className="w-3 h-3" />{typeInfo?.label ?? material.type}
          </span>

          {/* Title */}
          <h3 className="font-medium text-gray-900 text-sm">{material.title}</h3>

          {/* Content preview */}
          <p className={clsx('text-sm text-gray-600 mt-1 leading-relaxed', !expanded && 'line-clamp-2')}>
            {material.content}
          </p>
          {material.content.length > 100 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-blue-600 hover:underline mt-1"
            >
              {expanded ? '收起' : '展开全文'}
            </button>
          )}

          {/* Tags */}
          {material.tags && material.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {material.tags.map((tag, i) => (
                <span key={i} className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-1 shrink-0">
          <button onClick={onEdit} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
  