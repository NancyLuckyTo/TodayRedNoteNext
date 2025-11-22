import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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

// 定义表单验证规则
const postSchema = z.object({
  body: z.string().min(1, '请输入内容').max(5000, '内容不能超过5000字'),
  tags: z.string().optional(),
})

const CreatePostPage = () => {
  const navigate = useNavigate()

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
    },
  })

  const form = useForm<PostFormData>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      body: '',
      tags: '',
    },
  })

  const onSubmit = (data: PostFormData) => {
    createPost({ data, images })
  }

  return (
    <div className="min-h-screen bg-white pb-20">
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
            {/* 正文 */}
            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder="分享你的想法"
                      className="min-h-[150px] resize-none"
                      {...field}
                      disabled={isPending}
                    />
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

            {/* 标签 */}
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      placeholder="输入标签，用逗号分隔，如: 生活,美食,旅行"
                      {...field}
                      disabled={isPending}
                      className="border-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </div>
    </div>
  )
}

export default CreatePostPage
