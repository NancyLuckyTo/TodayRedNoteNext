import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form'
import { useImageSelection } from '@/hooks/useImageSelection'
import { useCreatePost, type PostFormData } from '@/hooks/useCreatePost'
import { ImageUploader } from '@/components/create-post/ImageUploader'
import {
  RichTextEditor,
  type RichTextEditorRef,
} from '@/components/create-post/RichTextEditor'
import { RichTextToolbar } from '@/components/create-post/RichTextToolbar'
import { useKeyboardPosition } from '@/hooks/useKeyboardPosition'
import { Editor } from '@tiptap/react'
import { htmlToText } from '@/lib/post-utils'

const BODY_MAX_LENGTH = 5000 // 文本最大长度
const BODY_PREVIEW_MAX_LENGTH = 50 // 预览文本最大长度

// 定义表单验证规则
const postSchema = z.object({
  body: z.string().min(1, '请输入内容').max(BODY_MAX_LENGTH, '内容过长'),
  tags: z.string().optional(),
})

const CreatePostPage = () => {
  const navigate = useNavigate()
  const editorRef = useRef<RichTextEditorRef>(null)
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null)
  const [editorContent, setEditorContent] = useState('')
  const { isKeyboardVisible, keyboardHeight } = useKeyboardPosition()

  const {
    images,
    fileInputRef,
    handleFilesSelected,
    removeImageAt,
    resetImages,
    triggerFileInput,
  } = useImageSelection()

  const { mutate: createPost, isPending } = useCreatePost({
    onSuccess: () => {
      resetImages()
      setEditorContent('')
    },
  })

  // 使用回调 ref 来同步 editor 实例到 state，避免在渲染期间访问 ref
  const handleEditorRef = (ref: RichTextEditorRef | null) => {
    if (ref) {
      editorRef.current = ref
      setEditorInstance(ref.editor)
    } else {
      editorRef.current = null
      setEditorInstance(null)
    }
  }

  const form = useForm<PostFormData>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      body: '',
      tags: '',
    },
  })

  const onSubmit = (data: PostFormData) => {
    // 验证文本长度（去除 HTML 标签）
    const textContent = htmlToText(editorContent)
    if (textContent.trim().length === 0) {
      form.setError('body', { message: '请输入内容' })
      return
    }
    if (textContent.length > BODY_MAX_LENGTH) {
      form.setError('body', { message: `内容不能超过${BODY_MAX_LENGTH}字` })
      return
    }

    createPost({
      data: {
        ...data,
        body: editorContent,
        bodyPreview: textContent.substring(0, BODY_PREVIEW_MAX_LENGTH),
      },
      images,
    })
  }

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
          <Button
            type="submit"
            variant="secondary"
            form="create-post-form"
            disabled={isPending}
          >
            存草稿
          </Button>
          {/* 发布按钮 */}
          <Button
            type="submit"
            variant="redButton"
            form="create-post-form"
            disabled={isPending}
          >
            {isPending ? '发布中...' : '发布'}
          </Button>
        </div>
      </div>

      {/* 表单内容 */}
      <div className="p-4">
        <Form {...form}>
          <form
            id="create-post-form"
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
              images={images}
              onFilesSelected={handleFilesSelected}
              onRemove={removeImageAt}
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

export default CreatePostPage
