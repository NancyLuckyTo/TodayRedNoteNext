import { z } from 'zod'
import axios from 'axios'
import { IMAGE_RATIO, IMAGE_QUALITY } from '@today-red-note/types'
import type { IPost, ImageRatio } from '@today-red-note/types'
import type { SelectedImage } from '@/hooks/useImageSelection'
import { compressImages } from '@/lib/imageUtils'
import api from '@/lib/api'
import { BODY_MAX_LENGTH, IMAGE_MAX_WIDTH } from '@/constants/post'

const IMAGE_RATIO_META: Record<
  ImageRatio,
  { aspectRatio: string; heightRatio: number }
> = {
  landscape: { aspectRatio: '4 / 3', heightRatio: 3 / 4 },
  portrait: { aspectRatio: '3 / 4', heightRatio: 4 / 3 },
}

const BASE_CARD_OFFSET = 24 // 作者信息与点赞所占高度
const TEXT_LINE_HEIGHT = 18 // 预览正文的行高
const MAX_BODY_LINES = 2 // 预览正文的最大行数

/**
 * 计算瀑布流卡片高度
 * @param post 笔记数据
 * @param columnWidth 列宽
 * @returns 卡片高度
 */
export const calculatePostHeight = (post: IPost, columnWidth: number) => {
  const { body, images } = post
  const hasImages = images && images.length > 0
  const hasBody = body && body.trim().length > 0

  // 封面图及其比例
  const coverRatio = post.coverRatio || IMAGE_RATIO.PORTRAIT
  const aspectMeta = IMAGE_RATIO_META[coverRatio] || IMAGE_RATIO_META.portrait

  const estimatedImageHeight = hasImages
    ? aspectMeta.heightRatio * columnWidth
    : 0

  const estimatedBodyHeight = hasBody
    ? Math.min(Math.ceil(body.length / 40), MAX_BODY_LINES) * TEXT_LINE_HEIGHT
    : 0

  return BASE_CARD_OFFSET + estimatedImageHeight + estimatedBodyHeight
}

/**
 * 根据封面图比例获取 CSS aspect-ratio 值
 * @param coverRatio 封面图比例
 * @returns CSS aspect-ratio 值
 */
export function getAspectRatio(coverRatio: ImageRatio) {
  return (
    IMAGE_RATIO_META[coverRatio]?.aspectRatio ||
    IMAGE_RATIO_META.portrait.aspectRatio
  )
}

export const normalizePost = (post: IPost): IPost => ({
  ...post,
  images:
    post.images
      ?.map((img: string | { url?: string }) =>
        typeof img === 'string' ? img : img?.url
      )
      .filter((url): url is string => Boolean(url)) || [],
  coverRatio: post.coverRatio ?? IMAGE_RATIO.PORTRAIT,
})

/** 将 HTML 转换为纯文本 */
export const htmlToText = (html: string): string => {
  const div = document.createElement('div')
  div.innerHTML = html
  return div.textContent || div.innerText || ''
}

/** 笔记表单数据类型 */
export interface PostFormData {
  body: string
  bodyPreview?: string
  topic?: string
}

/** 已上传图片类型 */
export interface UploadedImage {
  url: string
  width: number
  height: number
}

/** 笔记表单验证 Schema */
export const postSchema = z.object({
  body: z.string().min(1, '请输入内容').max(BODY_MAX_LENGTH, '内容过长'),
  topic: z.string().optional(),
})

/** 解析标签字符串为数组 */
export const parseTags = (tagsStr?: string): string[] => {
  if (!tagsStr) return []
  return tagsStr
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean)
}

/** 批量上传图片：压缩 -> 获取预签名 URL -> 上传到 Aliyun OSS */
export const uploadImages = async (
  images: SelectedImage[]
): Promise<UploadedImage[]> => {
  if (images.length === 0) return []

  try {
    // 压缩图片
    const originalFiles = images.map(img => img.file)
    const compressedFiles = await compressImages(
      originalFiles,
      IMAGE_QUALITY.PREVIEW
    )

    // 计算压缩后尺寸
    const compressedImagesWithDims = compressedFiles.map((file, idx) => {
      const originalImg = images[idx]
      let { width, height } = originalImg

      if (width > IMAGE_MAX_WIDTH) {
        const ratio = IMAGE_MAX_WIDTH / width
        width = IMAGE_MAX_WIDTH
        height = Math.round(height * ratio)
      }

      return { file, width, height }
    })

    // 获取预签名上传 URL
    const reqBody = {
      files: compressedImagesWithDims.map(item => ({
        filename: item.file.name,
        contentType: item.file.type,
      })),
    }
    const batch = await api.post('/upload/request-urls', reqBody)
    const items: { uploadUrl: string; publicUrl: string }[] = batch.data.items

    // 上传到 Aliyun OSS
    await Promise.all(
      items.map((it, idx) =>
        axios.put(it.uploadUrl, compressedImagesWithDims[idx].file, {
          headers: { 'Content-Type': compressedImagesWithDims[idx].file.type },
        })
      )
    )

    return items.map((it, idx) => ({
      url: it.publicUrl,
      width: compressedImagesWithDims[idx].width,
      height: compressedImagesWithDims[idx].height,
    }))
  } catch (error) {
    if (error instanceof Error && error.message.includes('压缩')) {
      throw error
    }
    if (axios.isAxiosError(error)) {
      const url = error.config?.url || ''
      if (/\/upload\/request-url(s)?/.test(String(url))) {
        throw new Error('获取上传授权失败')
      }
    }
    throw new Error('上传文件失败，请检查网络或重试')
  }
}
