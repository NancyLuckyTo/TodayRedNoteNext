import { create } from 'zustand'
import type { IPost } from '@today-red-note/types'

interface HomeState {
  posts: IPost[]
  nextCursor: string | null
  hasNextPage: boolean
  scrollPosition: number
  setPosts: (posts: IPost[] | ((prev: IPost[]) => IPost[])) => void
  setPagination: (nextCursor: string | null, hasNextPage: boolean) => void
  setScrollPosition: (position: number) => void
  reset: () => void
}

export const useHomeStore = create<HomeState>(set => ({
  posts: [],
  nextCursor: null,
  hasNextPage: false,
  scrollPosition: 0,
  setPosts: posts =>
    set(state => ({
      posts: typeof posts === 'function' ? posts(state.posts) : posts,
    })),
  setPagination: (nextCursor, hasNextPage) => set({ nextCursor, hasNextPage }),
  setScrollPosition: scrollPosition => set({ scrollPosition }),
  reset: () =>
    set({
      posts: [],
      nextCursor: null,
      hasNextPage: false,
      scrollPosition: 0,
    }),
}))
