'use client'

import { useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, Search, MoreHorizontal } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { IPost } from '@today-red-note/types'
import { PostDetailItem } from '@/features/post/components/PostDetailItem'
import { useRelatedPosts } from '@/features/post/hooks/useRelatedPosts'

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

  const { posts, isLoadingMore, hasNextPage, loadMoreRelatedPosts } =
    useRelatedPosts({
      initialPost,
      disableRecommendations,
    })

  const observerTarget = useRef<HTMLDivElement>(null)
  const hasInitiatedLoad = useRef(false)

  // 在初始笔记加载完成后，加载相关推荐
  useEffect(() => {
    if (!disableRecommendations && !hasInitiatedLoad.current) {
      loadMoreRelatedPosts()
      hasInitiatedLoad.current = true
    }
  }, [disableRecommendations, loadMoreRelatedPosts])

  /**
   * 监听滚动到底部
   */
  useEffect(() => {
    if (disableRecommendations || !hasNextPage) return

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasNextPage) {
          loadMoreRelatedPosts()
        }
      },
      { threshold: 0.1, rootMargin: ROOT_MARGIN_VALUE }
    )

    if (observerTarget.current) {
      observer.observe(observerTarget.current)
    }

    return () => observer.disconnect()
  }, [disableRecommendations, loadMoreRelatedPosts, hasNextPage])

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
