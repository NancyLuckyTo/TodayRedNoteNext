import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { type IComment } from '@today-red-note/types'

/**
 * 获取笔记的评论
 * @param postId 笔记 Id
 * @param enabled 是否展开\获取评论区
 * @returns
 */
export const usePostComments = (postId: string, enabled: boolean) => {
  return useQuery({
    queryKey: ['comments', postId],
    enabled: Boolean(postId) && enabled,
    queryFn: async () => {
      const { data } = await api.get<IComment[]>(`/posts/${postId}/comments`)
      return data ?? []
    },
  })
}
