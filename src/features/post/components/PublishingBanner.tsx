import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePublishingStore } from '@/stores/publishingStore'
import { X } from 'lucide-react'

const AUTO_CLOSE_DELAY = 3000 // 3秒后自动关闭

/**
 * 发布进度横幅组件
 * 显示在首页顶部，展示发布进度和状态
 */
export const PublishingBanner = () => {
  const router = useRouter()
  const { status, progress, coverImage, postId, reset } = usePublishingStore()

  // 发布成功后 3 秒自动关闭
  useEffect(() => {
    if (status === 'success') {
      const timer = setTimeout(() => {
        reset()
      }, AUTO_CLOSE_DELAY)
      return () => clearTimeout(timer)
    }
  }, [status, reset])

  // 不显示横幅的情况
  if (status === 'idle') {
    return null
  }

  const handleClick = () => {
    // 发布成功后点击跳转到笔记详情页
    if (status === 'success' && postId) {
      router.push(`/post/${postId}`)
      // 跳转后重置状态
      reset()
    }
  }

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation()
    reset()
  }

  const getStatusText = () => {
    switch (status) {
      case 'uploading':
        return '正在上传中...'
      case 'success':
        return '发布成功！'
      case 'error':
        return '发布失败'
      default:
        return ''
    }
  }

  const isClickable = status === 'success' && postId

  return (
    <div
      className="fixed left-0 right-0 top-12 z-50 px-2 rounded-xl bg-white overflow-hidden shadow-lg max-w-md mx-auto"
      onClick={isClickable ? handleClick : undefined}
    >
      <div className="flex items-center p-2 gap-3">
        {/* 左侧：封面图或进度圆圈 */}
        <div className="relative w-8 h-8 shrink-0 rounded-sm overflow-hidden bg-gray-900 flex items-center justify-center">
          {coverImage ? (
            <>
              <img
                src={coverImage}
                alt="封面"
                className="w-full h-full object-cover"
              />
              {/* 进度覆盖层 */}
              {status === 'uploading' && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="text-white text-xs font-medium">
                    {Math.round(progress)}%
                  </span>
                </div>
              )}
            </>
          ) : (
            <span className="text-white text-xs font-medium">
              {Math.round(progress)}%
            </span>
          )}
        </div>

        {/* 中间：状态文字 */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-900 truncate">{getStatusText()}</p>
        </div>

        {/* 右侧：关闭按钮（仅成功或失败时显示） */}
        {(status === 'success' || status === 'error') && (
          <button
            onClick={handleClose}
            className="p-1 rounded-full hover:bg-gray-100 shrink-0"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>

      {/* 底部进度条 */}
      <div className="h-0.5 bg-gray-100">
        <div
          className={`h-full transition-all duration-300 ease-out ${
            status === 'error' ? 'bg-red-400' : 'bg-red-500'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
