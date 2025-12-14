import { useState, useEffect } from 'react'
import { ROOT_MARGIN_VALUE } from '@/constants/post'

declare global {
  interface Window {
    __setRootMargin?: (value: string) => void
  }
}

/**
 * 开发环境下用于调试 rootMargin 值的 Hook
 * 可以通过 window.__setRootMargin() 实时修改值
 */
export function useDebugRootMargin(): string {
  const [rootMargin, setRootMargin] = useState(ROOT_MARGIN_VALUE)

  useEffect(() => {
    // 仅在开发环境启用
    if (process.env.NODE_ENV === 'production') return

    // 暴露到 window 上供控制台调用
    window.__setRootMargin = (value: string) => {
      console.log(`[Debug] rootMargin changed: ${value}`)
      setRootMargin(value)
    }

    // 打印使用说明
    console.log(
      '%c[Debug] rootMargin 调试已启用',
      'color: #10b981; font-weight: bold'
    )
    console.log(
      `当前值: "${ROOT_MARGIN_VALUE}"\n` +
        `使用 window.__setRootMargin('0px 0px 200px 0px') 来修改\n` +
        `格式: 'top right bottom left'`
    )

    return () => {
      delete window.__setRootMargin
    }
  }, [])

  return rootMargin
}
