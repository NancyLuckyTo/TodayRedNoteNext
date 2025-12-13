import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { toast } from '@/components/ui/toast'
import { type IComment } from '@today-red-note/types'

export const useAddComment = (postId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (content: string) => {
      const { data } = await api.post<{ comment: IComment }>(
        `/posts/${postId}/comments`,
        { content }
      )
      return data.comment
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] })
      toast.success('评论已发送')
    },
    onError: () => {
      toast.error('评论发送失败', { description: '请稍后重试' })
    },
  })
}
