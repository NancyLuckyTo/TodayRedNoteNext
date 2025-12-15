import type { Viewport } from 'next'
import './globals.css'
import { Providers } from '@/components/providers/Providers'
import BottomNav from '@/components/layout/BottomNav'
import { DynamicGlobalPublisher } from '@/components/features/DynamicGlobalPublisher'

export const metadata = {
  title: '今日红书 - 你的头条指南',
  description: '你想看的奇闻趣事都在这里！',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <link
          rel="preconnect"
          href="https://img.todayrednote.top"
          crossOrigin=""
        />
        <link
          rel="preconnect"
          href="https://today-red-note.oss-cn-hongkong.aliyuncs.com"
          crossOrigin=""
        />
      </head>
      <body>
        <Providers>
          <DynamicGlobalPublisher />
          <div className="flex min-h-screen justify-center bg-gray-50">
            <div className="relative w-full max-w-md min-h-screen shadow-lg">
              {children}
            </div>
          </div>
          <BottomNav />
        </Providers>
      </body>
    </html>
  )
}
