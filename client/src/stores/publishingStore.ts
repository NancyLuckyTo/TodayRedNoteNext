import { create } from 'zustand'

export type PublishingStatus = 'idle' | 'uploading' | 'success' | 'error'

interface PublishingState {
  status: PublishingStatus
  progress: number // 0-100
  coverImage: string | null // 封面图 URL
  postId: string | null // 发布成功后的笔记 ID
  errorMessage: string | null

  startPublishing: (coverImage: string | null) => void
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

  startPublishing: (coverImage: string | null) =>
    set({
      status: 'uploading',
      progress: 0,
      coverImage,
      postId: null,
      errorMessage: null,
    }),

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
    }),
}))
