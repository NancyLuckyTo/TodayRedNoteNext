import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export const TOAST_DURATION = 2000 // 默认显示时长(ms)

export interface ToastOptions {
  duration?: number // 显示时长
  description?: string // 描述文字
  icon?: React.ReactNode // 自定义图标
  className?: string // 自定义类名
  onClose?: () => void
}

export interface Toast extends ToastOptions {
  id: string
  type: ToastType
  message: string
  createdAt: number
}

interface ToastStore {
  toasts: Toast[]
  add: (type: ToastType, message: string, options?: ToastOptions) => string
  remove: (id: string) => void
  removeAll: () => void
}

const generateId = () =>
  `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],

  add: (type, message, options = {}) => {
    const id = generateId()
    const toast: Toast = {
      id,
      type,
      message,
      createdAt: Date.now(),
      duration: options.duration ?? TOAST_DURATION,
      ...options,
    }

    set(state => ({
      toasts: [...state.toasts, toast],
    }))

    // 自动移除
    if (toast.duration && toast.duration > 0) {
      setTimeout(() => {
        get().remove(id)
        options.onClose?.()
      }, toast.duration)
    }

    return id
  },

  remove: id => {
    set(state => ({
      toasts: state.toasts.filter(t => t.id !== id),
    }))
  },

  removeAll: () => {
    set({ toasts: [] })
  },
}))

export const toast = {
  success: (message: string, options?: ToastOptions) =>
    useToastStore.getState().add('success', message, options),

  error: (message: string, options?: ToastOptions) =>
    useToastStore.getState().add('error', message, options),

  info: (message: string, options?: ToastOptions) =>
    useToastStore.getState().add('info', message, options),

  warning: (message: string, options?: ToastOptions) =>
    useToastStore.getState().add('warning', message, options),

  dismiss: (id?: string) => {
    if (id) {
      useToastStore.getState().remove(id)
    } else {
      useToastStore.getState().removeAll()
    }
  },
}
