'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import type {
  Toast as ToastType,
  ToastType as ToastVariant,
} from '@/stores/toastStore'

interface ToastProps {
  toast: ToastType
}

// 样式配置
const styleMap: Record<ToastVariant, string> = {
  success: 'bg-zinc-900/80 backdrop-blur-sm text-white',
  error: 'bg-zinc-900/80 backdrop-blur-sm text-white',
  info: 'bg-zinc-900/80 backdrop-blur-sm text-white',
  warning: 'bg-zinc-900/80 backdrop-blur-sm text-white',
}

export const Toast = ({ toast }: ToastProps) => {
  const [isVisible, setIsVisible] = useState(false) // 是否可见，用于触发入场动画
  const [isLeaving, setIsLeaving] = useState(false) // 是否离场，用于触发离场动画

  // 入场动画
  useEffect(() => {
    // 使用 requestAnimationFrame 确保 DOM 更新后再触发动画
    const raf = requestAnimationFrame(() => {
      setIsVisible(true)
    })
    return () => cancelAnimationFrame(raf)
  }, [])

  // 如果有 duration，在剩余时间前触发离场动画
  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const leaveTime = toast.duration - 200
      if (leaveTime > 0) {
        const timer = setTimeout(() => {
          setIsLeaving(true)
        }, leaveTime)
        return () => clearTimeout(timer)
      }
    }
  }, [toast.duration])

  return (
    <div
      className={cn(
        // 基础样式
        'flex items-start gap-3 w-full max-w-sm py-1 px-3 rounded-full',
        // 类型样式
        styleMap[toast.type],
        // 动画样式
        'transition-all duration-200 ease-out',
        isVisible && !isLeaving ? 'opacity-100' : 'opacity-0',
        // 自定义类名
        toast.className
      )}
      role="alert"
    >
      {/* 内容 */}
      <div className="flex-1 min-w-0">
        <p className="text-sm">{toast.message}</p>
        {toast.description && (
          <p className="text-sm opacity-80">{toast.description}</p>
        )}
      </div>
    </div>
  )
}
