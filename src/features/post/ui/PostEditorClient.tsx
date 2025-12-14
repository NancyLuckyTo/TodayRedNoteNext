'use client'

import { useRouter } from 'next/navigation'
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
import { ImageUploader } from '@/features/post/edit/ImageUploader'
import {
  RichTextEditor,
  type RichTextEditorRef,
} from '@/features/post/edit/RichTextEditor'
import { RichTextToolbar } from '@/features/post/edit/RichTextToolbar'
import { htmlToText, postSchema, type PostFormData } from '@/lib/postUtils'
import api from '@/lib/api'
import { BODY_MAX_LENGTH, BODY_PREVIEW_MAX_LENGTH } from '@/constants/post'
import { usePublishingStore } from '@/stores/publishingStore'

interface PostEditorClientProps {
  id?: string
  initialPost?: IPost
  initialTopic?: string
}

export default function PostEditorClient({
  id,
  initialPost,
  initialTopic,
}: PostEditorClientProps) {
  const router = useRouter()
  const isEditMode = Boolean(id)

  // 发布进度状态
  const { startPublishing } = usePublishingStore()

  const editorRef = useRef<RichTextEditorRef>(null)
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null)
  const [editorContent, setEditorContent] = useState('')
  const isKeyboardVisible = false
  const keyboardHeight = 0

  // 编辑模式下的已有图片
  const [existingImages, setExistingImages] = useState<string[]>([])
  // 加载状态（编辑模式加载帖子，新建模式加载草稿）
  const [loading, setLoading] = useState(!initialPost && isEditMode)
  const [post, setPost] = useState<IPost | null>(initialPost || null)

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
      setExistingImages(prev => [...prev, ...uploadedUrls])
      resetImages()
    },
    [resetImages]
  )

  // 草稿自动保存（仅新建模式启用）
  const {
    draft,
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
      // 静默保存成功
    },
    onSaveError: () => {
      // 保存失败时会自动在恢复网络后重试
    },
    onImagesUploaded: handleImagesUploaded,
  })

  // 创建/更新 mutation
  const { mutate: createPost, isPending: isCreating } = useCreatePost()

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

  // 编辑模式下加载帖子数据
  useEffect(() => {
    if (!isEditMode) return
    if (initialPost) {
      setPost(initialPost)
      setEditorContent(initialPost.body)
      setExistingImages(initialPost.images?.map(img => img.url) || [])
      setLoading(false)
      return
    }

    const loadPost = async () => {
      try {
        const { data } = await api.get<{ post: IPost }>(`/posts/${id}`)
        setPost(data.post)
        setEditorContent(data.post.body)
        setExistingImages(data.post.images?.map(img => img.url) || [])
      } catch {
        router.push('/')
      } finally {
        setLoading(false)
      }
    }

    if (!post) {
      loadPost()
    }
  }, [id, isEditMode, router, initialPost, post])

  // 新建模式下加载草稿（只在组件挂载时执行一次）
  const draftLoadedRef = useRef(false)
  useEffect(() => {
    if (isEditMode || draftLoadedRef.current) return
    draftLoadedRef.current = true

    const initDraft = async () => {
      try {
        const savedDraft = await loadDraft()
        if (savedDraft) {
          setEditorContent(savedDraft.body)
          form.setValue('body', savedDraft.body)
          if (savedDraft.topic) {
            form.setValue('topic', savedDraft.topic)
          }
          if (savedDraft.uploadedImages?.length) {
            setExistingImages(savedDraft.uploadedImages)
          }
          toast.info('已恢复草稿')
        }
      } finally {
        // setLoading(false) // Initial loading state for create mode is false by default if we don't block UI for draft loading
      }
    }

    initDraft()
  }, [isEditMode, form, loadDraft])

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

  const handleCancel = useCallback(async () => {
    if (!isEditMode) {
      const content = {
        body: editorContent,
        topic: form.getValues('topic'),
        images: newImages,
        existingImages,
      }

      if (!isEditorContentEmpty(content)) {
        await saveDraftNow(content)
        toast.success('草稿已保存')
      } else {
        await clearDraft()
      }
    }
    router.back()
  }, [
    isEditMode,
    editorContent,
    newImages,
    existingImages,
    form,
    saveDraftNow,
    clearDraft,
    router,
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
      // 新建模式：提交给全局发布器，后台执行
      const coverImage = existingImages[0] || (newImages[0]?.previewUrl ?? null)

      // 1. 设置 UI 状态
      startPublishing(coverImage)

      // 2. 获取当前草稿 ID (如果有)
      // useDraftAutoSave 返回的 draft 包含当前草稿信息
      // 需要通过 hook 获取 draft 对象
      // 注意：PostEditorClient 上方已经有 const { draft, ... } = useDraftAutoSave(...)

      // 3. 提交任务到 Store
      const { setPublishingTask } = usePublishingStore.getState()
      setPublishingTask({
        data: postData,
        images: [...newImages],
        existingImages: [...existingImages],
        draftId: draft?.id,
        cloudDraftId: draft?.cloudId,
      })

      // 4. 跳转首页
      router.push('/')
    }
  }

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <Spinner />
      </div>
    )
  }

  const formId = isEditMode ? 'edit-post-form' : 'create-post-form'

  return (
    <div className="min-h-screen bg-white pb-24">
      <div className="sticky top-0 bg-white px-4 py-1 flex items-center justify-between z-50">
        <Button
          type="button"
          variant="ghost"
          onClick={handleCancel}
          disabled={isPending}
        >
          取消
        </Button>
        <div className="flex gap-3 items-center">
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
          <Button
            type="submit"
            variant="redButton"
            size="sm"
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

      <div className="p-4">
        <Form {...form}>
          <form
            id={formId}
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
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
                        className="flex-1 border-none shadow-none focus-visible:ring-0"
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
