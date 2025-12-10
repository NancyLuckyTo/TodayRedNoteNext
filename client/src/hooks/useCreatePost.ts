import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { uploadImages, type PostFormData } from '@/lib/postUtils'
import type { SelectedImage } from './useImageSelection'
import { usePublishingStore } from '@/stores/publishingStore'

interface UseCreatePostProps {
  onSuccess?: () => void
}

export const useCreatePost = ({ onSuccess }: UseCreatePostProps = {}) => {
  const queryClient = useQueryClient()
  const { updateProgress, updateCoverImage, setSuccess, setError } =
    usePublishingStore()

  return useMutation({
    mutationFn: async ({
      data,
      images,
      existingImages = [],
    }: {
      data: PostFormData
      images: SelectedImage[]
      existingImages?: string[] // 草稿中已上传的图片 URL
    }) => {
      // 模拟进度：初始状态 (10%)
      updateProgress(10)

      // 上传图片阶段
      const uploadedImages = await uploadImages(images)

      // 图片上传完成 (70%)
      updateProgress(70)

      // 更新封面图为真实 CDN URL（解决 blob URL 被 revoke 的问题）
      const firstUploadedUrl = uploadedImages[0]?.url || existingImages[0]
      if (firstUploadedUrl) {
        updateCoverImage(firstUploadedUrl)
      }
      const allImages = [
        ...existingImages.map(url => ({ url, width: 0, height: 0 })),
        ...uploadedImages,
      ]

      // 更新进度到 90%（API 调用中）
      updateProgress(90)

      const postRes = await api.post('/posts', {
        body: data.body,
        bodyPreview: data.bodyPreview,
        images: allImages,
        topic: data.topic?.trim() || undefined,
      })

      // 更新进度到 100%
      updateProgress(100)

      return postRes.data
    },
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      // 设置发布成功状态，保存 postId
      setSuccess(data.post._id)
      onSuccess?.()
    },
    onError: error => {
      const errorMessage = error instanceof Error ? error.message : '请稍后重试'
      setError(`发布失败: ${errorMessage}`)
    },
  })
}
