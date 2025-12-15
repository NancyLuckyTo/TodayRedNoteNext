import { useState, useRef, useCallback } from 'react'
import api from '@/lib/api'
import { normalizePost } from '@/lib/postUtils'
import type { IPost } from '@today-red-note/types'
import type { PostsResponse } from '@/types/posts'

interface UseRelatedPostsOptions {
  initialPost: IPost
  disableRecommendations?: boolean // 是否禁用推荐，用于从个人主页点开笔记详情卡片
}

export function useRelatedPosts({
  initialPost,
  disableRecommendations = false,
}: UseRelatedPostsOptions) {
  const [posts, setPosts] = useState<IPost[]>([normalizePost(initialPost)]) // 笔记列表
  const [isLoadingMore, setIsLoadingMore] = useState(false) // 加载状态
  const [nextCursor, setNextCursor] = useState<string | null>(null) // 下一页游标
  const [hasNextPage, setHasNextPage] = useState(true) // 是否还有下一页

  const viewedPostIdsRef = useRef<Set<string>>(new Set([initialPost._id])) // 已查看的笔记 ID 集合

  const loadMoreRelatedPosts = useCallback(async () => {
    if (
      disableRecommendations || // 如果被禁用
      isLoadingMore || // 如果正在加载中
      !initialPost._id || // 如果当前笔记 ID 不存在
      !hasNextPage // 如果没有下一页
    )
      return

    try {
      setIsLoadingMore(true) // 开启加载锁

      const excludeIds = Array.from(viewedPostIdsRef.current) // 将 Set 转换为数组，准备传给后端

      const { data } = await api.get<PostsResponse>(
        `/posts/${initialPost._id}/related`, // 获取相关笔记
        {
          params: {
            cursor: nextCursor ?? undefined,
            excludeIds:
              excludeIds.length > 0 ? excludeIds.join(',') : undefined, // “相关推荐”不重复
          },
        }
      )

      const newPosts = (data.posts ?? []).map(normalizePost)

      newPosts.forEach((p: IPost) => viewedPostIdsRef.current.add(p._id)) // 记录新笔记 ID 到 Ref 中

      setPosts(prev => [...prev, ...newPosts])

      setNextCursor(data.pagination?.nextCursor ?? null) // 更新分页游标，用于下一次请求
      setHasNextPage(Boolean(data.pagination?.hasNextPage)) // 更新是否有下一页的状态，用于控制加载更多按钮的显示
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

  return {
    posts,
    isLoadingMore,
    hasNextPage,
    loadMoreRelatedPosts,
  }
}
