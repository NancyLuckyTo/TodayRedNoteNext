import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import type { IPost } from '@today-red-note/types'
import { uploadImages } from '@/lib/postUtils'
import type { SelectedImage } from '@/hooks/useImageSelection'
import type { PostFormData } from '@/lib/postUtils'

interface CreatePostParams {
  data: PostFormData
  images: SelectedImage[]
  existingImages: string[] // 创建时通常为空，但也可能从草稿恢复
}

interface UseCreatePostOptions {
  onSuccess?: (post: IPost) => void
}

export const useCreatePost = (options: UseCreatePostOptions = {}) => {
  const router = useRouter()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ data, images, existingImages }: CreatePostParams) => {
      // 1. 上传新图片
      let uploadedImages: { url: string; width: number; height: number }[] = []
      if (images.length > 0) {
        try {
          uploadedImages = await uploadImages(images)
        } catch (error) {
          throw new Error('图片上传失败')
        }
      }

      // 2. 合并图片 (existingImages 通常只是 URL，缺少宽高，这里假设草稿恢复时只有 URL)
      // 如果需要宽高，draftStorage 需要存完整对象。这里简化处理，existingImages 视为 {url, width:0, height:0}
      const finalImages = [
        ...existingImages.map(url => ({ url, width: 0, height: 0 })),
        ...uploadedImages,
      ]

      // 3. 创建帖子
      const payload = {
        ...data,
        images: finalImages,
      }

      const res = await api.post<{ post: IPost }>('/posts', payload)
      return res.data.post
    },
    onSuccess: post => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      if (options.onSuccess) {
        options.onSuccess(post)
      } else {
        router.push('/')
      }
    },
    onError: (error: Error) => {
      console.error(error)
      // toast.error(error.message || '发布失败')
      // Let the caller handle UI feedback (e.g. Banner) to avoid double notifications
    },
  })
}
