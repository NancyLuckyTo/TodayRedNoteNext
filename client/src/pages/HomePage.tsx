import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { WaterfallContainer } from '../components/WaterfallContainer'
import { PostCard } from '../components/PostCard'
import { PullToRefreshIndicator } from '@/components/PullToRefreshIndicator'
import api from '@/lib/api'
import type { PostsResponse } from '@/types/posts'
import { calculatePostHeight, normalizePost } from '@/lib/postUtils'
import { Spinner } from '@/components/ui/spinner'
import { HomePageSkeleton } from '@/components/PostCardSkeleton'
import { useHomeStore } from '@/stores/homeStore'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { PublishingBanner } from '@/components/PublishingBanner'
import { useDebugRootMargin } from '@/hooks/useDebugRootMargin'
import { FETCH_LIMIT, PRIORITY_LIMIT } from '@today-red-note/types'

// 声明 window 上的预取数据类型
declare global {
  interface Window {
    __PREFETCH_POSTS__?: Promise<PostsResponse | null>
  }
}

const HomePage = () => {
  // 开发环境可通过 window.__setRootMargin('0px 0px 200px 0px') 实时调试
  const rootMargin = useDebugRootMargin()

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
  } = useHomeStore()

  const [isInitialLoading, setIsInitialLoading] = useState(false) // 首次加载状态
  const [isLoadingMore, setIsLoadingMore] = useState(false) // 加载更多状态
  const [error, setError] = useState<string | null>(null)

  // 移动端竖屏场景，宽度固定，直接计算一次
  // 逻辑：(屏幕宽度 - 左右padding 8px - 中间gap 4px) / 2
  const columnWidth = (window.innerWidth - 12) / 2

  // 计算属性，判断页面是否为空（既没数据也没在加载）
  const isEmpty = useMemo(
    () => !posts.length && !isInitialLoading,
    [posts, isInitialLoading]
  )

  const fetchPosts = useCallback(
    async (options?: { cursor?: string | null; append?: boolean }) => {
      const { cursor, append = false } = options ?? {}
      setError(null)

      // 根据是“刷新”还是“加载更多”设置不同的 Loading 状态
      if (append) {
        setIsLoadingMore(true)
      } else {
        setIsInitialLoading(true)
      }

      try {
        // 获取需要排除的帖子 ID（已展示过的 + 当前展示的）
        const excludeIds = getExcludeIds()

        const { data } = await api.get<PostsResponse>('/posts', {
          params: {
            cursor: cursor ?? undefined,
            limit: FETCH_LIMIT,
            // 传递排除 ID，用于避免重复展示
            excludeIds:
              excludeIds.length > 0 ? excludeIds.join(',') : undefined,
          },
        })

        // 清洗数据
        const normalizedPosts = (data.posts ?? []).map(normalizePost)

        // 记录本次获取的帖子 ID 到已浏览列表
        const newPostIds = normalizedPosts.map(p => p._id)
        if (newPostIds.length > 0) {
          addViewedPostIds(newPostIds)
        }

        if (!append) {
          setPosts(normalizedPosts)
        } else {
          setPosts(prevPosts => {
            // 获取现有列表中所有的 ID，存入 Set
            const existingIds = new Set(prevPosts.map(p => p._id))
            // 过滤掉新数据中已存在的 ID
            const newPosts = normalizedPosts.filter(
              p => !existingIds.has(p._id)
            )
            // 合并数据
            return [...prevPosts, ...newPosts]
          })
        }

        // 更新分页信息
        setPagination(
          data.pagination?.nextCursor ?? null,
          Boolean(data.pagination?.hasNextPage)
        )
      } catch (err) {
        console.error(err)
        setError(
          err instanceof Error ? err.message : '获取帖子列表失败，请稍后再试'
        )
      } finally {
        // 关闭对应 Loading 状态
        if (append) {
          setIsLoadingMore(false)
        } else {
          setIsInitialLoading(false)
        }
      }
    },
    [setPagination, setPosts, addViewedPostIds, getExcludeIds]
  )

  // 初始化，组件挂载时优先使用预取数据，否则请求第一页
  useEffect(() => {
    if (posts.length > 0) return

    const initializeData = async () => {
      // 优先使用 HTML 中预取的数据
      if (window.__PREFETCH_POSTS__) {
        try {
          setIsInitialLoading(true)
          const prefetchedData = await window.__PREFETCH_POSTS__
          // 清除预取数据，避免重复使用
          window.__PREFETCH_POSTS__ = undefined

          if (prefetchedData?.posts?.length) {
            const normalizedPosts = prefetchedData.posts.map(normalizePost)
            const newPostIds = normalizedPosts.map(p => p._id)
            if (newPostIds.length > 0) {
              addViewedPostIds(newPostIds)
            }
            setPosts(normalizedPosts)
            setPagination(
              prefetchedData.pagination?.nextCursor ?? null,
              Boolean(prefetchedData.pagination?.hasNextPage)
            )
            setIsInitialLoading(false)
            return
          }
        } catch (err) {
          console.warn('Prefetch data failed, falling back to fetch:', err)
        } finally {
          setIsInitialLoading(false)
        }
      }

      // 回退到普通请求
      fetchPosts()
    }

    initializeData()
  }, [fetchPosts, posts.length, addViewedPostIds, setPagination, setPosts])

  // 滚动容器 ref
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  // 下拉刷新指示器 ref
  const indicatorRef = useRef<HTMLDivElement>(null)

  // 恢复滚动位置
  useEffect(() => {
    if (scrollContainerRef.current && scrollPosition > 0) {
      scrollContainerRef.current.scrollTop = scrollPosition
    }
    // eslint-disable-next-line
  }, [])

  // 监听滚动保存位置
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.target as HTMLDivElement
      setScrollPosition(target.scrollTop)
    },
    [setScrollPosition]
  )

  const navigate = useNavigate()

  /**
   * 点击卡片事件
   */
  const handlePostClick = useCallback(
    (postId: string) => {
      navigate(`/post/${postId}`)
    },
    [navigate]
  )

  /**
   * 下拉刷新
   */
  const handleRefresh = useCallback(async () => {
    if (isInitialLoading) return
    // 清空已浏览记录，获取全新内容
    clearViewedPostIds()
    await fetchPosts()
  }, [fetchPosts, isInitialLoading, clearViewedPostIds])

  // 下拉刷新 Hook
  const { state: pullState } = usePullToRefresh({
    containerRef: scrollContainerRef,
    indicatorRef,
    onRefresh: handleRefresh,
    disabled: isInitialLoading,
  })

  /**
   * 加载更多
   */
  const handleLoadMore = useCallback(() => {
    if (!hasNextPage || isLoadingMore) return // 没数据或正在加载则不执行
    fetchPosts({ cursor: nextCursor, append: true })
  }, [fetchPosts, hasNextPage, isLoadingMore, nextCursor])

  // 滚动加载的监听 ref 绑定在页面最底部的一个 div 上
  const observerTarget = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = observerTarget.current
    const root = scrollContainerRef.current
    // 如果没有元素、没有下一页、或者正在加载，就不监听
    if (!element || !hasNextPage || isLoadingMore) return

    const observer = new IntersectionObserver(
      entries => {
        const first = entries[0]
        // 当底部元素进入预留区域时
        if (first && first.isIntersecting) {
          handleLoadMore() // 触发加载更多
        }
      },
      {
        root: root || null,
        threshold: 0.1,
        rootMargin,
      }
    )

    observer.observe(element)
    return () => observer.disconnect() // 组件卸载或依赖变化时销毁监听
  }, [hasNextPage, isLoadingMore, handleLoadMore, rootMargin])

  return (
    <div className="flex flex-col h-dvh overflow-hidden bg-gray-100">
      {/* 顶部导航栏 */}
      <div className="flex-none z-10 bg-background border-b px-4 py-2">
        <div className="flex items-center justify-center">
          <h1 className="text-base font-normal">发现</h1>
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

        {/* 首屏加载时显示骨架屏，与 HTML 骨架屏视觉一致，避免跳跃 */}
        {isInitialLoading && !posts.length ? <HomePageSkeleton /> : null}

        {/* 瀑布流容器 */}
        {!isEmpty && (
          <WaterfallContainer>
            {posts.map((post, index) => (
              <PostCard
                key={post._id}
                post={post}
                onClick={() => handlePostClick(post._id)}
                // 将计算好的列宽传入，算出卡片高度，传给 WaterfallContainer 进行布局
                data-waterfall-height={calculatePostHeight(post, columnWidth)}
                priority={index < PRIORITY_LIMIT}
              />
            ))}
          </WaterfallContainer>
        )}

        {/* 底部错误提示 */}
        {error && posts.length ? (
          <div className="px-4 pt-4">
            <div className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          </div>
        ) : null}

        <div className="flex w-full justify-center px-4 py-6">
          {/* 无限滚动触发器 */}
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
          ) : posts.length ? (
            <p className="text-xs text-muted-foreground">没有更多内容了</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default HomePage
