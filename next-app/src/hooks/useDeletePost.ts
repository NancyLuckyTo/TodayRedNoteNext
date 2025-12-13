import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from '@/components/ui/toast'
import api from '@/lib/api'

interface UseDeletePostProps {
  onSuccess?: () => void
}

export const useDeletePost = ({ onSuccess }: UseDeletePostProps = {}) => {
  const router = useRouter()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (postId: string) => {
      await api.delete(`/posts/${postId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      toast.success('删除成功')
      if (onSuccess) onSuccess()
      router.push('/')
    },
    onError: () => {
      toast.error('删除失败', {
        description: '请稍后重试',
      })
    },
  })
}
