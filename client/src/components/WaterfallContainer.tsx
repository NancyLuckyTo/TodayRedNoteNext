import { Children, useMemo } from 'react'
import type { ReactElement, ReactNode } from 'react'

interface WaterfallContainerProps {
  children: ReactNode
}

interface WaterfallElementProps {
  'data-waterfall-height': number // 子组件通过 props 传递一个预设高度
}

interface WaterfallItem {
  element: ReactElement<WaterfallElementProps>
  height: number // 缓存提取出来的高度，避免反复读取 props
}

/**
 * 根据预设高度构建双列瀑布流，谁短给谁
 * @param items 卡片列表
 * @returns 双列瀑布流
 */
const buildColumns = (items: WaterfallItem[]) => {
  // 初始化两列容器和两列的高度记录
  const columns: [WaterfallItem[], WaterfallItem[]] = [[], []]
  const columnHeights = [0, 0]

  for (const item of items) {
    // 找到高度较小的列
    const targetColumn = columnHeights[0] <= columnHeights[1] ? 0 : 1
    columns[targetColumn].push(item)
    columnHeights[targetColumn] += item.height // 更新该列的总高度
  }

  return columns
}

export function WaterfallContainer({ children }: WaterfallContainerProps) {
  const items = useMemo<WaterfallItem[]>(() => {
    // Children.toArray 确保每个 child 都有唯一的 key
    return Children.toArray(children)
      .filter(Boolean) // 过滤掉 null, false, undefined 等空节点
      .map(child => {
        const element = child as ReactElement<WaterfallElementProps>
        return {
          element,
          height: element.props['data-waterfall-height'] || 0,
        }
      })
  }, [children])

  const columns = useMemo<[WaterfallItem[], WaterfallItem[]]>(() => {
    return buildColumns(items)
  }, [items])

  return (
    <div className="flex w-full gap-1 bg-gray-100 px-1 py-1">
      {columns.map((column, columnIndex) => (
        <div
          key={`column-${columnIndex}`}
          className="flex flex-1 flex-col gap-1 min-w-0"
        >
          {column.map(item => (
            <div key={item.element.key}>{item.element}</div>
          ))}
        </div>
      ))}
    </div>
  )
}
