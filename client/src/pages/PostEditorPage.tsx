import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRef, useState, useEffect } from 'react'
import { Editor } from '@tiptap/react'
import type { IPost } from '@today-red-note/types'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form'
import { Spinner } from '@/components/ui/spinner'
import { useImageSelection } from '@/hooks/useImageSelection'
import { useCreatePost } from '@/hooks/useCreatePost'
import { useUpdatePost } from '@/hooks/useUpdatePost'
import { ImageUploader } from '@/components/create-post/ImageUploader'
import {
  RichTextEditor,
  type RichTextEditorRef,
} from '@/components/create-post/RichTextEditor'
import { RichTextToolbar } from '@/components/create-post/RichTextToolbar'
import { useKeyboardPosition } from '@/hooks/useKeyboardPosition'
import { htmlToText, postSchema, type PostFormData } from '@/lib/postUtils'
import api from '@/lib/api'
import { BODY_MAX_LENGTH, BODY_PREVIEW_MAX_LENGTH } from '@/constants/post'

/**
 * 统一的笔记编辑器页面
 * - 无 id 参数时为「新建」模式
 * - 有 id 参数时为「编辑」模式
 */
const PostEditorPage = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const isEditMode = Boolean(id)

  const editorRef = useRef<RichTextEditorRef>(null)
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null)
  const [editorContent, setEditorContent] = useState('')
  const { isKeyboardVisible, keyboardHeight } = useKeyboardPosition()

  // 编辑模式下的已有图片
  const [existingImages, setExistingImages] = useState<string[]>([])
  // 编辑模式下的加载状态
  const [loading, setLoading] = useState(isEditMode)
  const [post, setPost] = useState<IPost | null>(null)

  // 新上传的图片
  const {
    images: newImages,
    fileInputRef,
    handleFilesSelected,
    removeImageAt,
    resetImages,
    triggerFileInput,
  } = useImageSelection()

  // 创建/更新 mutation
  const { mutate: createPost, isPending: isCreating } = useCreatePost({
    onSuccess: () => {
      resetImages()
      setEditorContent('')
    },
  })

  const { mutate: updatePost, isPending: isUpdating } = useUpdatePost({
    onSuccess: () => {
      resetImages()
      setEditorContent('')
    },
  })

  const isPending = isCreating || isUpdating

  // 编辑模式下加载帖子数据
  useEffect(() => {
    if (!isEditMode) return

    const loadPost = async () => {
      // 优先从路由 state 获取
      const statePost = (location.state as { post?: IPost } | null)?.post
      if (statePost && statePost._id === id) {
        setPost(statePost)
        setEditorContent(statePost.body)
        setExistingImages(statePost.images || [])
        setLoading(false)
        return
      }

      // 否则从 API 加载
      if (!id) {
        navigate('/')
        return
      }

      try {
        const { data } = await api.get<{ post: IPost }>(`/posts/${id}`)
        setPost(data.post)
        setEditorContent(data.post.body)
        setExistingImages(data.post.images || [])
      } catch {
        navigate('/')
      } finally {
        setLoading(false)
      }
    }

    loadPost()
  }, [id, isEditMode, location.state, navigate])

  const handleEditorRef = (ref: RichTextEditorRef | null) => {
    editorRef.current = ref
    setEditorInstance(ref?.editor ?? null)
  }

  const form = useForm<PostFormData>({
    resolver: zodResolver(postSchema),
    defaultValues: { body: '', tags: '' },
  })

  // 编辑模式下，帖子加载后更新表单默认值
  useEffect(() => {
    if (post) {
      form.reset({
        body: post.body,
        tags: post.tags?.map(t => t.name).join(', ') || '',
      })
    }
  }, [post, form])

  const removeExistingImage = (index: number) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index))
  }

  const onSubmit = (data: PostFormData) => {
    const textContent = htmlToText(editorContent)
    if (textContent.trim().length === 0) {
      form.setError('body', { message: '请输入内容' })
      return
    }
    if (textContent.length > BODY_MAX_LENGTH) {
      form.setError('body', { message: `内容不能超过${BODY_MAX_LENGTH}字` })
      return
    }

    const postData = {
      ...data,
      body: editorContent,
      bodyPreview: textContent.substring(0, BODY_PREVIEW_MAX_LENGTH),
    }

    if (isEditMode && id) {
      updatePost({
        postId: id,
        data: postData,
        images: newImages,
        existingImages,
      })
    } else {
      createPost({
        data: postData,
        images: newImages,
      })
    }
  }

  // 编辑模式下的加载状态
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner />
      </div>
    )
  }

  const formId = isEditMode ? 'edit-post-form' : 'create-post-form'

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* 顶部导航栏 */}
      <div className="sticky top-0 bg-white px-4 py-3 flex items-center justify-between z-10">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate(-1)}
          disabled={isPending}
        >
          取消
        </Button>
        <div className="flex gap-3">
          {/* 新建模式下显示存草稿按钮 */}
          {!isEditMode && (
            <Button
              type="submit"
              variant="secondary"
              form={formId}
              disabled={isPending}
            >
              存草稿
            </Button>
          )}
          {/* 发布/保存按钮 */}
          <Button
            type="submit"
            variant="redButton"
            form={formId}
            disabled={isPending}
          >
            {isPending
              ? isEditMode
                ? '保存中...'
                : '发布中...'
              : isEditMode
                ? '保存'
                : '发布'}
          </Button>
        </div>
      </div>

      {/* 表单内容 */}
      <div className="p-4">
        <Form {...form}>
          <form
            id={formId}
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            {/* 正文 - 富文本编辑器 */}
            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="border-none">
                      <RichTextEditor
                        ref={handleEditorRef}
                        content={editorContent}
                        onChange={content => {
                          setEditorContent(content)
                          field.onChange(content)
                        }}
                        placeholder="分享你的想法"
                        disabled={isPending}
                        className="min-h-[120px]"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 图片上传 */}
            <ImageUploader
              images={newImages}
              existingImages={existingImages}
              onFilesSelected={handleFilesSelected}
              onRemove={removeImageAt}
              onRemoveExisting={removeExistingImage}
              triggerAdd={triggerFileInput}
              fileInputRef={fileInputRef}
              disabled={isPending}
            />
          </form>
        </Form>
      </div>

      {/* 富文本功能栏 - 固定在底部，键盘弹出时贴在键盘上方 */}
      <div
        className="fixed left-0 right-0 bottom-0 z-50 transition-transform duration-300 ease-in-out safe-area-inset-bottom"
        style={{
          transform:
            isKeyboardVisible && keyboardHeight > 0
              ? `translateY(-${keyboardHeight}px)`
              : 'translateY(0)',
        }}
      >
        <RichTextToolbar editor={editorInstance} />
      </div>
    </div>
  )
}

export default PostEditorPage
