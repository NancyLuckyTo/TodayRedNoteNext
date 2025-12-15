import { useState, useRef, useCallback } from 'react'
import api from '@/lib/api'
import { normalizePost } from '@/lib/postUtils'
import type { IPost } from '@today-red-note/types'
import type { PostsResponse } from '@/types/posts'

interface UseRelatedPostsOptions {
  initialPost: IPost
  disableRecommendations?: boolean
}

export function useRelatedPosts({
  initialPost,
  disableRecommendations = false,
}: UseRelatedPostsOptions) {
  const [posts, setPosts] = useState<IPost[]>([normalizePost(initialPost)])
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [hasNextPage, setHasNextPage] = useState(true)

  // Use a ref to track viewed IDs to avoid re-renders and dependency cycles
  const viewedPostIdsRef = useRef<Set<string>>(new Set([initialPost._id]))

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

      // Build excludeIds param
      const excludeIds = Array.from(viewedPostIdsRef.current)

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

      // Record new IDs
      newPosts.forEach((p: IPost) => viewedPostIdsRef.current.add(p._id))

      // Update posts state with deduping
      setPosts(prev => {
        const existingIds = new Set(prev.map(p => p._id))
        const uniqueNewPosts = newPosts.filter(
          (p: IPost) => !existingIds.has(p._id)
        )
        return [...prev, ...uniqueNewPosts]
      })

      // Update pagination state
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

  return {
    posts,
    isLoadingMore,
    hasNextPage,
    loadMoreRelatedPosts,
  }
}
