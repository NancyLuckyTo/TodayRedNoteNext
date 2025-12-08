import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'

type Comment = {
  _id: string
  post: string
  author: {
    _id: string
    username: string
    avatar?: string
  }
  content: string
  createdAt: string
  updatedAt: string
}

export const usePostComments = (postId: string, enabled: boolean) => {
  return useQuery({
    queryKey: ['comments', postId],
    enabled: Boolean(postId) && enabled,
    queryFn: async () => {
      const { data } = await api.get<{ comments: Comment[] }>(
        `/posts/${postId}/comments`
      )
      return data.comments ?? []
    },
  })
}
