'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Heart, ImageOff } from 'lucide-react'
import { IMAGE_RATIO } from '@today-red-note/types'
import type { IPost } from '@today-red-note/types'
import { getDefaultAvatar } from '@/lib/avatarUtils'
import { getAspectRatio, htmlToText } from '@/lib/postUtils'
import Image from 'next/image'

type ImageFetchPriority = 'auto' | 'high' | 'low'

interface PostCardProps {
  post: IPost
  onClick?: () => void
  'data-waterfall-height'?: number
  priority?: boolean
  loading?: 'lazy' | 'eager'
  fetchPriority?: ImageFetchPriority
}

export function PostCard({
  post,
  onClick,
  priority = false,
  loading,
  fetchPriority,
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

  // 正文预览，优先使用 bodyPreview 字段
  const preview = hasBody ? bodyPreview || htmlToText(body) : ''

  // 确定加载策略
  const loadingStrategy = loading || (priority ? 'eager' : 'lazy')

  return (
    <Card className="overflow-hidden bg-white" onClick={onClick}>
      {/* 封面图 */}
      {hasImages && firstImage && (
        <div className="relative w-full bg-muted" style={{ aspectRatio }}>
          {!imageError ? (
            <Image
              src={firstImage.url}
              alt="Post cover"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, 25vw"
              priority={priority}
              loading={loadingStrategy}
              fetchPriority={fetchPriority}
              unoptimized={firstImage.url.includes('x-oss-process')} // OSS 图片已优化，跳过 Next.js 优化
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
          <p className="text-black line-clamp-2 text-sm overflow-hidden wrap-break-word">
            {preview}
          </p>
        </div>
      )}

      {/* 作者信息栏 */}
      <div className="flex items-center gap-1 px-3 pb-2">
        <div className="relative w-4 h-4 rounded-full overflow-hidden shrink-0">
          <Image
            src={author.avatar || getDefaultAvatar(author.username)}
            alt={author.username}
            fill
            className="object-cover"
            sizes="16px"
            unoptimized // UI Avatar 已经是小图，不需要优化
          />
        </div>
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
