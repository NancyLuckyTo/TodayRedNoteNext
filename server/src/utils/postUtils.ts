import type { ImageQuality } from '@today-red-note/types'
import { IMAGE_RATIO } from '@today-red-note/types'
import {
  processImageUrl,
  calculateRatioType,
  normalizeImages,
} from './imageUtils.js'

const MAX_IMAGES_PER_POST = 18 // 每篇笔记最多支持 18 张图片

/**
 * 转换为普通对象
 */
export const toPlainPost = (post: any) =>
  typeof post?.toObject === 'function' ? post.toObject() : post

/**
 * 格式化笔记
 */
export const formatPostWithImages = (
  post: any,
  quality: ImageQuality,
  withMeta: boolean
) => {
  const plain = toPlainPost(post)
  const hasImages = Array.isArray(plain.images) && plain.images.length > 0
  const processedImages = hasImages
    ? plain.images.map((img: any) => ({
        ...img,
        url: processImageUrl(img.url, quality),
      }))
    : []

  const base = {
    ...plain,
    images: processedImages,
  }

  if (!withMeta) {
    return base
  }

  return {
    ...base,
    coverRatio: plain.coverRatio,
    isTextOnly: !hasImages,
  }
}

/**
 * 应用图片到目标
 */
export const applyImagesToTarget = (
  target: any,
  images: any[],
  options?: { resetWhenEmpty?: boolean }
) => {
  if (!Array.isArray(images)) return

  if (images.length > MAX_IMAGES_PER_POST) {
    throw new Error(`Max ${MAX_IMAGES_PER_POST} images`)
  }

  const validImages = normalizeImages(images)

  if (validImages.length > 0) {
    target.coverRatio = calculateRatioType(validImages[0])
  } else if (options?.resetWhenEmpty) {
    target.coverRatio = IMAGE_RATIO.PORTRAIT
  }

  target.images = validImages
}
