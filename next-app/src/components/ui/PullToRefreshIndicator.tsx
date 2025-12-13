import { forwardRef } from 'react'
import { Loader2, ArrowDown } from 'lucide-react'
import type { PullToRefreshState } from '@/hooks/usePullToRefresh'

interface PullToRefreshIndicatorProps {
  state: PullToRefreshState // 用于判断当前是“正在下拉”还是“正在刷新”
}

/**
 * 下拉刷新指示器
 * 性能优化：使用 forwardRef + data 属性，由 hook 直接操作 DOM
 */
export const PullToRefreshIndicator = forwardRef<
  HTMLDivElement,
  PullToRefreshIndicatorProps
>(({ state }, ref) => {
  return (
    <div
      ref={ref}
      className="flex items-center justify-center overflow-hidden"
      style={{ height: 0 }}
    >
      <div className="flex items-center justify-center">
        {state === 'refreshing' ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <ArrowDown
            data-pull-icon
            className="h-4 w-4 text-muted-foreground"
            style={{ opacity: 0, transform: 'rotate(0deg)' }}
          />
        )}
      </div>
    </div>
  )
})

PullToRefreshIndicator.displayName = 'PullToRefreshIndicator'
