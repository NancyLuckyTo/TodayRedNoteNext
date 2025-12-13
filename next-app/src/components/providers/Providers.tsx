'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { ToastProvider } from '@/components/ui/toast/ToastProvider'
import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/auth'

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
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        {children}
        <ToastProvider />
      </ThemeProvider>
    </QueryClientProvider>
  )
}
