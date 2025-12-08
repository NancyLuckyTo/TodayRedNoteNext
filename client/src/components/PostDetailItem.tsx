import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Share, MessageSquare, Heart, Star, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { RichTextEditor } from '@/components/editPost/RichTextEditor'
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
  const { author, body, images, likesCount = 0, createdAt } = post
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore(state => state.user)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(defaultCommentsOpen)
  const [commentContent, setCommentContent] = useState('')

  const { data: comments = [], isLoading: commentsLoading } = usePostComments(
    post._id,
    true
  )
  const { mutate: addComment, isPending: isAdding } = useAddComment(post._id)

  const { mutate: deletePost, isPending: isDeleting } = useDeletePost()

  // 判断当前用户是否是笔记作者
  const isAuthor = user && author && user._id === author._id

  const handleEdit = () => {
    setDropdownOpen(false)
    // 跳转到编辑页面，传递笔记数据
    navigate(`/editPost/${post._id}`, {
      state: { post },
    })
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
      navigate('/login', { state: { from: location } })
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

      {((post.topic && post.topic.name) ||
        (post.tags && post.tags.length > 0)) && (
        <div className="px-6 pb-2 mt-2 flex flex-wrap gap-2">
          {/* 话题 - 点击跳转到新建笔记页并自动填充话题 */}
          {post.topic && post.topic.name && (
            <button
              type="button"
              onClick={() =>
                navigate('/createPost', { state: { topic: post.topic!.name } })
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
          <MessageSquare className="h-5 w-5" />
          <span className="text-xs">{comments.length}</span>
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
          <div className="h-px bg-border bg-border-gray-100 my-4"></div>
          {commentsLoading ? (
            <span className="text-xs text-muted-foreground flex justify-around">
              评论加载中...
            </span>
          ) : comments.length === 0 ? (
            <span className="text-s text-muted-foreground flex justify-center my-12">
              还没有评论，来抢沙发吧！
            </span>
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

          <div className="flex items-center gap-2 mt-4">
            <Input
              value={commentContent}
              onChange={e => setCommentContent(e.target.value)}
              placeholder="友善发言，一起交流吧"
              className="h-8 text-xs flex-1 min-w-0"
            />
            <Button
              variant="default"
              size="sm"
              className="h-8 px-3 text-xs bg-red-500 disabled:bg-muted disabled:text-muted-foreground"
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
