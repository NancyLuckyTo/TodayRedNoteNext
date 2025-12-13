import type { IDraft, ICloudDraft } from '@today-red-note/types'
import axios from 'axios'
import api from './api'

const DRAFT_STORAGE_KEY = 'post_draft'

/**
 * 检查富文本正文是否为空
 */
export function isBodyEmpty(body: string | undefined): boolean {
  const trimmed = body?.trim() || ''
  const textContent = trimmed
    .replace(/<[^>]*>/g, '') // 移除所有 HTML 标签
    .replace(/&nbsp;/g, ' ') // 替换 &nbsp;
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // 移除零宽字符
    .trim()
  return textContent.length === 0
}

/**
 * 检查持久化草稿是否为空
 */
export function isStoredDraftEmpty(draft: IDraft | Partial<IDraft>): boolean {
  const hasBody = !isBodyEmpty(draft.body)
  const hasImages =
    (draft.uploadedImages && draft.uploadedImages.length > 0) ||
    (draft.localImages && draft.localImages.length > 0)
  return !hasBody && !hasImages
}

/**
 * 草稿存储服务
 */
export const draftStorage = {
  /**
   * 生成唯一 ID
   */
  generateId(): string {
    return `draft_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  },

  /**
   * 保存草稿到本地存储
   */
  saveLocal(draft: IDraft): boolean {
    if (isStoredDraftEmpty(draft)) {
      this.clearLocal()
      return true
    }

    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft))
      return true
    } catch (error) {
      console.error('保存草稿到本地失败:', error)
      return false
    }
  },

  /**
   * 从本地存储读取草稿
   */
  getLocal(): IDraft | null {
    if (typeof window === 'undefined') return null
    try {
      const data = localStorage.getItem(DRAFT_STORAGE_KEY)
      if (!data) return null
      return JSON.parse(data) as IDraft
    } catch (error) {
      console.error('读取本地草稿失败:', error)
      return null
    }
  },

  /**
   * 清除本地草稿
   */
  clearLocal(): void {
    if (typeof window === 'undefined') return
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY)
    } catch (error) {
      console.error('清除本地草稿失败:', error)
    }
  },

  /**
   * 保存草稿到云端
   */
  async saveCloud(draft: IDraft): Promise<ICloudDraft | null> {
    if (isStoredDraftEmpty(draft)) {
      return null
    }

    try {
      const payload = {
        body: draft.body,
        topic: draft.topic,
        images: draft.uploadedImages || [],
      }

      if (draft.cloudId) {
        try {
          const { data } = await api.put<{ draft: ICloudDraft }>(
            `/drafts/${draft.cloudId}`,
            payload
          )
          return data.draft
        } catch (putError: unknown) {
          if (axios.isAxiosError(putError)) {
            const status = putError.response?.status
            if (status === 404) {
              console.warn('云端草稿不存在，创建新草稿')
              const { data } = await api.post<{ draft: ICloudDraft }>(
                '/drafts',
                payload
              )
              return data.draft
            }
          }
          throw putError
        }
      } else {
        const { data } = await api.post<{ draft: ICloudDraft }>(
          '/drafts',
          payload
        )
        return data.draft
      }
    } catch (error) {
      console.error('保存草稿到云端失败:', error)
      return null
    }
  },

  /**
   * 从云端获取草稿
   */
  async getCloud(): Promise<ICloudDraft | null> {
    try {
      const { data } = await api.get<{ draft: ICloudDraft | null }>('/drafts')
      return data.draft
    } catch (error) {
      console.error('获取云端草稿失败:', error)
      return null
    }
  },

  /**
   * 删除云端草稿
   */
  async deleteCloud(cloudId: string): Promise<boolean> {
    try {
      await api.delete(`/drafts/${cloudId}`)
      return true
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        console.warn('云端草稿不存在，无需删除')
        return true
      }
      console.error('删除云端草稿失败:', error)
      return false
    }
  },

  /**
   * 检查网络连接状态
   */
  isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true
  },
}
