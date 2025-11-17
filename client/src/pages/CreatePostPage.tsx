import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { toast } from 'sonner'
import { X, Plus } from 'lucide-react'
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
  body: z.string().min(1, '请输入内容').max(5000, '内容不能超过5000字'),
  tags: z.string().optional(),
})

type PostFormData = z.infer<typeof postSchema>

type SelectedImage = {
  file: File
  previewUrl: string
  width: number
  height: number
}

const CreatePostPage = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [images, setImages] = useState<SelectedImage[]>([])

  const form = useForm<PostFormData>({
    resolver: zodResolver(postSchema), // 校验
    // 初始值初始化
    defaultValues: {
      body: '',
      tags: '',
    },
  })

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: PostFormData) => {
      // 批量上传已选择的图片
      let uploadedImages: { url: string; width: number; height: number }[] = []
      if (images.length > 0) {
        try {
          // 元数据用于后端签名
          const reqBody = {
            files: images.map(img => ({
              filename: img.file.name,
              contentType: img.file.type,
            })),
          }
          // 申请上传授权
          const batch = await api.post('/upload/request-urls', reqBody)
          // items 包含两个字段：
          // uploadUrl: 带签名的临时地址，用于 PUT 上传文件
          // publicUrl: 上传成功后，最终可以直接访问的图片地址
          const items: { uploadUrl: string; publicUrl: string }[] =
            batch.data.items

          // 使用 Promise.all 并行上传所有图片
          await Promise.all(
            items.map((it, idx) =>
              axios.put(it.uploadUrl, images[idx].file, {
                headers: { 'Content-Type': images[idx].file.type },
              })
            )
          )

          // 构建已上传图片的元数据
          uploadedImages = items.map((it, idx) => ({
            url: it.publicUrl,
            width: images[idx].width,
            height: images[idx].height,
          }))
        } catch (error) {
          if (axios.isAxiosError(error)) {
            const url = error.config?.url || ''
            if (/\/upload\/request-url(s)?/.test(String(url))) {
              throw new Error('获取上传授权失败')
            }
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
        body: data.body,
        images: uploadedImages,
        tags: tagsArray,
      })

      return postRes.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      toast.success('发布成功！')
      form.reset()
      // 清理预览与状态
      images.forEach(img => URL.revokeObjectURL(img.previewUrl))
      setImages([])
      navigate('/')
    },
    onError: error => {
      const errorMessage = error instanceof Error ? error.message : '请稍后重试'
      toast.error('发布失败', {
        description: errorMessage,
      })
    },
  })

  const onFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // 将 FileList 类数组转换为真正的数组，方便使用 map/slice 等方法
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    // 计算还能添加几张
    const remain = 18 - images.length
    if (files.length > remain) {
      toast.error(`最多还能选择 ${remain} 张（总共最多 18 张）`)
    }
    const take = files.slice(0, remain)

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

    const toAdd: SelectedImage[] = []
    for (const file of take) {
      if (!allowedTypes.includes(file.type)) {
        toast.error('仅支持 JPG、PNG 或 WEBP 格式')
        continue
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('图片大小不能超过 5MB')
        continue
      }
      // 生成本地预览地址
      const previewUrl = URL.createObjectURL(file)
      // 异步读取图片尺寸
      const dims = await new Promise<{ width: number; height: number }>(
        resolve => {
          const img = new Image()
          // 图片加载成功，返回宽高
          img.onload = () =>
            resolve({ width: img.naturalWidth, height: img.naturalHeight })
          // 图片加载失败，返回 0 x 0
          img.onerror = () => resolve({ width: 0, height: 0 })
          img.src = previewUrl
        }
      )

      // 将文件对象、预览地址、宽高合并存入待添加数组
      toAdd.push({ file, previewUrl, ...dims })
    }

    // 更新 State，将新图片追加到旧图片列表后面
    if (toAdd.length) setImages(prev => [...prev, ...toAdd])
    // 重置 input 以便下次可选择同一文件
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeImageAt = (index: number) => {
    setImages(prev => {
      const copy = [...prev] // 浅拷贝数组，遵循 React 不可变性原则
      const [removed] = copy.splice(index, 1) // 移除指定索引的图片
      // createObjectURL 会占用内存，删除图片时必须手动 revoke 释放
      if (removed) URL.revokeObjectURL(removed.previewUrl)
      return copy
    })
  }

  const triggerAdd = () => {
    // 防止在上传过程中（isPending 为 true）用户再次添加图片造成混乱
    if (isPending) return
    fileInputRef.current?.click()
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

            {/* 图片上传：0~18 张 */}
            <div className="space-y-3">
              {/* 隐藏的多选文件输入 */}
              <Input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={onFilesSelected}
                className="hidden"
                disabled={isPending}
              />

              <div className="grid grid-cols-3 gap-2">
                {/* 遍历渲染所有图片 */}
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    className="relative w-full aspect-square overflow-hidden rounded-md"
                  >
                    <img
                      src={img.previewUrl}
                      alt={`选中图片${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImageAt(idx)}
                      disabled={isPending}
                      className="absolute top-1 right-1 bg-black/20 text-white rounded-full p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {images.length < 18 && (
                  <button
                    type="button"
                    onClick={triggerAdd}
                    disabled={isPending}
                    className="w-full aspect-square bg-gray-100 rounded-md flex items-center justify-center"
                  >
                    <Plus className="w-12 h-12 text-gray-300" />
                  </button>
                )}
              </div>
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
