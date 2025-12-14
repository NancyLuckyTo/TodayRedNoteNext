import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from '@/components/ui/toast'
import api from '@/lib/api'
import type { IPost } from '@today-red-note/types'
import { uploadImages } from '@/lib/postUtils'
import type { SelectedImage } from '@/hooks/useImageSelection'
import type { PostFormData } from '@/lib/postUtils'

interface UpdatePostParams {
  postId: string
  data: PostFormData
  images: SelectedImage[]
  existingImages: string[] // 已有的图片 URL
}

interface UseUpdatePostOptions {
  onSuccess?: (post: IPost) => void
}

export const useUpdatePost = (options: UseUpdatePostOptions = {}) => {
  const router = useRouter()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      postId,
      data,
      images,
      existingImages,
    }: UpdatePostParams) => {
      // 1. 上传新图片
      let uploadedImages: { url: string; width: number; height: number }[] = []
      if (images.length > 0) {
        try {
          uploadedImages = await uploadImages(images)
        } catch (error) {
          console.log('Error in uploadImages', error)
          throw new Error('图片上传失败')
        }
      }

      // 2. 合并图片：保留的旧图 + 新上传的图
      // 注意：这里简单将旧图转为对象。后端 updatePost 会处理 applyImagesToTarget
      const finalImages = [
        ...existingImages.map(url => ({ url, width: 0, height: 0 })),
        ...uploadedImages,
      ]

      // 3. 更新帖子
      const payload = {
        ...data,
        images: finalImages,
      }

      const res = await api.put<{ post: IPost }>(`/posts/${postId}`, payload)
      return res.data.post
    },
    onSuccess: post => {
      toast.success('更新成功')
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      queryClient.invalidateQueries({ queryKey: ['post', post._id] })
      if (options.onSuccess) {
        options.onSuccess(post)
      } else {
        router.back()
      }
    },
    onError: (error: Error) => {
      console.error(error)
      toast.error(error.message || '更新失败')
    },
  })
}
