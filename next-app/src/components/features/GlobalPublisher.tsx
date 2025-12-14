'use client'

import { useEffect, useRef } from 'react'
import { usePublishingStore } from '@/stores/publishingStore'
import { useCreatePost } from '@/hooks/useCreatePost'
import { draftStorage } from '@/lib/draftStorage'

/**
 * 全局发布管理器
 * 负责在后台执行发布任务，即使页面跳转也不会中断
 */
export const GlobalPublisher = () => {
  const { publishingTask, status, setSuccess, setError } = usePublishingStore()
  const { mutate: createPost } = useCreatePost()

  // 防止重复提交
  const isProcessingRef = useRef(false)

  useEffect(() => {
    // 只有当有任务且状态为 uploading 且当前没有在处理时才执行
    if (!publishingTask || status !== 'uploading' || isProcessingRef.current) {
      return
    }

    const processTask = async () => {
      isProcessingRef.current = true

      const { data, images, existingImages, draftId, cloudDraftId } =
        publishingTask

      createPost(
        {
          data,
          images,
          existingImages,
        },
        {
          onSuccess: async post => {
            // 发布成功，清理草稿
            if (draftId) {
              draftStorage.clearLocal()
            }
            if (cloudDraftId && draftStorage.isOnline()) {
              await draftStorage.deleteCloud(cloudDraftId)
            }

            setSuccess(post._id)
            isProcessingRef.current = false
          },
          onError: err => {
            console.error('GlobalPublisher error:', err)
            setError(err.message || '发布失败，请重试')
            isProcessingRef.current = false
          },
        }
      )
    }

    processTask()
  }, [publishingTask, status, createPost, setSuccess, setError])

  return null
}
