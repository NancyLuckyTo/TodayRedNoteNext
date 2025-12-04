import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRef, useState, useEffect, useCallback } from 'react'
import { Editor } from '@tiptap/react'
import { toast } from '@/components/ui/toast'
import { Cloud, CloudOff } from 'lucide-react'
import type { IPost } from '@today-red-note/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import {
  useDraftAutoSave,
  isEditorContentEmpty,
} from '@/hooks/useDraftAutoSave'
import { ImageUploader } from '@/components/editPost/ImageUploader'
import {
  RichTextEditor,
  type RichTextEditorRef,
} from '@/components/editPost/RichTextEditor'
import { RichTextToolbar } from '@/components/editPost/RichTextToolbar'
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
  // 加载状态（编辑模式加载帖子，新建模式加载草稿）
  const [loading, setLoading] = useState(true)
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

  // 图片上传成功回调
  const handleImagesUploaded = useCallback(
    (uploadedUrls: string[]) => {
      // 图片上传成功后，将新图片 URL 添加到 existingImages，清空 newImages
      setExistingImages(prev => [...prev, ...uploadedUrls])
      resetImages()
    },
    [resetImages]
  )

  // 草稿自动保存（仅新建模式启用）
  const {
    isSaving: isDraftSaving,
    isDirty,
    isOnline,
    loadDraft,
    saveDraftNow,
    updateDraft,
    clearDraft,
  } = useDraftAutoSave({
    enabled: !isEditMode,
    onSaveSuccess: () => {
      // 静默保存成功，不显示 toast
    },
    onSaveError: () => {
      // 保存失败时会自动在恢复网络后重试
    },
    onImagesUploaded: handleImagesUploaded,
  })

  // 创建/更新 mutation
  const { mutate: createPost, isPending: isCreating } = useCreatePost({
    onSuccess: () => {
      // 发布成功后清除草稿
      clearDraft()
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

  const form = useForm<PostFormData>({
    resolver: zodResolver(postSchema),
    defaultValues: { body: '', topic: '' },
  })

  // 从路由 state 获取初始话题（点击话题跳转时传入）
  const initialTopic = (location.state as { topic?: string } | null)?.topic

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

  // 新建模式下加载草稿（只在组件挂载时执行一次）
  const draftLoadedRef = useRef(false)
  useEffect(() => {
    if (isEditMode || draftLoadedRef.current) return
    draftLoadedRef.current = true

    const initDraft = async () => {
      try {
        const savedDraft = await loadDraft()
        if (savedDraft) {
          // 恢复草稿内容
          setEditorContent(savedDraft.body)
          form.setValue('body', savedDraft.body)
          // 恢复话题
          if (savedDraft.topic) {
            form.setValue('topic', savedDraft.topic)
          }
          // 恢复已上传的图片
          if (savedDraft.uploadedImages?.length) {
            setExistingImages(savedDraft.uploadedImages)
          }
          toast.info('已恢复草稿')
        }
      } finally {
        setLoading(false)
      }
    }

    initDraft()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode])

  const handleEditorRef = (ref: RichTextEditorRef | null) => {
    editorRef.current = ref
    setEditorInstance(ref?.editor ?? null)
  }

  // 编辑模式下，帖子加载后更新表单默认值
  useEffect(() => {
    if (post) {
      form.reset({
        body: post.body,
        topic: post.topic?.name || '',
      })
    }
  }, [post, form])

  // 新建模式下，如果有初始话题则设置
  useEffect(() => {
    if (!isEditMode && initialTopic && !form.getValues('topic')) {
      form.setValue('topic', initialTopic)
    }
  }, [isEditMode, initialTopic, form])

  const removeExistingImage = (index: number) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index))
  }

  // 内容变化时触发草稿自动保存
  const handleContentChange = useCallback(
    (content: string) => {
      setEditorContent(content)
      if (!isEditMode) {
        const topic = form.getValues('topic')
        updateDraft({
          body: content,
          topic,
          images: newImages,
          existingImages,
        })
      }
    },
    [isEditMode, form, newImages, existingImages, updateDraft]
  )

  // 退出时保存草稿
  const handleCancel = useCallback(async () => {
    if (!isEditMode) {
      // 检查是否有实质内容
      const content = {
        body: editorContent,
        topic: form.getValues('topic'),
        images: newImages,
        existingImages,
      }

      if (!isEditorContentEmpty(content)) {
        // 立即保存草稿到本地和云端
        await saveDraftNow(content)
        toast.success('草稿已保存')
      } else {
        // 内容为空，清除本地和云端草稿
        await clearDraft()
      }
    }
    navigate(-1)
  }, [
    isEditMode,
    editorContent,
    newImages,
    existingImages,
    form,
    saveDraftNow,
    clearDraft,
    navigate,
  ])

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
        existingImages, // 草稿中已上传的图片
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
          onClick={handleCancel}
          disabled={isPending}
        >
          取消
        </Button>
        <div className="flex gap-3">
          {/* 网络状态和保存状态指示器 */}
          {!isEditMode && (
            <div className="flex items-center gap-1 text-xs text-gray-400">
              {isOnline ? (
                <Cloud className="w-3 h-3" />
              ) : (
                <CloudOff className="w-3 h-3 text-orange-400" />
              )}
              {isDraftSaving && <span>保存中...</span>}
              {!isDraftSaving && isDirty && !isOnline && <span>待同步</span>}
            </div>
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
                          handleContentChange(content)
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
              isOnline={isOnline}
            />

            {/* 话题输入 */}
            <FormField
              control={form.control}
              name="topic"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="flex items-center text-sm text-red-300">
                      <span>#</span>
                      <Input
                        {...field}
                        placeholder="添加话题（可选）"
                        disabled={isPending}
                        className="flex-1 border-none"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
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
