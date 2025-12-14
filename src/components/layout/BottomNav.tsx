'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Plus } from 'lucide-react'
import { useAuthStore } from '@/stores/auth'
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui/toast'

type NavItemKey = 'home' | 'market' | 'create' | 'messages' | 'profile'
type NavItemType = 'route' | 'action'

// 导航项接口
interface NavItem {
  key: NavItemKey
  label: string
  type: NavItemType
  path?: string
  isCreateButton?: boolean
}

// 导航栏内容
const NAV_ITEMS: NavItem[] = [
  { key: 'home', type: 'route', path: '/', label: '首页' },
  { key: 'market', type: 'action', label: '市集' },
  {
    key: 'create',
    type: 'route',
    path: '/createPost',
    label: '发布',
    isCreateButton: true,
  },
  { key: 'messages', type: 'action', label: '消息' },
  { key: 'profile', type: 'route', path: '/profile', label: '我' },
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

  const handleActionClick = (item: NavItem) => {
    if (item.key === 'market') {
      toast.info('点击了市集')
      return
    }

    if (item.key === 'messages') {
      toast.info('点击了消息')
    }
  }

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white z-50">
      <div className="flex items-center justify-around h-12 px-2">
        {NAV_ITEMS.map(item => {
          const isRouteItem = item.type === 'route' && Boolean(item.path)
          const isActive =
            isRouteItem && item.path ? isActiveRoute(item.path) : false

          const baseClassName = cn(
            'flex flex-col items-center justify-center flex-1 h-full transition-colors duration-200 font-bold',
            isActive ? 'text-gray-900' : 'text-gray-400 text-[15px]'
          )

          if (isRouteItem && item.path) {
            const targetPath = getTargetPath(item) || '/'

            return (
              <Link key={item.key} href={targetPath} className={baseClassName}>
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
          }

          return (
            <button
              key={item.key}
              type="button"
              className={baseClassName}
              onClick={() => handleActionClick(item)}
            >
              <span className="mt-0.5">{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export default BottomNav
