'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Plus } from 'lucide-react'
import { useAuthStore } from '@/stores/auth'
import { cn } from '@/lib/utils'

// 导航项接口
interface NavItem {
  label: string
  path: string
  isCreateButton?: boolean
}

// 导航栏内容
const NAV_ITEMS: NavItem[] = [
  { path: '/', label: '首页' },
  { path: '/createPost', label: '发布', isCreateButton: true },
  { path: '/profile', label: '我' },
]

// 导航栏可见路径
const VISIBLE_PATHS = ['/', '/profile', '/login']

const BottomNav = () => {
  const pathname = usePathname()
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)

  if (!pathname || !VISIBLE_PATHS.includes(pathname)) {
    return null
  }

  const getTargetPath = (item: NavItem) => {
    if (
      (item.path === '/profile' || item.path === '/createPost') &&
      !isAuthenticated
    ) {
      return '/login'
    }
    return item.path
  }

  const isActiveRoute = (itemPath: string) => {
    if (itemPath === '/profile') {
      return ['/profile', '/login'].includes(pathname)
    }
    return pathname === itemPath
  }

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white z-50">
      <div className="flex items-center justify-around h-12 px-2">
        {NAV_ITEMS.map(item => {
          const targetPath = getTargetPath(item) // 获取目标路径
          const isActive = isActiveRoute(item.path) // 判断是否激活

          return (
            <Link
              key={item.path}
              href={targetPath}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full transition-colors duration-200 font-bold',
                isActive ? 'text-gray-900' : 'text-gray-400 text-[15px]'
              )}
            >
              {item.isCreateButton ? (
                <div
                  className="flex items-center justify-center w-12 h-8 bg-red-500 rounded-lg shadow-sm transition-transform active:scale-95"
                  aria-label="Create Post"
                >
                  <Plus className="w-5 h-5 text-white" strokeWidth={2.5} />
                </div>
              ) : (
                <span className="mt-0.5">{item.label}</span>
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export default BottomNav
