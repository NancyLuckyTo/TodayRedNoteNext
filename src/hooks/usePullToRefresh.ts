import { useEffect, useRef, useState } from 'react'

const PULL_THRESHOLD = 60 // 触发刷新的最小拉动距离
const MAX_PULL_DISTANCE = 100 // 最大拉动距离
const RESISTANCE = 2 // 阻力系数，数值越大拉动越费力

export type PullToRefreshState = 'idle' | 'pulling' | 'ready' | 'refreshing'

interface UsePullToRefreshOptions {
  // 滚动容器的 ref
  containerRef: React.RefObject<HTMLDivElement | null>
  // 刷新指示器的 ref，用于直接操作 DOM 提升性能
  indicatorRef: React.RefObject<HTMLDivElement | null>
  onRefresh: () => Promise<void>
  disabled?: boolean
}

interface UsePullToRefreshReturn {
  // 当前状态（仅在状态切换时更新，不影响拖动性能）
  state: PullToRefreshState
}

/**
 * 下拉刷新 Hook
 * 性能优化：使用直接 DOM 操作 + requestAnimationFrame，避免频繁 React 重渲染
 */
export function usePullToRefresh({
  containerRef,
  indicatorRef,
  onRefresh,
  disabled = false,
}: UsePullToRefreshOptions): UsePullToRefreshReturn {
  const [state, setState] = useState<PullToRefreshState>('idle')

  // 使用 ref 存储拖动过程中的数据，避免触发 React 重渲染
  const startYRef = useRef(0) // 手指按下时的 Y 坐标
  const isTrackingRef = useRef(false) // 是否正在跟踪触摸
  const currentDistanceRef = useRef(0) // 当前拉动的距离
  const rAFIdRef = useRef<number | null>(null) // requestAnimationFrame 的 ID，用于取消动画

  // 解决闭包陷阱：保证 useEffect 内部能访问到最新的 state 和 onRefresh 函数
  const stateRef = useRef(state)
  stateRef.current = state
  const onRefreshRef = useRef(onRefresh)
  onRefreshRef.current = onRefresh

  useEffect(() => {
    const container = containerRef.current
    const indicator = indicatorRef.current
    if (!container || !indicator) return

    // 直接更新 DOM，跳过 React 渲染
    const updateIndicatorDOM = (distance: number) => {
      // 设置指示器高度
      indicator.style.height = `${distance}px`
      // 更新图标旋转
      const icon = indicator.querySelector('[data-pull-icon]') as HTMLElement
      if (icon) {
        const rotation = Math.min((distance / PULL_THRESHOLD) * 180, 180)
        const opacity = 0.3 + (distance / PULL_THRESHOLD) * 0.7 // 计算透明度：拉得越长越清晰
        icon.style.transform = `rotate(${rotation}deg)`
        icon.style.opacity = String(Math.min(opacity, 1))
      }
    }

    const handleTouchStart = (e: TouchEvent) => {
      if (disabled || stateRef.current === 'refreshing') return

      // 只有当列表在最顶部时，下拉才有效
      if (container.scrollTop <= 0) {
        startYRef.current = e.touches[0].clientY
        isTrackingRef.current = true
        currentDistanceRef.current = 0
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (
        disabled ||
        stateRef.current === 'refreshing' ||
        !isTrackingRef.current
      )
        return

      const deltaY = e.touches[0].clientY - startYRef.current

      if (deltaY <= 0 || container.scrollTop > 0) {
        if (currentDistanceRef.current > 0) {
          currentDistanceRef.current = 0
          updateIndicatorDOM(0)
          if (stateRef.current !== 'idle') {
            setState('idle')
          }
        }
        isTrackingRef.current = false
        return
      }

      e.preventDefault() // 阻止浏览器自带的下拉刷新

      const resistedDistance = Math.min(deltaY / RESISTANCE, MAX_PULL_DISTANCE)
      currentDistanceRef.current = resistedDistance
      const isReady = resistedDistance >= PULL_THRESHOLD // 判断是否到达了触发刷新的阈值

      // 使用 rAF 节流 DOM 更新：避免一帧内多次操作 DOM，保证与屏幕的刷新率同步
      if (rAFIdRef.current === null) {
        rAFIdRef.current = requestAnimationFrame(() => {
          updateIndicatorDOM(currentDistanceRef.current)
          rAFIdRef.current = null
        })
      }

      // 只在状态真正变化时更新 React 状态
      const newState = isReady ? 'ready' : 'pulling'
      if (stateRef.current !== newState) {
        setState(newState)
      }
    }

    const handleTouchEnd = async () => {
      if (!isTrackingRef.current) return
      isTrackingRef.current = false

      // 取消待执行的 rAF，清理还没执行的动画帧
      if (rAFIdRef.current !== null) {
        cancelAnimationFrame(rAFIdRef.current)
        rAFIdRef.current = null
      }

      // 如果松手时已经是 ready 状态，则触发刷新
      if (stateRef.current === 'ready') {
        setState('refreshing')
        updateIndicatorDOM(PULL_THRESHOLD) // 让高度停留在阈值位置（悬停效果）

        try {
          await onRefreshRef.current()
        } finally {
          setState('idle')
          updateIndicatorDOM(0)
          currentDistanceRef.current = 0
        }
      } else {
        setState('idle')
        updateIndicatorDOM(0)
        currentDistanceRef.current = 0
      }
    }

    container.addEventListener('touchstart', handleTouchStart, {
      passive: true,
    })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd, { passive: true })
    container.addEventListener('touchcancel', handleTouchEnd, { passive: true })

    return () => {
      if (rAFIdRef.current !== null) {
        cancelAnimationFrame(rAFIdRef.current)
      }
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
      container.removeEventListener('touchcancel', handleTouchEnd)
    }
  }, [containerRef, indicatorRef, disabled])

  return { state }
}
