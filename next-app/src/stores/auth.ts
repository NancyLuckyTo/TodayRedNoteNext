import { create } from 'zustand'

import api from '@/lib/api'

export interface User {
  _id: string
  username: string
  avatar?: string
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  setUser: (user: User | null) => void
  setToken: (token: string | null) => void
  logout: () => void
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthState>(set => ({
  user: null,
  token: null,
  isAuthenticated: false,
  setUser: user => set({ user, isAuthenticated: !!user }),
  setToken: token => set({ token }),
  logout: async () => {
    try {
      await api.post('/auth/logout')
    } catch (error) {
      console.error('Logout failed:', error)
    }
    set({ user: null, token: null, isAuthenticated: false })
  },
  initialize: async () => {
    try {
      const { data } = await api.get<{ user: User }>('/auth/me')
      if (data.user) {
        set({ user: data.user, isAuthenticated: true })
      }
    } catch (error) {
      // 这里的 401 是预期的，表示未登录
      set({ user: null, isAuthenticated: false })
    }
  },
}))
