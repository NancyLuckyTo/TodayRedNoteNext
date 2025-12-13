import { create } from 'zustand'
import api from '@/lib/api'

// 用户对象的数据结构
type User = {
  _id: string
  username: string
  createdAt: string
  avatar?: string
}

type AuthState = {
  user: User | null // 用户对象
  token: string | null // 认证 token
  isAuthenticated: boolean // 是否已登录
  initialized: boolean // 是否已初始化
  initialize: () => Promise<void>
  setUser: (user: User | null) => void
  setToken: (token: string | null) => void
  logout: () => void // 登出
}

export const useAuthStore = create<AuthState>(set => ({
  user: null,
  token: null,
  isAuthenticated: false,
  initialized: false,
  initialize: async () => {
    const token =
      typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (!token) {
      set({
        initialized: true,
        user: null,
        token: null,
        isAuthenticated: false,
      })
      return
    }
    try {
      const { data } = await api.get('/auth/profile')
      set({ user: data.user, token, isAuthenticated: true, initialized: true })
    } catch {
      localStorage.removeItem('token')
      localStorage.removeItem('profile')
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        initialized: true,
      })
    }
  },
  setUser: (user: User | null) => set({ user }),
  setToken: (token: string | null) =>
    set({ token, isAuthenticated: Boolean(token) }),
  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('profile')
    set({ user: null, token: null, isAuthenticated: false })
  },
}))
