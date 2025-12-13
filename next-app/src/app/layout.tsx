import './globals.css'
import { Providers } from '@/components/providers/Providers'

export const metadata = {
  title: 'Today Red Note',
  description: 'A Red Note clone built with Next.js',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <Providers>
          <div className="flex min-h-screen justify-center bg-gray-100 dark:bg-zinc-950">
            <div className="relative w-full max-w-md min-h-screen bg-white dark:bg-zinc-900 shadow-lg">
              {children}
            </div>
          </div>
        </Providers>
      </body>
    </html>
  )
}
