'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'
import { createStore, useStore } from 'zustand'
import type { IPost } from '@today-red-note/types'

const VIEWED_POSTS_KEY = 'home_viewed_post_ids'
const MAX_VIEWED_IDS = 200

/**
 * 从 sessionStorage 安全获取已浏览的帖子 ID
 */
const getViewedPostIds = (): string[] => {
  if (typeof window === 'undefined') return []
  try {
    const stored = sessionStorage.getItem(VIEWED_POSTS_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error('Failed to read viewed post IDs from sessionStorage:', error)
    return []
  }
}

/**
 * 安全保存已浏览的帖子 ID 到 sessionStorage
 */
const saveViewedPostIds = (ids: string[]): void => {
  if (typeof window === 'undefined') return
  try {
    const trimmedIds = ids.slice(-MAX_VIEWED_IDS)
    sessionStorage.setItem(VIEWED_POSTS_KEY, JSON.stringify(trimmedIds))
  } catch (error) {
    console.error('Failed to save viewed post IDs to sessionStorage:', error)
  }
}

interface HomeState {
  posts: IPost[]
  nextCursor: string | null
  hasNextPage: boolean
  scrollPosition: number
  viewedPostIds: string[]
  postHeights: Record<string, number>
  setPosts: (posts: IPost[] | ((prev: IPost[]) => IPost[])) => void
  setPagination: (nextCursor: string | null, hasNextPage: boolean) => void
  setScrollPosition: (position: number) => void
  addViewedPostIds: (ids: string[]) => void
  getExcludeIds: () => string[]
  clearViewedPostIds: () => void
  setPostHeight: (postId: string, height: number) => void
  reset: () => void
}

type HomeStore = ReturnType<typeof createHomeStore>

/**
 * 创建 Home Store 实例
 */
const createHomeStore = (initialPosts: IPost[] = []) => {
  return createStore<HomeState>((set, get) => ({
    posts: initialPosts,
    nextCursor: null,
    hasNextPage: initialPosts.length > 0, // 如果有初始数据，假设有下一页
    scrollPosition: 0,
    viewedPostIds: getViewedPostIds(),
    postHeights: {},
    setPosts: posts =>
      set(state => ({
        posts: typeof posts === 'function' ? posts(state.posts) : posts,
      })),
    setPagination: (nextCursor, hasNextPage) =>
      set({ nextCursor, hasNextPage }),
    setScrollPosition: scrollPosition => set({ scrollPosition }),
    addViewedPostIds: ids => {
      set(state => {
        const existingSet = new Set(state.viewedPostIds)
        const newIds = ids.filter(id => !existingSet.has(id))
        if (newIds.length === 0) return state

        const updatedIds = [...state.viewedPostIds, ...newIds]
        saveViewedPostIds(updatedIds)
        return { viewedPostIds: updatedIds }
      })
    },
    setPostHeight: (postId, height) =>
      set(state => {
        const prevHeight = state.postHeights[postId]
        if (
          typeof prevHeight === 'number' &&
          Math.abs(prevHeight - height) < 1
        ) {
          return state
        }
        return {
          postHeights: {
            ...state.postHeights,
            [postId]: height,
          },
        }
      }),
    getExcludeIds: () => {
      const state = get()
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
        postHeights: {},
      }),
  }))
}

const HomeStoreContext = createContext<HomeStore | null>(null)

interface HomeStoreProviderProps {
  children: ReactNode
}

/**
 * Home Store Provider
 * 为首页提供全局状态管理
 * 注意：initialPosts 的注入在 HomePageContent 组件中完成
 */
export function HomeStoreProvider({ children }: HomeStoreProviderProps) {
  // 使用 useState 的延迟初始化，符合 React 18 规则
  // 传入函数作为初始值，确保 store 只创建一次
  const [store] = useState(() => createHomeStore([]))

  return (
    <HomeStoreContext.Provider value={store}>
      {children}
    </HomeStoreContext.Provider>
  )
}

/**
 * 使用 Home Store 的 Hook
 * @throws 如果在 HomeStoreProvider 外部使用
 */
export function useHomeStore<T>(selector: (state: HomeState) => T): T {
  const store = useContext(HomeStoreContext)
  if (!store) {
    throw new Error(
      'useHomeStore must be used within HomeStoreProvider. ' +
        'Make sure your component is wrapped with <HomeStoreProvider>.'
    )
  }
  return useStore(store, selector)
}

/**
 * 获取完整 Home Store 状态的便捷 Hook
 */
export function useHomeStoreAll(): HomeState {
  return useHomeStore(state => state)
}
