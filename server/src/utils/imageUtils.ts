import { URL } from 'url'
import type { ImageQuality, ImageRatio } from '@today-red-note/types'
import {
  IMAGE_RATIO,
  IMAGE_QUALITY,
  IMAGE_QUALITY_CONFIG,
} from '@today-red-note/types'

/**
 * 计算图片比例类型
 * - ratio >= 1（宽 >= 高）=> 横图
 * - ratio < 1（宽 < 高）=> 竖图
 */
export const calculateRatioType = (image: {
  width: number
  height: number
}): ImageRatio => {
  const ratio = image.width / image.height
  return ratio >= 1 ? IMAGE_RATIO.LANDSCAPE : IMAGE_RATIO.PORTRAIT
}

/**
 * OSS 图片处理工具函数
 * @param url 原始图片 URL
 * @param quality 图片质量等级，默认为 HIGH
 * @returns 处理后的图片 URL
 */
export const processImageUrl = (
  url: string,
  quality: ImageQuality = IMAGE_QUALITY.THUMBNAIL
): string => {
  try {
    const urlObj = new URL(url)
    // 强制使用 HTTPS 协议，避免 Mixed Content 错误
    if (urlObj.protocol === 'http:') {
      urlObj.protocol = 'https:'
    }
    // 如果已经有处理参数，直接返回（但仍需确保协议正确）
    if (urlObj.searchParams.has('x-oss-process')) {
      return urlObj.toString()
    }

    // 获取质量配置
    const config = IMAGE_QUALITY_CONFIG[quality]
    // 构建 OSS 处理参数
    // x-oss-process=image/resize,w_800/quality,q_75/format,webp
    const processParams = `image/resize,w_${config.width}/quality,q_${config.quality}/format,${config.format}`
    urlObj.searchParams.append('x-oss-process', processParams)
    return urlObj.toString()
  } catch (e) {
    return url
  }
}

/**
 * 规范化图片数组
 */
export const normalizeImages = (images: any[]) =>
  images
    .filter((img: any) => img && typeof img.url === 'string' && img.url)
    .map((img: any) => ({
      url: String(img.url),
      width:
        typeof img.width === 'number' && Number.isFinite(img.width)
          ? img.width
          : 0,
      height:
        typeof img.height === 'number' && Number.isFinite(img.height)
          ? img.height
          : 0,
    }))
