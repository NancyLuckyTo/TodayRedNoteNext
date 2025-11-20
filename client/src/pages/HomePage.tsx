import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { WaterfallContainer } from '../components/WaterfallContainer'
import { PostCard } from '../components/PostCard'
import api from '@/lib/api'
import type { IPost } from '@today-red-note/types'
import { calculatePostHeight, normalizePost } from '@/lib/post-utils'
import { Spinner } from '@/components/ui/spinner'

type BackendPostsResponse = {
  posts: IPost[]
  pagination?: {
    nextCursor: string | null
    hasNextPage: boolean
    limit: number
  }
}

const FETCH_LIMIT = 10
const ROOT_MARGIN_VALUE = '250px'

const HomePage = () => {
  const [posts, setPosts] = useState<IPost[]>([]) // 笔记列表
  const [nextCursor, setNextCursor] = useState<string | null>(null) // 分页游标
  const [hasNextPage, setHasNextPage] = useState(false) // 是否还有下一页
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
        const { data } = await api.get<BackendPostsResponse>('/posts', {
          params: {
            cursor: cursor ?? undefined,
            limit: FETCH_LIMIT,
          },
        })

        // 清洗数据
        const normalizedPosts = (data.posts ?? []).map(normalizePost)

        setPosts(prev => {
          // 如果不是追加模式，如下拉刷新，直接替换整个列表
          if (!append) return normalizedPosts

          // 获取现有列表中所有的 ID，存入 Set
          const existingIds = new Set(prev.map(p => p._id))
          // 过滤掉新数据中已存在的 ID
          const newPosts = normalizedPosts.filter(p => !existingIds.has(p._id))
          // 合并数据
          return [...prev, ...newPosts]
        })

        // 更新分页信息
        setNextCursor(data.pagination?.nextCursor ?? null)
        setHasNextPage(Boolean(data.pagination?.hasNextPage))
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
    []
  )

  // 初始化，组件挂载时请求第一页数
  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

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
  const handleRefresh = useCallback(() => {
    if (isInitialLoading) return
    fetchPosts()
  }, [fetchPosts, isInitialLoading])

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
    // 如果没有元素、没有下一页、或者正在加载，就不监听
    if (!element || !hasNextPage || isLoadingMore) return

    const observer = new IntersectionObserver(
      entries => {
        // 当底部元素进入视口时
        if (entries[0].isIntersecting) {
          handleLoadMore() // 触发加载更多
        }
      },
      { threshold: 0.1, rootMargin: ROOT_MARGIN_VALUE }
    )

    observer.observe(element)
    return () => observer.disconnect() // 组件卸载或依赖变化时销毁监听
  }, [hasNextPage, isLoadingMore, handleLoadMore])

  return (
    <div className="min-h-screen pb-10">
      {/* 顶部导航栏 */}
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-2">
        <div className="flex items-center justify-center">
          <h1 className="text-">发现</h1>
        </div>
      </div>

      {isInitialLoading && !posts.length ? (
        <div className="flex justify-center items-center py-10">
          <Spinner />
        </div>
      ) : null}

      {/* 瀑布流容器 */}
      {!isEmpty && (
        <WaterfallContainer>
          {posts.map(post => (
            <PostCard
              key={post._id}
              post={post}
              onClick={() => handlePostClick(post._id)}
              // 将计算好的列宽传入，算出卡片高度，传给 WaterfallContainer 进行布局
              data-waterfall-height={calculatePostHeight(post, columnWidth)}
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

      <div className="flex w-full bg-gray-100 justify-center px-4 py-6">
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
  )
}

export default HomePage
