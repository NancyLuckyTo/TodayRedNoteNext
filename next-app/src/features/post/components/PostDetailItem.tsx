import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  Share,
  MessageCircleMore,
  MessageCircleHeart,
  Heart,
  Star,
  Pencil,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { getDefaultAvatar } from '@/lib/avatarUtils'
import type { IPost } from '@today-red-note/types'
import { RichTextEditor } from '@/features/post/edit/RichTextEditor'
import { useAuthStore } from '@/stores/auth'
import { useDeletePost } from '@/hooks/useDeletePost'
import { usePostComments } from '@/hooks/usePostComments'
import { useAddComment } from '@/hooks/useAddComment'

interface PostDetailItemProps {
  post: IPost
  defaultCommentsOpen?: boolean
}

export function PostDetailItem({
  post,
  defaultCommentsOpen = false,
}: PostDetailItemProps) {
  const { author, body, images, likesCount = 0, createdAt, commentCount } = post
  const router = useRouter()
  const pathname = usePathname()
  const user = useAuthStore(state => state.user)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(defaultCommentsOpen)
  const [commentContent, setCommentContent] = useState('')

  const { data: comments = [], isLoading: commentsLoading } = usePostComments(
    post._id,
    commentsOpen
  )
  const { mutate: addComment, isPending: isAdding } = useAddComment(post._id)

  const { mutate: deletePost, isPending: isDeleting } = useDeletePost()

  // 判断当前用户是否是笔记作者
  const isAuthor = user && author && user._id === author._id

  const handleEdit = () => {
    setDropdownOpen(false)
    router.push(`/editPost/${post._id}`)
  }

  const handleDelete = () => {
    setDropdownOpen(false)
    setShowDeleteDialog(true)
  }

  const confirmDelete = () => {
    deletePost(post._id)
    setShowDeleteDialog(false)
  }

  const handleSubmitComment = () => {
    // 未登录，先跳转到登录页，并记录当前路径
    if (!user) {
      router.push(`/login?from=${encodeURIComponent(pathname)}`)
      return
    }

    const content = commentContent.trim()
    if (!content) return

    addComment(content, {
      onSuccess: () => {
        setCommentContent('')
      },
    })
  }

  return (
    <div className="flex flex-col bg-background pb-2 mb-1 last:mb-0">
      {/* 作者信息 */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <img
            src={author.avatar || getDefaultAvatar(author.username)}
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
        {/* 作者显示"修改"菜单，非作者显示"关注"按钮 */}
        {isAuthor ? (
          <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-full px-4 text-xs font-medium text-primary border-primary"
              >
                修改
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="animate-in fade-in-0 zoom-in-95 slide-in-from-top-2"
            >
              <DropdownMenuItem
                onClick={handleEdit}
                className="gap-2 text-primary cursor-pointer"
              >
                <Pencil className="h-4 w-4" />
                编辑
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleDelete}
                className="gap-2 text-destructive cursor-pointer focus:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-full px-4 text-xs font-medium text-primary border-red-500"
          >
            关注
          </Button>
        )}
      </div>

      {/* 删除确认弹窗 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="w-[80%]">
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除这篇笔记吗？删除后将无法恢复
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-row justify-center gap-10">
            <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? '删除中...' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
          {images.map((img: string | { url: string }, index: number) => {
            const imageUrl = typeof img === 'string' ? img : img.url
            return (
              <div
                key={index}
                className="relative h-48 w-auto shrink-0 overflow-hidden rounded-sm"
              >
                <img
                  src={imageUrl}
                  alt={`Post image ${index + 1}`}
                  className="h-full w-auto object-cover"
                />
              </div>
            )
          })}
        </div>
      )}

      {((post.topic && post.topic.name) ||
        (post.tags && post.tags.length > 0)) && (
        <div className="px-6 pb-2 mt-2 flex flex-wrap gap-2">
          {/* 话题 - 点击跳转到新建笔记页并自动填充话题 */}
          {post.topic && post.topic.name && (
            <button
              type="button"
              onClick={() =>
                router.push(
                  `/createPost?topic=${encodeURIComponent(post.topic!.name)}`
                )
              }
              className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-sm text-red-300"
            >
              #{post.topic.name}
            </button>
          )}

          {/* 标签 */}
          {/* {post.tags &&
            post.tags.map(tag => (
              <span
                key={tag._id}
                className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-sm text-blue-600 border border-blue-200"
              >
                {tag.name}
              </span>
            ))} */}
        </div>
      )}

      {/* 分享、评论、点赞、收藏 */}
      <div className="flex items-center justify-between py-2 text-muted-foreground">
        <div className="flex flex-1 items-center justify-center gap-1">
          <Share className="h-5 w-5" />
        </div>

        <div
          className="flex flex-1 items-center justify-center gap-1 cursor-pointer"
          onClick={() => setCommentsOpen(prev => !prev)}
        >
          <MessageCircleMore className="h-5 w-5" />
          <span className="text-xs">{commentCount}</span>
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

      {commentsOpen && (
        <div className="px-4 pb-3 space-y-2">
          <div className="flex items-center justify-center my-4">
            <div className="h-px w-20 bg-linear-to-r from-transparent via-border to-transparent" />
          </div>

          {commentsLoading || comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-secondary/80">
                {commentsLoading ? (
                  <Spinner className="size-6 text-muted-foreground" />
                ) : (
                  <MessageCircleHeart className="h-9 w-9 text-red-300" />
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                发条评论表达你的想法吧
              </span>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map(comment => (
                <div key={comment._id} className="flex gap-2">
                  <img
                    src={
                      comment.author.avatar ||
                      getDefaultAvatar(comment.author.username)
                    }
                    alt={comment.author.username}
                    className="h-7 w-7 rounded-full object-cover border border-border"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">
                        {comment.author.username}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Intl.DateTimeFormat('zh-CN', {
                          month: '2-digit',
                          day: '2-digit',
                        })
                          .format(new Date(comment.createdAt))
                          .replace(/\//g, '-')}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs wrap-break-word">
                      {comment.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center mt-4 rounded-full bg-secondary px-1">
            <Input
              value={commentContent}
              onChange={e => setCommentContent(e.target.value)}
              placeholder="发条评论，说说你的感受"
              className="h-auto border-0 bg-transparent text-sm min-w-0"
            />
            <Button
              variant="default"
              size="sm"
              className="h-6 rounded-full text-xs bg-red-500 disabled:bg-muted disabled:text-muted-foreground"
              disabled={isAdding || !commentContent.trim()}
              onClick={handleSubmitComment}
            >
              {isAdding ? '发送中...' : '发布'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
