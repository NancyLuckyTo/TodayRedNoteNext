import { useMemo, useState, useRef, useLayoutEffect, useCallback } from 'react'
import type { ReactNode } from 'react'

const CONTAINER_HEIGHT = 800 // 默认可视容器高度
const OVERSCAN_HEIGHT = 1400 // 上下各预渲染的缓冲区高度
const GAP = 4 // 卡片间距

interface WaterfallContainerProps<T> {
  items: T[] // 数据源
  renderItem: (item: T, index: number) => ReactNode // 渲染函数
  getItemKey: (item: T) => string // 获取唯一 Key
  estimateHeight: (item: T) => number // 估算高度函数
  scrollTop?: number // 当前滚动位置
  containerHeight?: number // 容器高度
  overscan?: number // 缓冲区大小
  onHeightChange?: (key: string, height: number) => void // 高度变化回调
}

// 经过计算后，每个卡片携带的布局信息
interface PositionedItem<T> {
  item: T
  index: number // 在原数组中的索引
  key: string
  top: number // 绝对定位 Y 轴坐标
  height: number // 卡片高度
  column: 0 | 1 // 在左列还是右列
}

/**
 * 测量子元素高度的组件
 */
const MeasuredItem = ({
  children,
  onHeightChange,
}: {
  children: ReactNode
  onHeightChange: (height: number) => void
}) => {
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new ResizeObserver(entries => {
      if (entries[0]) {
        // 使用 borderBoxSize 更精确，如果不支持则回退到 contentRect
        const height =
          entries[0].borderBoxSize?.[0]?.blockSize ??
          entries[0].contentRect.height
        onHeightChange(height) // 当监测到高度变化，通知父组件
      }
    })

    observer.observe(element)
    return () => observer.disconnect() // 组件卸载时停止监听，防止内存泄漏
  }, [onHeightChange])

  return <div ref={ref}>{children}</div>
}

/**
 * 二分查找：找到第一个满足 predicate 的索引，即刚好进入视口的元素
 */
function binarySearch<T>(items: T[], predicate: (item: T) => boolean): number {
  let l = 0
  let r = items.length - 1
  let res = -1

  while (l <= r) {
    const mid = l + ((r - l) >> 1)
    if (predicate(items[mid])) {
      res = mid
      r = mid - 1
    } else {
      l = mid + 1
    }
  }
  return res
}

/**
 * 虚拟化瀑布流容器
 */
export function WaterfallContainer<T>({
  items,
  renderItem,
  getItemKey,
  estimateHeight,
  scrollTop = 0,
  containerHeight = CONTAINER_HEIGHT,
  overscan = OVERSCAN_HEIGHT,
}: WaterfallContainerProps<T>) {
  // 存储所有卡片的真实高度。Key 是卡片的唯一 ID，Value 是高度
  // 初始为空，随着卡片渲染，MeasuredItem 会回调填充这里的数据
  const [measuredHeights, setMeasuredHeights] = useState<
    Record<string, number>
  >({})

  // 处理高度变化
  const handleHeightChange = useCallback((key: string, height: number) => {
    setMeasuredHeights(prev => {
      // 优化：只有高度差超过 1px 才更新状态，避免小数精度导致的无限重渲染循环
      if (Math.abs((prev[key] || 0) - height) < 1) return prev
      return { ...prev, [key]: height }
    })
  }, [])

  // 1. 计算布局 (将所有 items 分配到两列)
  // 这是一个纯计算过程，依赖 items 和 measuredHeights
  const { leftColumn, rightColumn, columnHeights } = useMemo(() => {
    const left: PositionedItem<T>[] = []
    const right: PositionedItem<T>[] = []
    const heights: [number, number] = [0, 0]

    items.forEach((item, index) => {
      const key = getItemKey(item)
      // 优先使用测量高度，否则使用估算高度
      const height = measuredHeights[key] ?? estimateHeight(item)

      // 贪心策略：放入较短的一列
      const column = heights[0] <= heights[1] ? 0 : 1
      const top = heights[column]

      const positionedItem: PositionedItem<T> = {
        item,
        index,
        key,
        top,
        height,
        column,
      }

      if (column === 0) {
        left.push(positionedItem)
      } else {
        right.push(positionedItem)
      }

      heights[column] += height + GAP // 更新该列高度
    })

    return { leftColumn: left, rightColumn: right, columnHeights: heights }
  }, [items, measuredHeights, getItemKey, estimateHeight])

  // 2. 计算当前视窗的上下边界（包含缓冲区）
  const visibleTop = Math.max(0, scrollTop - overscan)
  const visibleBottom = scrollTop + containerHeight + overscan

  // 3. 这是根据视窗范围，从上面计算好的长列表中切出需要渲染的一小段 (可见 items + padding)
  const getColumnRenderInfo = (
    columnItems: PositionedItem<T>[],
    colHeight: number
  ) => {
    if (columnItems.length === 0) {
      return { visibleItems: [], paddingTop: 0, paddingBottom: 0 }
    }

    // 二分查找 startIndex: 第一个 bottom >= visibleTop 的元素，这个元素之前的元素都已经在屏幕上面不可见了
    const startIndex = binarySearch(
      columnItems,
      item => item.top + item.height >= visibleTop
    )

    // 二分查找 endIndex: 第一个 top > visibleBottom 的元素（第一个超出底部边界的元素），从这个元素开始的所有元素都在屏幕下面不可见
    let endIndex = binarySearch(columnItems, item => item.top > visibleBottom)

    // 如果没找到 top > visibleBottom 的，说明直到最后一个都可见
    if (endIndex === -1) {
      endIndex = columnItems.length
    }

    // 特殊情况处理：没有元素满足 bottom >= visibleTop，即所有元素都在可视区上方
    if (startIndex === -1 || startIndex >= endIndex) {
      return { visibleItems: [], paddingTop: colHeight, paddingBottom: 0 }
    }

    const visibleItems = columnItems.slice(startIndex, endIndex) // 真正要渲染的子数组
    const firstItem = columnItems[startIndex]
    const lastItem = columnItems[endIndex - 1]

    const paddingTop = firstItem.top // 上方撑开的高度 = 第一个可见元素的 top 值
    const paddingBottom = Math.max(
      0,
      colHeight - (lastItem.top + lastItem.height + GAP)
    ) // 下方撑开的高度 = 总高度 - 最后一个可见元素的底部位置，并考虑间距

    return { visibleItems, paddingTop, paddingBottom }
  }

  // 分别计算左右两列
  const leftRenderInfo = getColumnRenderInfo(leftColumn, columnHeights[0])
  const rightRenderInfo = getColumnRenderInfo(rightColumn, columnHeights[1])

  return (
    <div className="flex w-full gap-1 bg-gray-100 px-1 py-1">
      {/* 左列容器 */}
      <div
        className="flex flex-1 flex-col gap-1 min-w-0"
        style={{
          paddingTop: leftRenderInfo.paddingTop,
          paddingBottom: leftRenderInfo.paddingBottom,
        }}
      >
        {leftRenderInfo.visibleItems.map(pItem => (
          <MeasuredItem
            key={pItem.key}
            onHeightChange={h => handleHeightChange(pItem.key, h)}
          >
            {renderItem(pItem.item, pItem.index)}
          </MeasuredItem>
        ))}
      </div>

      {/* 右列容器 */}
      <div
        className="flex flex-1 flex-col gap-1 min-w-0"
        style={{
          paddingTop: rightRenderInfo.paddingTop,
          paddingBottom: rightRenderInfo.paddingBottom,
        }}
      >
        {rightRenderInfo.visibleItems.map(pItem => (
          <MeasuredItem
            key={pItem.key}
            onHeightChange={h => handleHeightChange(pItem.key, h)}
          >
            {renderItem(pItem.item, pItem.index)}
          </MeasuredItem>
        ))}
      </div>
    </div>
  )
}
