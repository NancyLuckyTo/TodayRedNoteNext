import type { ImageQuality, IPost } from '@today-red-note/types'
import { IMAGE_RATIO } from '@today-red-note/types'
import {
  processImageUrl,
  calculateRatioType,
  normalizeImages,
} from './imageUtils'
import type { Document } from 'mongoose' // Import Document from mongoose

const MAX_IMAGES_PER_POST = 18 // 每篇笔记最多支持 18 张图片

/**
 * 转换为普通对象
 */
export const toPlainPost = (post: Document | IPost): IPost =>
  typeof (post as Document)?.toObject === 'function'
    ? ((post as Document).toObject() as IPost)
    : (post as IPost)

/**
 * 格式化笔记
 */
export const formatPostWithImages = (
  post: Document | IPost, // Input can be Raw Mongoose Doc, Lean result, or already IPost
  quality: ImageQuality,
  withMeta: boolean
): IPost => {
  // Returns IPost
  const plain = toPlainPost(post)
  const hasImages = Array.isArray(plain.images) && plain.images.length > 0
  const processedImages = hasImages
    ? plain.images.map((img: IPost['images'][number]) => ({
        // img is IPost['images'][number]
        ...img,
        url: processImageUrl(img.url, quality),
      }))
    : []

  const base: IPost = {
    // Base object type is IPost
    ...plain,
    images: processedImages,
  }

  if (!withMeta) {
    return base
  }

  return {
    ...base,
    coverRatio: plain.coverRatio, // Assuming plain.coverRatio exists from IPost
    isTextOnly: !hasImages,
  }
}

/**
 * 应用图片到目标
 */
export const applyImagesToTarget = (
  target: Partial<IPost>, // Target is a partial IPost
  images: Array<{ url: string; width: number; height: number }>, // Images array type from DTOs
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
