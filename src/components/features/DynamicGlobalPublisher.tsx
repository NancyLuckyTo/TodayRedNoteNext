'use client'

import dynamic from 'next/dynamic'

// 延迟加载 GlobalPublisher，不参与 SSR，减少首屏 hydration 负担
const GlobalPublisher = dynamic(
  () =>
    import('@/components/features/GlobalPublisher').then(mod => ({
      default: mod.GlobalPublisher,
    })),
  { ssr: false }
)

export function DynamicGlobalPublisher() {
  return <GlobalPublisher />
}
