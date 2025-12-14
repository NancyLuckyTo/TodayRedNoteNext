import { create } from 'zustand'
import type { PostFormData } from '@/lib/postUtils'
import type { SelectedImage } from '@/hooks/useImageSelection'

export type PublishingStatus = 'idle' | 'uploading' | 'success' | 'error'

interface PublishingTask {
  data: PostFormData
  images: SelectedImage[]
  existingImages: string[]
  draftId?: string
  cloudDraftId?: string
}

interface PublishingState {
  status: PublishingStatus
  progress: number // 0-100
  coverImage: string | null // 封面图 URL
  postId: string | null // 发布成功后的笔记 ID
  errorMessage: string | null
  publishingTask: PublishingTask | null

  startPublishing: (coverImage: string | null) => void
  setPublishingTask: (task: PublishingTask) => void
  updateCoverImage: (url: string) => void
  updateProgress: (progress: number) => void
  setSuccess: (postId: string) => void
  setError: (message: string) => void
  reset: () => void
}

export const usePublishingStore = create<PublishingState>(set => ({
  status: 'idle',
  progress: 0,
  coverImage: null,
  postId: null,
  errorMessage: null,
  publishingTask: null,

  startPublishing: (coverImage: string | null) =>
    set({
      status: 'uploading',
      progress: 0,
      coverImage,
      postId: null,
      errorMessage: null,
    }),

  setPublishingTask: (task: PublishingTask) => set({ publishingTask: task }),

  updateCoverImage: (url: string) => set({ coverImage: url }),

  updateProgress: (progress: number) =>
    set(state => ({
      progress: Math.min(100, Math.max(0, progress)),
      // 如果进度达到 100% 但状态还是 uploading，保持 uploading 状态, 直到明确调用 setSuccess
      status: state.status === 'uploading' ? 'uploading' : state.status,
    })),

  setSuccess: (postId: string) =>
    set({
      status: 'success',
      progress: 100,
      postId,
      publishingTask: null, // Clear task on success
    }),

  setError: (message: string) =>
    set({
      status: 'error',
      errorMessage: message,
    }),

  reset: () =>
    set({
      status: 'idle',
      progress: 0,
      coverImage: null,
      postId: null,
      errorMessage: null,
      publishingTask: null,
    }),
}))
