'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Heart, ImageOff } from 'lucide-react'
import { IMAGE_RATIO } from '@today-red-note/types'
import type { IPost } from '@today-red-note/types'
import { getDefaultAvatar } from '@/lib/avatarUtils'
import { getAspectRatio, htmlToText } from '@/lib/postUtils'

interface PostCardProps {
  post: IPost
  onClick?: () => void
  'data-waterfall-height'?: number
  priority?: boolean
  loading?: 'lazy' | 'eager'
}

export function PostCard({
  post,
  onClick,
  priority = false,
  loading,
}: PostCardProps) {
  const { author, body, bodyPreview, images, likesCount = 0 } = post
  const [imageError, setImageError] = useState(false)

  const hasImages = images && images.length > 0
  const hasBody = body && body.trim().length > 0

  // 封面图及其比例
  const firstImage = hasImages ? images[0] : null
  const aspectRatio = hasImages
    ? getAspectRatio(post.coverRatio || IMAGE_RATIO.PORTRAIT)
    : '0'

  // 正文预览，使用 bodyPreview 字段，如果不存在则从 HTML 中提取
  const preview = hasBody ? bodyPreview || htmlToText(body) : ''

  // 确定加载策略：
  // 1. 如果显式传入 loading，则使用传入值
  // 2. 否则如果 priority 为 true，则使用 eager
  // 3. 否则使用 lazy
  const loadingStrategy = loading || (priority ? 'eager' : 'lazy')
  const fetchPriority = priority ? 'high' : 'auto'

  return (
    <Card className="overflow-hidden bg-white" onClick={onClick}>
      {/* 封面图 */}
      {hasImages && firstImage && (
        <div className="relative w-full bg-muted" style={{ aspectRatio }}>
          {!imageError ? (
            <img
              src={firstImage.url}
              alt="Post cover"
              className="h-full w-full object-cover"
              loading={loadingStrategy}
              fetchPriority={fetchPriority}
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-secondary text-muted-foreground">
              <ImageOff className="h-8 w-8" />
            </div>
          )}
        </div>
      )}

      {/* 正文预览 */}
      {hasBody && (
        <div className="px-3 py-2">
          <p className="text-foreground line-clamp-2 text-sm overflow-hidden wrap-break-word">
            {preview}
          </p>
        </div>
      )}

      {/* 作者头像、名字、点赞数 */}
      <div className="flex items-center gap-1 px-3 pb-2">
        <img
          src={author.avatar || getDefaultAvatar(author.username)}
          alt={author.username}
          className="w-4 h-4 rounded-full object-cover"
        />
        <span className="text-xs text-muted-foreground flex-1 truncate">
          {author.username}
        </span>
        <div className="flex items-center gap-1 text-muted-foreground">
          <Heart className="w-4 h-4 stroke-1" />
          <span className="text-xs">{likesCount}</span>
        </div>
      </div>
    </Card>
  )
}
