import { Card } from './ui/card'
import { Heart } from 'lucide-react'
import { IMAGE_RATIO } from '@today-red-note/types'
import type { IPost } from '@today-red-note/types'
import defaultAvatar from '@/assets/images/avatar.png'
import { getAspectRatio } from '@/lib/post-utils'

interface PostCardProps {
  post: IPost
  onClick?: () => void
  'data-waterfall-height'?: number
}

export function PostCard({ post, onClick }: PostCardProps) {
  const { author, body, images, likesCount = 0 } = post

  const hasImages = images && images.length > 0
  const hasBody = body && body.trim().length > 0

  // 封面图及其比例
  const firstImage = hasImages ? images[0] : null
  const aspectRatio = hasImages
    ? getAspectRatio(post.coverRatio || IMAGE_RATIO.NONE)
    : '0'

  // 正文预览
  const bodyPreview = hasBody
    ? body.length > 50
      ? body.slice(0, 50) + '...'
      : body
    : ''

  // 是否为纯文本帖子
  const isTextOnly = !hasImages && hasBody
  // 是否为短文本帖子
  const isShortText = hasBody && body.length < 50

  return (
    <Card className="overflow-hidden" onClick={onClick}>
      {/* 封面图 */}
      {hasImages && firstImage && (
        <div className="relative w-full" style={{ aspectRatio }}>
          <img
            src={firstImage}
            alt="Post cover"
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      {/* 正文 */}
      {hasBody && (
        <div className="px-3 py-2">
          <p
            className={`text-foreground line-clamp-3 ${
              isTextOnly && isShortText ? 'text-lg font-medium' : 'text-sm'
            }`}
          >
            {bodyPreview}
          </p>
        </div>
      )}

      {/* 作者头像、名字、点赞数 */}
      <div className="flex items-center gap-1 px-3 pb-2">
        <img
          src={author.avatar || defaultAvatar}
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
