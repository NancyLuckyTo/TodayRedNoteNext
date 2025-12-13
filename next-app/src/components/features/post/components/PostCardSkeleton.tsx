interface PostCardSkeletonProps {
  ratio?: 'portrait' | 'landscape'
}

export function PostCardSkeleton({
  ratio = 'portrait',
}: PostCardSkeletonProps) {
  return (
    <div className="bg-card rounded-xs overflow-hidden">
      {/* 图片占位 - 使用 shimmer 动画 */}
      <div
        className="w-full bg-linear-to-r from-gray-100 via-gray-200 to-gray-100 animate-shimmer"
        style={{
          aspectRatio: ratio === 'landscape' ? '4/3' : '3/4',
          backgroundSize: '200% 100%',
        }}
      />
      {/* 文字占位 */}
      <div className="p-3 space-y-2">
        <div className="h-3 bg-gray-200 rounded w-full" />
        <div className="h-3 bg-gray-200 rounded w-3/5" />
      </div>
    </div>
  )
}

/**
 * 首屏骨架屏
 */
export function HomePageSkeleton() {
  const leftColumnPatterns: ('portrait' | 'landscape')[] = [
    'portrait',
    'landscape',
    'portrait',
  ]
  const rightColumnPatterns: ('portrait' | 'landscape')[] = [
    'landscape',
    'portrait',
    'portrait',
  ]

  return (
    <div className="flex w-full gap-1 bg-gray-100 px-1 py-1">
      {/* 左列 */}
      <div className="flex flex-1 flex-col gap-1 min-w-0">
        {leftColumnPatterns.map((ratio, i) => (
          <PostCardSkeleton key={`left-${i}`} ratio={ratio} />
        ))}
      </div>
      {/* 右列 */}
      <div className="flex flex-1 flex-col gap-1">
        {rightColumnPatterns.map((ratio, i) => (
          <PostCardSkeleton key={`right-${i}`} ratio={ratio} />
        ))}
      </div>
    </div>
  )
}
