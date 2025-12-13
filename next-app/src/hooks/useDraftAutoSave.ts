import { useState, useEffect, useCallback, useRef } from 'react'
import type { IDraft } from '@today-red-note/types'
import { draftStorage, isBodyEmpty } from '@/lib/draftStorage'
import type { SelectedImage } from '@/hooks/useImageSelection'
import { uploadImages } from '@/lib/postUtils'

const AUTO_SAVE_INTERVAL = 5000 // 自动保存间隔 5s

export interface UseDraftAutoSaveProps {
  enabled?: boolean
  onSaveSuccess?: () => void
  onSaveError?: () => void
  onImagesUploaded?: (urls: string[]) => void
}

/**
 * 判断编辑器内容是否为空
 */
export const isEditorContentEmpty = (content: {
  body: string
  topic?: string
  images: SelectedImage[]
  existingImages: string[]
}) => {
  return (
    isBodyEmpty(content.body) &&
    !content.topic &&
    content.images.length === 0 &&
    content.existingImages.length === 0
  )
}

export const useDraftAutoSave = ({
  enabled = true,
  onSaveSuccess,
  onSaveError,
  onImagesUploaded,
}: UseDraftAutoSaveProps = {}) => {
  const [draft, setDraft] = useState<IDraft | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [isOnline, setIsOnline] = useState(true)

  // 使用 ref 保存最新内容，供定时器访问
  const contentRef = useRef<{
    body: string
    topic?: string
    images: SelectedImage[]
    existingImages: string[]
  }>({
    body: '',
    topic: '',
    images: [],
    existingImages: [],
  })

  // 监听在线状态
  useEffect(() => {
    setIsOnline(draftStorage.isOnline())
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // 加载草稿
  const loadDraft = useCallback(async () => {
    // 优先读取本地草稿
    let local = draftStorage.getLocal()
    const cloud = await draftStorage.getCloud()

    // 冲突解决策略：如果云端草稿更新，询问用户是否覆盖
    // 这里简化为：如果本地没有，用云端；如果本地有但云端更新，提示用户（这里暂未实现复杂弹窗，简单取云端作为基准如果云端时间更新）
    // 简单实现：如果云端存在且 updatedAt 比本地新，使用云端
    if (cloud) {
      if (!local || new Date(cloud.updatedAt) > new Date(local.updatedAt)) {
        local = {
          id: cloud._id,
          cloudId: cloud._id,
          user: cloud.user,
          body: cloud.body,
          topic: cloud.topic,
          uploadedImages: cloud.images,
          localImages: [],
          updatedAt: new Date(cloud.updatedAt).getTime(),
        }
        // 更新本地副本
        draftStorage.saveLocal(local)
      }
    }

    if (local) {
      setDraft(local)
      return local
    }
    return null
  }, [])

  // 核心保存逻辑
  const performSave = useCallback(async () => {
    if (!contentRef.current || !enabled) return

    const { body, topic, images, existingImages } = contentRef.current
    const currentIsDirty = isDirty

    // 内容为空时不保存
    if (isEditorContentEmpty(contentRef.current)) return

    setIsSaving(true)

    try {
      // 1. 处理图片上传 (如果有新图片且在线)
      let uploadedUrls: string[] = []
      if (images.length > 0 && draftStorage.isOnline()) {
        try {
          const result = await uploadImages(images)
          uploadedUrls = result.map(img => img.url)
          if (onImagesUploaded) {
            onImagesUploaded(uploadedUrls)
          }
        } catch (e) {
          console.error('草稿图片上传失败', e)
          // 图片上传失败，仅保存正文和已有图片
        }
      }

      // 2. 构建草稿对象
      const newDraft: IDraft = {
        id: draft?.id || draftStorage.generateId(),
        cloudId: draft?.cloudId,
        user: 'current', // 会在服务端覆盖
        body,
        topic,
        uploadedImages: [...existingImages, ...uploadedUrls],
        localImages: [], // 这里简化处理，不存储 File 对象到 localStorage
        updatedAt: Date.now(),
      }

      // 3. 保存到本地
      draftStorage.saveLocal(newDraft)

      // 4. 同步到云端 (如果在线)
      if (draftStorage.isOnline()) {
        const cloudDraft = await draftStorage.saveCloud(newDraft)
        if (cloudDraft) {
          // 更新 cloudId
          newDraft.cloudId = cloudDraft._id
          // 再次更新本地，确保 cloudId 同步
          draftStorage.saveLocal(newDraft)
        }
      }

      setDraft(newDraft)
      setIsDirty(false)
      onSaveSuccess?.()
    } catch (error) {
      console.error('Auto save failed', error)
      onSaveError?.()
    } finally {
      setIsSaving(false)
    }
  }, [draft, enabled, isDirty, onImagesUploaded, onSaveSuccess, onSaveError])

  // 定时自动保存
  useEffect(() => {
    if (!enabled) return

    const timer = setInterval(() => {
      if (isDirty) {
        performSave()
      }
    }, AUTO_SAVE_INTERVAL)

    return () => clearInterval(timer)
  }, [enabled, isDirty, performSave])

  // 更新内容引用，标记脏状态
  const updateDraft = useCallback(
    (content: {
      body: string
      topic?: string
      images: SelectedImage[]
      existingImages: string[]
    }) => {
      contentRef.current = content
      setIsDirty(true)
    },
    []
  )

  // 手动保存
  const saveDraftNow = useCallback(
    async (content: {
      body: string
      topic?: string
      images: SelectedImage[]
      existingImages: string[]
    }) => {
      contentRef.current = content
      await performSave()
    },
    [performSave]
  )

  // 清除草稿
  const clearDraft = useCallback(async () => {
    draftStorage.clearLocal()
    if (draft?.cloudId && draftStorage.isOnline()) {
      await draftStorage.deleteCloud(draft.cloudId)
    }
    setDraft(null)
    setIsDirty(false)
  }, [draft])

  return {
    draft,
    isSaving,
    isDirty,
    isOnline,
    loadDraft,
    updateDraft,
    saveDraftNow,
    clearDraft,
  }
}
