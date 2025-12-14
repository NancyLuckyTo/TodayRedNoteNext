'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/auth'
import { HomeStoreProvider } from '@/stores/homeStoreContext'
import dynamic from 'next/dynamic'

// Toast 不影响首屏渲染，可以延迟加载
const ToastProvider = dynamic(
  () =>
    import('@/components/ui/toast/ToastProvider').then(mod => ({
      default: mod.ToastProvider,
    })),
  { ssr: false }
)

export function Providers({ children }: { children: React.ReactNode }) {
  const initializeAuth = useAuthStore(s => s.initialize)

  useEffect(() => {
    initializeAuth()
  }, [initializeAuth])

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem={false}
      >
        <HomeStoreProvider>{children}</HomeStoreProvider>
        <ToastProvider />
      </ThemeProvider>
    </QueryClientProvider>
  )
}
