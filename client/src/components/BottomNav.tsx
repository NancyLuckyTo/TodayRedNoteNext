import { Link, useLocation } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useAuthStore } from '@/store/auth'

const BottomNav = () => {
  const location = useLocation()

  const navItems = [
    { path: '/', label: '首页' },
    { path: '/createPost', label: '发布', isCreateButton: true },
    { path: '/profile', label: '我' },
  ]

  const isLoggedIn = useAuthStore(s => s.isAuthenticated)

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white z-10">
      <div className="flex justify-around items-center py-2 px-4">
        {navItems.map(item => {
          const targetPath =
            item.path === '/profile'
              ? isLoggedIn
                ? '/profile'
                : '/login'
              : item.path
          const isActive =
            item.path === '/profile'
              ? location.pathname === '/profile' ||
                location.pathname === '/login'
              : location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={targetPath}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive
                  ? 'text-gray-700 font-bold'
                  : 'text-gray-400 text-sm hover:text-gray-700'
              }`}
            >
              {'isCreateButton' in item && item.isCreateButton ? (
                <div className="w-10 h-7 bg-red-500 rounded-lg flex items-center justify-center">
                  <Plus className="w-5 h-5 text-white" strokeWidth={2.5} />
                </div>
              ) : (
                <span>{item.label}</span>
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export default BottomNav
