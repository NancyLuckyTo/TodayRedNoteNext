'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Plus } from 'lucide-react'
import { useAuthStore } from '@/stores/auth'
import { cn } from '@/lib/utils'

const BottomNav = () => {
  const pathname = usePathname()
  const isLoggedIn = useAuthStore(s => s.isAuthenticated)

  const navItems = [
    { path: '/', label: '首页' },
    { path: '/createPost', label: '发布', isCreateButton: true },
    { path: '/profile', label: '我' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 pb-safe">
      <div className="flex justify-around items-center h-14">
        {navItems.map(item => {
          // 动态计算目标路径
          const targetPath =
            item.path === '/profile'
              ? isLoggedIn
                ? '/profile'
                : '/login'
              : item.path

          // 判断是否激活
          const isActive =
            item.path === '/profile'
              ? pathname === '/profile' || pathname === '/login'
              : pathname === item.path

          return (
            <Link
              key={item.path}
              href={targetPath}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full transition-colors',
                isActive
                  ? 'text-gray-900 font-medium'
                  : 'text-gray-400 text-xs hover:text-gray-600'
              )}
            >
              {'isCreateButton' in item && item.isCreateButton ? (
                <div className="w-10 h-7 bg-red-500 rounded-lg flex items-center justify-center shadow-sm">
                  <Plus className="w-5 h-5 text-white" strokeWidth={2.5} />
                </div>
              ) : (
                <span className="text-sm">{item.label}</span>
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export default BottomNav
