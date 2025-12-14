'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, Search, MoreHorizontal } from 'lucide-react'
import api from '@/lib/api'
import { Spinner } from '@/components/ui/spinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { normalizePost } from '@/lib/postUtils'
import type { IPost } from '@today-red-note/types'
import type { PostsResponse } from '@/types/posts'
import { PostDetailItem } from '@/features/post/components/PostDetailItem'

const ROOT_MARGIN_VALUE = '1200px'

interface PostDetailClientProps {
  post: IPost
}

export default function PostDetailClient({
  post: initialPost,
}: PostDetailClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  // 从 query param 获取是否禁用推荐
  const disableRecommendations =
    searchParams.get('disableRecommendations') === 'true'

  const [posts, setPosts] = useState<IPost[]>([normalizePost(initialPost)]) // 存储笔记列表
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 滚动加载相关
  const observerTarget = useRef<HTMLDivElement>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [shouldLoadRelated, setShouldLoadRelated] = useState(
    !disableRecommendations
  )

  // 分页相关状态
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [hasNextPage, setHasNextPage] = useState(true)
  const viewedPostIdsRef = useRef<Set<string>>(new Set([initialPost._id]))

  /**
   * 加载更多相关笔记（支持三阶段推荐：related -> profile -> fallback）
   */
  const loadMoreRelatedPosts = useCallback(async () => {
    if (
      disableRecommendations ||
      isLoadingMore ||
      !initialPost._id ||
      !hasNextPage
    )
      return

    try {
      setIsLoadingMore(true)

      // 构建 excludeIds 参数（排除已展示的笔记）
      const excludeIds = Array.from(viewedPostIdsRef.current)

      // 获取相关笔记（支持分页）
      const { data } = await api.get<PostsResponse>(
        `/posts/${initialPost._id}/related`,
        {
          params: {
            cursor: nextCursor ?? undefined,
            excludeIds:
              excludeIds.length > 0 ? excludeIds.join(',') : undefined,
          },
        }
      )

      const newPosts = (data.posts ?? []).map(normalizePost)

      // 记录本次获取的笔记 ID
      newPosts.forEach((p: IPost) => viewedPostIdsRef.current.add(p._id))

      // 过滤掉已存在的笔记
      setPosts(prev => {
        const existingIds = new Set(prev.map(p => p._id))
        const uniqueNewPosts = newPosts.filter(
          (p: IPost) => !existingIds.has(p._id)
        )
        return [...prev, ...uniqueNewPosts]
      })

      // 更新分页状态
      setNextCursor(data.pagination?.nextCursor ?? null)
      setHasNextPage(Boolean(data.pagination?.hasNextPage))
    } catch (err) {
      console.error('Failed to load related posts:', err)
    } finally {
      setIsLoadingMore(false)
    }
  }, [
    disableRecommendations,
    isLoadingMore,
    initialPost._id,
    hasNextPage,
    nextCursor,
  ])

  // 在初始笔记加载完成后，加载相关推荐
  useEffect(() => {
    if (!disableRecommendations && shouldLoadRelated && !loading) {
      loadMoreRelatedPosts()
      setShouldLoadRelated(false)
    }
  }, [disableRecommendations, shouldLoadRelated, loading, loadMoreRelatedPosts])

  /**
   * 监听滚动到底部
   */
  useEffect(() => {
    if (disableRecommendations || !hasNextPage) return

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !loading && !error && hasNextPage) {
          loadMoreRelatedPosts()
        }
      },
      { threshold: 0.1, rootMargin: ROOT_MARGIN_VALUE }
    )

    if (observerTarget.current) {
      observer.observe(observerTarget.current)
    }

    return () => observer.disconnect()
  }, [
    disableRecommendations,
    loadMoreRelatedPosts,
    loading,
    error,
    hasNextPage,
  ])

  // 加载中
  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <Spinner />
      </div>
    )
  }

  // 加载失败
  if (error) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4">
        <p className="text-destructive">{error || 'Post not found'}</p>
        <Button variant="outline" onClick={() => router.back()}>
          返回
        </Button>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* 顶部导航栏*/}
      <header className="sticky top-0 z-50 flex items-center justify-between bg-white px-4 py-2">
        {/* 返回按钮 */}
        <Button
          variant="ghost"
          size="icon"
          className="-ml-2 text-gray-500"
          onClick={() => router.back()}
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>

        {/* 搜索框 */}
        <div className="mx-4 flex flex-1 items-center rounded-full bg-secondary px-3 py-1.5">
          <Search className="mr-2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="搜你想看的"
            className="h-auto border-0 bg-transparent p-0 text-sm focus-visible:ring-0 placeholder:text-muted-foreground"
          />
        </div>

        {/* 右侧菜单按钮 */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="-mr-2 text-gray-500">
            <MoreHorizontal className="h-6 w-6" />
          </Button>
        </div>
      </header>

      {/* 笔记列表容器 */}
      <main className="flex-1 overflow-y-auto bg-gray-100">
        {posts.map((post, index) => (
          <PostDetailItem
            key={post._id}
            post={post}
            defaultCommentsOpen={index === 0}
          />
        ))}

        {/* 底部加载触发器 */}
        <div
          ref={observerTarget}
          className="flex h-10 items-center justify-center py-4"
        >
          {isLoadingMore && <Spinner className="h-4 w-4" />}
          {!hasNextPage && posts.length > 1 && (
            <span className="text-xs text-muted-foreground">
              没有更多内容了
            </span>
          )}
        </div>
      </main>
    </div>
  )
}
