import { Share, MessageSquare, Heart, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import defaultAvatar from '@/assets/images/avatar.png'
import type { IPost } from '@today-red-note/types'
import { RichTextEditor } from '@/components/create-post/RichTextEditor'

interface PostDetailItemProps {
  post: IPost
}

export function PostDetailItem({ post }: PostDetailItemProps) {
  const { author, body, images, likesCount = 0, createdAt } = post

  return (
    <div className="flex flex-col bg-background pb-4 mb-4 last:mb-0">
      {/* 作者信息 */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <img
            src={author.avatar || defaultAvatar}
            alt={author.username}
            className="h-10 w-10 rounded-full object-cover border border-border"
          />
          <div className="flex flex-col">
            <span className="text-sm font-medium">{author.username}</span>
            {/* 发布时间 */}
            <span className="text-xs text-muted-foreground">
              {new Intl.DateTimeFormat('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
              })
                .format(new Date(createdAt))
                .replace(/\//g, '-')}
            </span>
          </div>
        </div>
        {/* 关注按钮 */}
        <Button
          variant="outline"
          size="sm"
          className="h-8 rounded-full px-4 text-xs font-medium text-primary border-red-500"
        >
          关注
        </Button>
      </div>

      {/* 笔记正文，使用 TipTap 只读模式渲染富文本 */}
      <div className="px-4">
        <RichTextEditor
          content={body}
          onChange={() => {}}
          disabled={true}
          className="min-h-0 text-lg"
        />
      </div>

      {/* 图片展示 */}
      {images && images.length > 0 && (
        <div className="mt-4 flex gap-2 overflow-x-auto px-4 pb-2 scrollbar-hide snap-x">
          {images.map((img: string, index: number) => (
            <div
              key={index}
              className="relative h-48 w-auto shrink-0 overflow-hidden rounded-sm"
            >
              <img
                src={img}
                alt={`Post image ${index + 1}`}
                className="h-full w-auto object-cover"
              />
            </div>
          ))}
        </div>
      )}

      {/* 话题和标签展示 */}
      {(post.topic || (post.tags && post.tags.length > 0)) && (
        <div className="px-6 pb-2 mt-2 flex flex-wrap gap-2">
          {/* 话题 */}
          {post.topic && (
            <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-sm text-red-300">
              #{post.topic.name}
            </span>
          )}

          {/* AI 识别的标签 */}
          {post.tags &&
            post.tags.map(tag => (
              <span
                key={tag._id}
                className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-sm text-blue-600 border border-blue-200"
              >
                {tag.name}
              </span>
            ))}
        </div>
      )}

      {/* 分享、评论、点赞、收藏 */}
      <div className="flex items-center justify-between py-2 text-muted-foreground">
        <div className="flex flex-1 items-center justify-center gap-1">
          <Share className="h-5 w-5" />
        </div>

        <div className="flex flex-1 items-center justify-center gap-1">
          <MessageSquare className="h-5 w-5" />
          <span className="text-xs">15</span>
        </div>

        <div className="flex flex-1 items-center justify-center gap-1">
          <Heart className="h-5 w-5" />
          <span className="text-xs">{likesCount}</span>
        </div>

        <div className="flex flex-1 items-center justify-center gap-1">
          <Star className="h-5 w-5" />
          <span className="text-xs">18</span>
        </div>
      </div>
    </div>
  )
}
