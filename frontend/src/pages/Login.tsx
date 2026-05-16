import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Zap } from 'lucide-react'
import { authApi } from '../api'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await authApi.login({ email, password })
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.message || '登录失败，请检查邮箱和密码')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async () => {
    if (!email) { setError('请先输入邮箱地址'); return }
    setResetLoading(true)
    setError('')
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password',
      })
      if (error) throw error
      setResetSent(true)
    } catch (err: any) {
      setError(err.message || '发送失败，请重试')
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-xl mb-4">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">IP引擎</h1>
          <p className="text-sm text-gray-500 mt-1">帮你建立持续运转的个人IP内容体系</p>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-5">登录账号</h2>

          {resetSent && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2 rounded-lg mb-4">
              重置密码邮件已发送，请查收邮箱
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
              <input type="email" required className="input-base"
                value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
              <input type="password" required className="input-base"
                value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? '登录中...' : '登录'}
            </button>
          </form>

          <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
            <p>还没有账号？{' '}
              <Link to="/register" className="text-blue-600 hover:underline font-medium">免费注册</Link>
            </p>
            <button type="button" onClick={handleReset} disabled={resetLoading}
              className="text-blue-600 hover:underline font-medium">
              {resetLoading ? '发送中...' : '忘记密码'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
