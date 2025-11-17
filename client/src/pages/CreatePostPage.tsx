import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { toast } from 'sonner'
import { X, ImagePlus } from 'lucide-react'
import axios from 'axios'
import api from '@/lib/api'
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

// 定义表单验证规则
const postSchema = z.object({
  title: z.string().min(1, '请输入标题').max(50, '标题不能超过50字'),
  body: z.string().min(1, '请输入内容').max(5000, '内容不能超过5000字'),
  tags: z.string().optional(),
})

type PostFormData = z.infer<typeof postSchema>

const CreatePostPage = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [coverImage, setCoverImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')

  const form = useForm<PostFormData>({
    resolver: zodResolver(postSchema), // 校验
    // 初始值初始化
    defaultValues: {
      title: '',
      body: '',
      tags: '',
    },
  })

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: PostFormData) => {
      let coverImageUrl = ''

      if (coverImage) {
        try {
          // 向后端申请“通行证”
          const requestUrlRes = await api.post('/upload/request-url', {
            filename: coverImage.name,
            contentType: coverImage.type,
          })

          const { uploadUrl, publicUrl } = requestUrlRes.data

          // 前端直传 OSS
          await axios.put(uploadUrl, coverImage, {
            headers: {
              'Content-Type': coverImage.type,
            },
          })

          coverImageUrl = publicUrl
        } catch (error) {
          if (
            error &&
            typeof error === 'object' &&
            'config' in error &&
            error.config?.url?.includes('/upload/request-url')
          ) {
            throw new Error('获取上传授权失败')
          }
          throw new Error('上传文件失败，请检查网络或重试')
        }
      }

      // 将字符串 "生活, 学习" 转换数组 ["生活", "学习"]
      const tagsArray = data.tags
        ? data.tags
            .split(',')
            .map(tag => tag.trim())
            .filter(Boolean)
        : []

      // 创建帖子，将清洗后的数据发给后端
      const postRes = await api.post('/posts', {
        title: data.title,
        body: data.body,
        coverImage: coverImageUrl || undefined,
        tags: tagsArray,
      })

      return postRes.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      toast.success('发布成功！')
      form.reset()
      removeImage()
      navigate('/')
    },
    onError: error => {
      const errorMessage = error instanceof Error ? error.message : '请稍后重试'
      toast.error('发布失败', {
        description: errorMessage,
      })
    },
  })

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('请选择要发表的图片')
        return
      }

      const allowedTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
      ]
      if (!allowedTypes.includes(file.type)) {
        toast.error('仅支持 JPG、PNG 或 WEBP 格式')
        return
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error('图片大小不能超过 5MB')
        return
      }

      // 释放旧的预览图内存（如果有）
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }

      setCoverImage(file)
      setPreviewUrl(URL.createObjectURL(file)) // 生成新预览图
    }
  }

  const removeImage = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setCoverImage(null)
    setPreviewUrl('')
  }

  const onSubmit = (data: PostFormData) => {
    mutate(data)
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* 顶部导航栏 */}
      <div className="sticky top-0 bg-white px-4 py-3 flex items-center justify-between z-10">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate('/')}
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
        {/* 广播 useForm 的所有工具和状态 */}
        <Form {...form}>
          <form
            id="create-post-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            {/* 标题 */}
            <FormField
              control={form.control} // 传入 RHF 的控制权
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      placeholder="添加标题"
                      {...field}
                      disabled={isPending}
                      className="border-none text-lg"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 正文 */}
            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder="分享你的想法"
                      className="min-h-[200px] resize-none"
                      {...field}
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 图片上传 */}
            <div className="space-y-2">
              {previewUrl ? (
                <div className="relative">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    disabled={isPending}
                    className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1.5 hover:bg-black/70 transition-colors disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors">
                  <ImagePlus className="w-12 h-12 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-500">点击上传封面图</span>
                  <span className="text-xs text-gray-400 mt-1">
                    支持 JPG/PNG/WEBP，最大 5MB
                  </span>
                  <Input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleImageChange}
                    className="hidden"
                    disabled={isPending}
                  />
                </label>
              )}
            </div>

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
