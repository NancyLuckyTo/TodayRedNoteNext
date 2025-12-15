import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { toast } from '@/components/ui/toast'
import { type IComment } from '@today-red-note/types'

/**
 * 添加评论的 Hook
 * @param postId 笔记 Id
 * @returns Mutation 对象，用于添加评论
 */
export const useAddComment = (postId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (content: string) => {
      const { data } = await api.post<IComment>(`/posts/${postId}/comments`, {
        content,
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] }) // 拉取最新的评论区
      toast.success('评论已发送')
    },
    onError: () => {
      toast.error('评论发送失败', { description: '请稍后重试' })
    },
  })
}
