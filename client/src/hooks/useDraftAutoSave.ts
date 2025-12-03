import { useEffect, useRef, useCallback, useState } from 'react'
import type { IDraft } from '@today-red-note/types'
import {
  draftStorage,
  isStoredDraftEmpty,
  isBodyEmpty,
} from '@/lib/draftStorage'
import { uploadImages } from '@/lib/postUtils'
import type { SelectedImage } from './useImageSelection'

const AUTO_SAVE_INTERVAL = 5000 // 5秒自动保存

export interface DraftContent {
  body: string
  topic?: string
  images: SelectedImage[]
  existingImages?: string[]
}

/**
 * 检查编辑器内容是否为空（表单状态）
 */
export const isEditorContentEmpty = (content: DraftContent): boolean => {
  const hasBody = !isBodyEmpty(content.body)
  const hasExistingImages =
    content.existingImages && content.existingImages.length > 0
  const hasNewImages = content.images && content.images.length > 0
  return !hasBody && !hasExistingImages && !hasNewImages
}

interface UseDraftAutoSaveOptions {
  // 是否启用自动保存（二次编辑模式下不需要）
  enabled?: boolean
  // 保存成功回调
  onSaveSuccess?: () => void
  // 保存失败回调
  onSaveError?: (error: Error) => void
  // 图片上传成功回调，返回新上传的图片 URL 列表
  onImagesUploaded?: (uploadedUrls: string[]) => void
}

interface UseDraftAutoSaveReturn {
  // 当前草稿数据
  draft: IDraft | null
  // 是否正在保存
  isSaving: boolean
  // 是否有未同步的修改
  isDirty: boolean
  // 是否在线
  isOnline: boolean
  // 加载草稿（优先本地，其次云端）
  loadDraft: () => Promise<IDraft | null>
  // 立即保存草稿（本地 + 云端）
  saveDraftNow: (content: DraftContent) => Promise<void>
  // 更新草稿内容（触发自动保存）
  updateDraft: (content: DraftContent) => void
  // 清除草稿
  clearDraft: () => Promise<void>
}

export const useDraftAutoSave = (
  options: UseDraftAutoSaveOptions = {}
): UseDraftAutoSaveReturn => {
  const {
    enabled = true,
    onSaveSuccess,
    onSaveError,
    onImagesUploaded,
  } = options

  const [draft, setDraft] = useState<IDraft | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [isOnline, setIsOnline] = useState(draftStorage.isOnline())

  // 用于追踪最新内容的 ref
  const contentRef = useRef<DraftContent | null>(null)
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingSyncRef = useRef(false)
  const syncToCloudRef = useRef<
    ((content: DraftContent) => Promise<void>) | null
  >(null)

  // 监听网络状态变化
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      // 恢复网络后，如果有待同步的修改，立即同步
      if (
        pendingSyncRef.current &&
        contentRef.current &&
        syncToCloudRef.current
      ) {
        syncToCloudRef.current(contentRef.current)
      }
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // 同步到云端（包含图片上传）
  const syncToCloud = useCallback(
    async (content: DraftContent) => {
      if (!draftStorage.isOnline()) {
        pendingSyncRef.current = true
        return
      }

      const isEmpty = isEditorContentEmpty(content)

      // 如果内容为空，不保存草稿，但如果已有云端草稿则删除
      if (isEmpty) {
        if (draft?.cloudId) {
          await draftStorage.deleteCloud(draft.cloudId)
          draftStorage.clearLocal()
          setDraft(null)
          setIsDirty(false)
        }
        return
      }

      const currentDraft = draft || {
        id: draftStorage.generateId(),
        body: '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      // 收集所有已上传的图片 URL
      let allUploadedImages = [...(content.existingImages || [])]

      // 如果有新图片，先上传到云端
      if (content.images.length > 0) {
        try {
          const uploadedResults = await uploadImages(content.images)
          const newImageUrls = uploadedResults.map(img => img.url)
          allUploadedImages = [...allUploadedImages, ...newImageUrls]
          // 通知调用方图片已上传成功
          onImagesUploaded?.(newImageUrls)
        } catch (error) {
          console.error('草稿图片上传失败:', error)
          // 图片上传失败时，标记为待同步，下次重试
          pendingSyncRef.current = true
          onSaveError?.(error as Error)
          return
        }
      }

      const updatedDraft: IDraft = {
        ...currentDraft,
        body: content.body,
        topic: content.topic,
        uploadedImages: allUploadedImages,
        localImages: [], // 图片已上传，清空本地图片
        updatedAt: Date.now(),
        isDirty: false,
      }

      try {
        const cloudDraft = await draftStorage.saveCloud(updatedDraft)
        if (cloudDraft) {
          updatedDraft.cloudId = cloudDraft._id
          updatedDraft.lastSyncedAt = Date.now()
          pendingSyncRef.current = false
          setIsDirty(false)
          onSaveSuccess?.()
        }
      } catch (error) {
        pendingSyncRef.current = true
        onSaveError?.(error as Error)
      }

      // 更新本地存储
      draftStorage.saveLocal(updatedDraft)
      setDraft(updatedDraft)
    },
    [draft, onSaveSuccess, onSaveError, onImagesUploaded]
  )

  // 更新 syncToCloud ref
  useEffect(() => {
    syncToCloudRef.current = syncToCloud
  }, [syncToCloud])

  // 保存到本地（包含图片的 base64）
  const saveToLocal = useCallback(
    async (content: DraftContent) => {
      const isEmpty = isEditorContentEmpty(content)

      // 如果内容为空，清除本地草稿
      if (isEmpty) {
        draftStorage.clearLocal()
        setDraft(null)
        setIsDirty(false)
        return
      }

      const currentDraft = draft || {
        id: draftStorage.generateId(),
        body: '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      // 将新图片转换为 base64 保存到本地
      const localImages = await Promise.all(
        content.images.map(async img => ({
          base64: await draftStorage.fileToBase64(img.file),
          name: img.file.name,
          type: img.file.type,
          width: img.width,
          height: img.height,
        }))
      )

      const updatedDraft: IDraft = {
        ...currentDraft,
        body: content.body,
        topic: content.topic,
        uploadedImages: content.existingImages || [],
        localImages,
        updatedAt: Date.now(),
        isDirty: true,
      }

      draftStorage.saveLocal(updatedDraft)
      setDraft(updatedDraft)
      setIsDirty(true)
    },
    [draft]
  )

  // 加载草稿（优先本地，其次云端）
  const loadDraft = useCallback(async (): Promise<IDraft | null> => {
    // 1. 先尝试读取本地草稿
    const localDraft = draftStorage.getLocal()

    if (localDraft) {
      setDraft(localDraft)
      setIsDirty(localDraft.isDirty || false)

      // 如果本地草稿有未同步的修改且在线，尝试同步
      if (localDraft.isDirty && draftStorage.isOnline()) {
        pendingSyncRef.current = true
      }

      return localDraft
    }

    // 2. 本地没有，尝试从云端获取
    if (draftStorage.isOnline()) {
      const cloudDraft = await draftStorage.getCloud()
      if (cloudDraft) {
        const draft: IDraft = {
          id: draftStorage.generateId(),
          cloudId: cloudDraft._id,
          body: cloudDraft.body,
          topic: cloudDraft.topic,
          uploadedImages: cloudDraft.images || [],
          createdAt: new Date(cloudDraft.createdAt).getTime(),
          updatedAt: new Date(cloudDraft.updatedAt).getTime(),
          lastSyncedAt: Date.now(),
          isDirty: false,
        }
        draftStorage.saveLocal(draft)
        setDraft(draft)
        return draft
      }
    }

    return null
  }, [])

  // 更新草稿内容（触发自动保存）
  const updateDraft = useCallback(
    (content: DraftContent) => {
      if (!enabled) return

      // 检查内容是否为空
      const isEmpty = isEditorContentEmpty(content)

      // 如果内容为空且当前没有草稿（或当前草稿也是空的），不要启动自动保存定时器
      // 这样可以防止页面刚加载时（编辑器初始化产生空内容）就触发保存
      if (isEmpty && (!draft || isStoredDraftEmpty(draft))) {
        contentRef.current = content
        return
      }

      contentRef.current = content

      // 清除之前的定时器
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }

      // 设置新的自动保存定时器
      autoSaveTimerRef.current = setTimeout(async () => {
        if (!contentRef.current) return

        setIsSaving(true)
        try {
          // 先保存到本地
          await saveToLocal(contentRef.current)

          // 如果在线，同步到云端
          if (draftStorage.isOnline()) {
            await syncToCloud(contentRef.current)
          }
        } finally {
          setIsSaving(false)
        }
      }, AUTO_SAVE_INTERVAL)
    },
    [enabled, saveToLocal, syncToCloud, draft]
  )

  // 立即保存草稿（退出时调用）
  const saveDraftNow = useCallback(
    async (content: DraftContent) => {
      // 清除自动保存定时器
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
        autoSaveTimerRef.current = null
      }

      setIsSaving(true)
      try {
        // 保存到本地
        await saveToLocal(content)

        // 如果在线，同步到云端
        if (draftStorage.isOnline()) {
          await syncToCloud(content)
        }
      } finally {
        setIsSaving(false)
      }
    },
    [saveToLocal, syncToCloud]
  )

  // 清除草稿
  const clearDraft = useCallback(async () => {
    // 清除定时器
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
      autoSaveTimerRef.current = null
    }

    // 清除本地草稿
    draftStorage.clearLocal()

    // 如果在线且有云端草稿，删除云端草稿
    if (draft?.cloudId && draftStorage.isOnline()) {
      await draftStorage.deleteCloud(draft.cloudId)
    }

    setDraft(null)
    setIsDirty(false)
    contentRef.current = null
  }, [draft?.cloudId])

  // 清理定时器
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [])

  // 页面卸载前保存
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (contentRef.current && isDirty) {
        // 同步保存到本地（beforeunload 中只能用同步操作）
        const currentDraft = draft || {
          id: draftStorage.generateId(),
          body: '',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
        const updatedDraft: IDraft = {
          ...currentDraft,
          body: contentRef.current.body,
          topic: contentRef.current.topic,
          updatedAt: Date.now(),
          isDirty: true,
        }
        draftStorage.saveLocal(updatedDraft)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [draft, isDirty])

  return {
    draft,
    isSaving,
    isDirty,
    isOnline,
    loadDraft,
    saveDraftNow,
    updateDraft,
    clearDraft,
  }
}
