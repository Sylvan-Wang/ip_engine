import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Zap } from 'lucide-react'
import { authApi } from '../api'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) { setError('密码至少8位'); return }
    setError(''); setLoading(true)
    try {
      await authApi.register({ email, password, name })
      navigate('/onboarding')
    } catch (err: any) {
      setError(err.message || '注册失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-xl mb-4">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">开始搭建你的IP</h1>
          <p className="text-sm text-gray-500 mt-1">5分钟建立你的内容体系</p>
        </div>

        <div className="card p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg mb-4">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">你的名字</label>
              <input type="text" className="input-base" value={name} onChange={(e) => setName(e.target.value)} placeholder="可选" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
              <input type="email" required className="input-base" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
              <input type="password" required className="input-base" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="至少8位" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? '创建中...' : '免费开始'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-4">
            已有账号？{' '}
            <Link to="/login" className="text-blue-600 hover:underline font-medium">登录</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
