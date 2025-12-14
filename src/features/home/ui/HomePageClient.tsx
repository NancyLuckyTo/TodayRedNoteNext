'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { WaterfallContainer } from '@/components/ui/WaterfallContainer'
import { PostCard } from '@/features/post/components/PostCard'
import { PullToRefreshIndicator } from '@/components/ui/PullToRefreshIndicator'
import api from '@/lib/api'
import type { PostsResponse } from '@/types/posts'
import { calculatePostHeight } from '@/lib/postUtils'
import { Spinner } from '@/components/ui/spinner'
import { HomePageSkeleton } from '@/features/post/components/PostCardSkeleton'
import { useHomeStore } from '@/stores/homeStoreContext'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { PublishingBanner } from '@/features/post/components/PublishingBanner'
import { useDebugRootMargin } from '@/hooks/useDebugRootMargin'
import { FETCH_LIMIT, PRIORITY_LIMIT, type IPost } from '@today-red-note/types'
import { toast } from '@/components/ui/toast'

interface HomePageClientProps {
  initialPosts: IPost[]
  initialPagination?: PostsResponse['pagination']
}

// 移动端默认宽度假设（用于 SSR）
const MOBILE_DEFAULT_WIDTH = 375
const PADDING_AND_GAP = 12
const DEFAULT_COLUMN_WIDTH = (MOBILE_DEFAULT_WIDTH - PADDING_AND_GAP) / 2

/**
 * 自定义 hook：封装 home store 的常用选择器
 */
const useHomeStoreSelectors = () => {
  const posts = useHomeStore(state => state.posts)
  const nextCursor = useHomeStore(state => state.nextCursor)
  const hasNextPage = useHomeStore(state => state.hasNextPage)
  const scrollPosition = useHomeStore(state => state.scrollPosition)
  const setPosts = useHomeStore(state => state.setPosts)
  const setPagination = useHomeStore(state => state.setPagination)
  const setScrollPosition = useHomeStore(state => state.setScrollPosition)
  const addViewedPostIds = useHomeStore(state => state.addViewedPostIds)
  const getExcludeIds = useHomeStore(state => state.getExcludeIds)
  const clearViewedPostIds = useHomeStore(state => state.clearViewedPostIds)
  const postHeights = useHomeStore(state => state.postHeights)
  const setPostHeight = useHomeStore(state => state.setPostHeight)

  return {
    posts,
    nextCursor,
    hasNextPage,
    scrollPosition,
    setPosts,
    setPagination,
    setScrollPosition,
    addViewedPostIds,
    getExcludeIds,
    clearViewedPostIds,
    postHeights,
    setPostHeight,
  }
}

const HomePageContent = ({
  initialPosts,
  initialPagination,
}: HomePageClientProps) => {
  const rootMargin = useDebugRootMargin()
  const router = useRouter()

  const {
    posts,
    nextCursor,
    hasNextPage,
    scrollPosition,
    setPosts,
    setPagination,
    setScrollPosition,
    addViewedPostIds,
    getExcludeIds,
    clearViewedPostIds,
    postHeights,
    setPostHeight,
  } = useHomeStoreSelectors()

  const [isInitialLoading, setIsInitialLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [containerHeight, setContainerHeight] = useState(0)
  const [columnWidth, setColumnWidth] = useState(DEFAULT_COLUMN_WIDTH)

  // 跟踪是否已经用 SSR 数据初始化过
  const hasHydratedRef = useRef(false)

  const handleTopNavClick = useCallback((tab: 'follow' | 'city') => {
    if (tab === 'follow') {
      toast.info('点击了关注')
      return
    }

    if (tab === 'city') {
      toast.info('点击了北京')
    }
  }, [])

  // 响应式宽度调整
  useEffect(() => {
    setContainerHeight(window.innerHeight)
    setColumnWidth((window.innerWidth - PADDING_AND_GAP) / 2)
  }, [])

  // SSR 数据初始化：只在首次且 store 为空时使用 initialPosts
  useEffect(() => {
    if (
      !hasHydratedRef.current &&
      posts.length === 0 &&
      initialPosts.length > 0
    ) {
      setPosts(initialPosts)
      const postIds = initialPosts.map(p => p._id)
      addViewedPostIds(postIds)

      const nextCursor = initialPagination?.nextCursor ?? null
      const hasNextPage =
        typeof initialPagination?.hasNextPage === 'boolean'
          ? initialPagination.hasNextPage
          : initialPosts.length >= FETCH_LIMIT

      setPagination(nextCursor, hasNextPage)
      hasHydratedRef.current = true
    }
  }, [
    initialPosts,
    initialPagination,
    posts.length,
    setPosts,
    addViewedPostIds,
    setPagination,
  ])

  // 使用 store 中的 posts，不再回退到 initialPosts
  // 这样确保从其他页面返回时，数据和布局保持一致
  const renderPosts = posts.length > 0 ? posts : initialPosts

  const isEmpty = useMemo(
    () => !renderPosts.length && !isInitialLoading,
    [renderPosts.length, isInitialLoading]
  )

  const fetchPosts = useCallback(
    async (options?: { cursor?: string | null; append?: boolean }) => {
      const { cursor, append = false } = options ?? {}
      setError(null)

      if (append) {
        setIsLoadingMore(true)
      } else {
        setIsInitialLoading(true)
      }

      try {
        const allExcludeIds = getExcludeIds()
        // 限制传递给后端的去重 ID 数量，防止 URL 过长
        const excludeIds = allExcludeIds.slice(-50)

        const { data } = await api.get<PostsResponse>('/posts', {
          params: {
            cursor: cursor ?? undefined,
            limit: FETCH_LIMIT,
            excludeIds:
              excludeIds.length > 0 ? excludeIds.join(',') : undefined,
          },
        })

        const fetchedPosts = data.posts ?? []

        // 记录本次获取的帖子 ID
        const newPostIds = fetchedPosts.map(p => p._id)
        if (newPostIds.length > 0) {
          addViewedPostIds(newPostIds)
        }

        if (!append) {
          setPosts(fetchedPosts)
        } else {
          setPosts(prevPosts => {
            const existingIds = new Set(prevPosts.map(p => p._id))
            const newPosts = fetchedPosts.filter(p => !existingIds.has(p._id))
            return [...prevPosts, ...newPosts]
          })
        }

        setPagination(
          data.pagination?.nextCursor ?? null,
          Boolean(data.pagination?.hasNextPage)
        )
      } catch (err) {
        console.error('Failed to fetch posts:', err)
        setError(
          err instanceof Error ? err.message : '获取帖子列表失败，请稍后再试'
        )
      } finally {
        if (append) {
          setIsLoadingMore(false)
        } else {
          setIsInitialLoading(false)
        }
      }
    },
    [setPagination, setPosts, addViewedPostIds, getExcludeIds]
  )

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const indicatorRef = useRef<HTMLDivElement>(null)
  const hasRestoredPosition = useRef(false)
  const observerTarget = useRef<HTMLDivElement>(null)

  // 恢复滚动位置
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container || columnWidth <= 0 || hasRestoredPosition.current) return

    if (scrollPosition > 0) {
      requestAnimationFrame(() => {
        container.scrollTop = scrollPosition
        hasRestoredPosition.current = true
      })
    } else {
      hasRestoredPosition.current = true
    }

    const observer = new ResizeObserver(entries => {
      if (entries[0]) {
        setContainerHeight(entries[0].contentRect.height)
      }
    })

    observer.observe(container)
    return () => observer.disconnect()
  }, [columnWidth, scrollPosition])

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.target as HTMLDivElement
      setScrollPosition(target.scrollTop)
    },
    [setScrollPosition]
  )

  const handlePostClick = useCallback(
    (postId: string) => {
      router.push(`/post/${postId}`)
    },
    [router]
  )

  const handleRefresh = useCallback(async () => {
    if (isInitialLoading) return
    clearViewedPostIds()
    await fetchPosts()
  }, [fetchPosts, isInitialLoading, clearViewedPostIds])

  const { state: pullState } = usePullToRefresh({
    containerRef: scrollContainerRef,
    indicatorRef,
    onRefresh: handleRefresh,
    disabled: isInitialLoading,
  })

  const handleLoadMore = useCallback(() => {
    if (!hasNextPage || isLoadingMore) return
    fetchPosts({ cursor: nextCursor, append: true })
  }, [fetchPosts, hasNextPage, isLoadingMore, nextCursor])

  // 无限滚动监听
  useEffect(() => {
    const element = observerTarget.current
    const root = scrollContainerRef.current
    if (!element || !hasNextPage || isLoadingMore) return

    const observer = new IntersectionObserver(
      entries => {
        const first = entries[0]
        if (first && first.isIntersecting) {
          handleLoadMore()
        }
      },
      {
        root: root || null,
        threshold: 0.1,
        rootMargin,
      }
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [hasNextPage, isLoadingMore, handleLoadMore, rootMargin])

  // 预计算高度
  const postsWithMeta = useMemo(() => {
    if (!columnWidth) return []
    return renderPosts.map(post => {
      const cachedHeight = postHeights[post._id]
      const estimatedHeight = calculatePostHeight(post, columnWidth)

      return {
        ...post,
        _estimatedHeight:
          typeof cachedHeight === 'number' && cachedHeight > 0
            ? cachedHeight
            : estimatedHeight,
      }
    })
  }, [renderPosts, columnWidth, postHeights])

  const renderPostItem = useCallback(
    (post: IPost & { _estimatedHeight: number }, index: number) => {
      return (
        <PostCard
          post={post}
          onClick={() => handlePostClick(post._id)}
          priority={index < PRIORITY_LIMIT}
          fetchPriority={index === 0 ? 'high' : undefined}
        />
      )
    },
    [handlePostClick]
  )

  const getPostKey = useCallback((post: IPost) => post._id, [])
  const estimatePostHeight = useCallback(
    (post: IPost & { _estimatedHeight: number }) => post._estimatedHeight,
    []
  )

  return (
    <div className="flex flex-col h-dvh overflow-hidden">
      {/* 顶部导航栏 */}
      <div className="flex-none z-10 border-b border-gray-100 bg-white px-4 py-2">
        <div className="flex items-center justify-center space-x-4 text-sm">
          <button
            type="button"
            className="px-2 text-gray-500"
            onClick={() => handleTopNavClick('follow')}
          >
            关注
          </button>
          <button
            type="button"
            className="px-2 text-lg text-black"
            onClick={() => handleTopNavClick('follow')}
          >
            发现
          </button>
          <button
            type="button"
            className="px-2 text-gray-500"
            onClick={() => handleTopNavClick('city')}
          >
            北京
          </button>
        </div>
      </div>

      {/* 发布进度横幅 */}
      <PublishingBanner />

      {/* 可滚动的内容区域 */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto pb-20"
        onScroll={handleScroll}
      >
        {/* 下拉刷新指示器 */}
        <PullToRefreshIndicator ref={indicatorRef} state={pullState} />

        {/* 首屏加载骨架屏 */}
        {isInitialLoading && !renderPosts.length ? <HomePageSkeleton /> : null}

        {/* 瀑布流容器 */}
        {!isEmpty && columnWidth > 0 && (
          <WaterfallContainer
            items={postsWithMeta}
            renderItem={renderPostItem}
            getItemKey={getPostKey}
            estimateHeight={estimatePostHeight}
            scrollTop={scrollPosition}
            containerHeight={containerHeight}
            initialHeights={postHeights}
            onHeightChange={setPostHeight}
          />
        )}

        {/* 错误提示 */}
        {error && renderPosts.length ? (
          <div className="px-4 pt-4">
            <div className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          </div>
        ) : null}

        {/* 底部加载状态 */}
        <div className="flex w-full justify-center px-4 py-6">
          {hasNextPage ? (
            <div
              ref={observerTarget}
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              {isLoadingMore ? (
                <>
                  <Spinner className="" />
                </>
              ) : (
                <span className="opacity-0">加载更多</span>
              )}
            </div>
          ) : renderPosts.length ? (
            <p className="text-xs text-muted-foreground">没有更多内容了</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

const HomePageClient = ({
  initialPosts,
  initialPagination,
}: HomePageClientProps) => {
  return (
    <HomePageContent
      initialPosts={initialPosts}
      initialPagination={initialPagination}
    />
  )
}

export default HomePageClient
