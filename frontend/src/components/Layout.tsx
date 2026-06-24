import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Lightbulb, FileText, Package, LogOut, Zap, Briefcase } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'
import clsx from 'clsx'

const nav = [
  { to: '/dashboard', icon: LayoutDashboard, label: '概览' },
  { to: '/topics',    icon: Lightbulb,       label: '选题' },
  { to: '/contents',  icon: FileText,         label: '内容' },
  { to: '/materials', icon: Package,          label: '素材库' },
]

// UGC创作者商业板块所在的站点(产品B)。这里只放跳转目标，真正的免登录跳转
// 是带着这次真实会话的token去B站点的 /auth/bridge 接口换成B站点自己的登录态。
const COMMERCE_SITE = 'https://ugc-platform-tob-demo.netlify.app'

export default function Layout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const handleOpenCommerce = async () => {
    const { data } = await supabase.auth.getSession()
    const session = data.session
    if (!session) {
      window.open(`${COMMERCE_SITE}/creator/campaigns`, '_blank')
      return
    }
    const params = new URLSearchParams({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      redirect: '/creator/campaigns',
    })
    window.open(`${COMMERCE_SITE}/auth/bridge?${params.toString()}`, '_blank')
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-100 flex flex-col">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900">IP引擎</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">个人IP内容系统</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {nav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                )
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}

          <button
            onClick={handleOpenCommerce}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            <Briefcase className="w-4 h-4" />
            商业合作
          </button>
        </nav>

        {/* User */}
        <div className="px-3 py-4 border-t border-gray-100">
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-700">
              {(user?.user_metadata?.name?.[0] || user?.email?.[0])?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-900 truncate">{user?.user_metadata?.name || user?.email}</p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            </div>
            <button onClick={handleLogout} className="text-gray-400 hover:text-gray-600">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
