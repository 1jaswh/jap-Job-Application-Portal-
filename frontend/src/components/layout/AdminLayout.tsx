import { Outlet, Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, FileText, Users, ArrowLeft, BarChart3, ClipboardList } from 'lucide-react'

export default function AdminLayout() {
  const location = useLocation()

  const navItems = [
    { path: '/admin',              icon: LayoutDashboard, label: 'Dashboard',    exact: true },
    { path: '/admin/jobs',         icon: FileText,        label: 'Jobs' },
    { path: '/admin/applications', icon: Users,           label: 'Applications' },
    { path: '/admin/onboarding',   icon: ClipboardList,   label: 'Onboarding' },
    { path: '/admin/reports',      icon: BarChart3,       label: 'Reports' },
  ]

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return location.pathname === path
    return location.pathname.startsWith(path)
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white shadow-md min-h-screen fixed left-0 top-0 z-10">
          <div className="p-4 border-b">
            <Link to="/" className="flex items-center space-x-2 text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">Back to Portal</span>
            </Link>
          </div>
          <nav className="p-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.path, item.exact)
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    active
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 ml-64 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}