'use client'

import { useToastStore } from '@/stores/toastStore'
import { Toast } from './Toast'
import { cn } from '@/lib/utils'

interface ToastProviderProps {
  position?:
    | 'top-left'
    | 'top-right'
    | 'top-center'
    | 'bottom-left'
    | 'bottom-right'
    | 'bottom-center'
}

export function ToastProvider({ position = 'top-center' }: ToastProviderProps) {
  const toasts = useToastStore(state => state.toasts)

  const positionClasses = {
    'top-left': 'top-4 left-4 items-start',
    'top-right': 'top-4 right-4 items-end',
    'top-center': 'top-4 left-1/2 -translate-x-1/2 items-center',
    'bottom-left': 'bottom-4 left-4 items-start',
    'bottom-right': 'bottom-4 right-4 items-end',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2 items-center',
  }

  return (
    <div
      className={cn(
        'fixed z-50 flex flex-col gap-2 pointer-events-none w-full max-w-sm',
        positionClasses[position]
      )}
    >
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} />
      ))}
    </div>
  )
}
