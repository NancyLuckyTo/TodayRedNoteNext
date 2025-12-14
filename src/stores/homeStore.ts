import { create } from 'zustand'
import type { IPost } from '@today-red-note/types'

const VIEWED_POSTS_KEY = 'home_viewed_post_ids'
const MAX_VIEWED_IDS = 200 // 最多记录 200 个已浏览 ID

/**
 * 从 sessionStorage 获取已浏览的帖子 ID
 */
const getViewedPostIds = (): string[] => {
  try {
    const stored = sessionStorage.getItem(VIEWED_POSTS_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

/**
 * 保存已浏览的帖子 ID 到 sessionStorage
 */
const saveViewedPostIds = (ids: string[]) => {
  try {
    // 限制最大数量，保留最新的
    const trimmedIds = ids.slice(-MAX_VIEWED_IDS)
    sessionStorage.setItem(VIEWED_POSTS_KEY, JSON.stringify(trimmedIds))
  } catch {
    // sessionStorage 不可用时忽略
  }
}

interface HomeState {
  posts: IPost[]
  nextCursor: string | null
  hasNextPage: boolean
  scrollPosition: number
  viewedPostIds: string[] // 已浏览的笔记 ID，用于去重
  setPosts: (posts: IPost[] | ((prev: IPost[]) => IPost[])) => void // 设置笔记列表
  setPagination: (nextCursor: string | null, hasNextPage: boolean) => void // 设置分页信息
  setScrollPosition: (position: number) => void // 记录滚动位置
  addViewedPostIds: (ids: string[]) => void // 添加已浏览的笔记 ID
  getExcludeIds: () => string[] // 获取需要排除的 ID（当前展示的 + 已浏览的）
  clearViewedPostIds: () => void // 清空已浏览 ID（用于下拉刷新）
  reset: () => void
}

export const useHomeStore = create<HomeState>((set, get) => ({
  posts: [],
  nextCursor: null,
  hasNextPage: false,
  scrollPosition: 0,
  viewedPostIds: getViewedPostIds(),
  setPosts: posts =>
    set(state => ({
      posts: typeof posts === 'function' ? posts(state.posts) : posts,
    })),
  setPagination: (nextCursor, hasNextPage) => set({ nextCursor, hasNextPage }),
  setScrollPosition: scrollPosition => set({ scrollPosition }),
  addViewedPostIds: ids => {
    set(state => {
      const existingSet = new Set(state.viewedPostIds)
      const newIds = ids.filter(id => !existingSet.has(id)) // 过滤掉已经存在的 ID
      if (newIds.length === 0) return state

      const updatedIds = [...state.viewedPostIds, ...newIds]
      saveViewedPostIds(updatedIds)
      return { viewedPostIds: updatedIds }
    })
  },
  getExcludeIds: () => {
    const state = get()
    // 合并当前展示的帖子 ID 和已浏览的帖子 ID
    const currentPostIds = state.posts.map(p => p._id)
    const allIds = new Set([...state.viewedPostIds, ...currentPostIds])
    return Array.from(allIds)
  },
  clearViewedPostIds: () => {
    try {
      // sessionStorage.removeItem(VIEWED_POSTS_KEY)
    } catch {
      // ignore
    }
    // set({ viewedPostIds: [] })
  },
  reset: () =>
    set({
      posts: [],
      nextCursor: null,
      hasNextPage: false,
      scrollPosition: 0,
      // viewedPostIds 不重置，保持 session 内的记录
    }),
}))
