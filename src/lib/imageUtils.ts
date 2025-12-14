import {
  IMAGE_QUALITY,
  IMAGE_QUALITY_CONFIG,
  type ImageQuality,
} from '@today-red-note/types'

/**
 * 压缩单张图片
 * @param file 原始文件
 * @param qualityLevel 压缩质量等级
 * @returns Promise<File> 压缩后的文件
 */
export const compressImage = async (
  file: File,
  qualityLevel: ImageQuality = IMAGE_QUALITY.PREVIEW
): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      try {
        // 计算缩放后的尺寸
        let width = img.width
        let height = img.height
        const maxWidth = IMAGE_QUALITY_CONFIG[qualityLevel].width

        if (width > maxWidth) {
          const ratio = maxWidth / width
          width = maxWidth
          height = Math.round(height * ratio)
        }

        // 创建 Canvas
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')

        if (!ctx) {
          throw new Error('Canvas context creation failed')
        }

        // 绘制图片
        ctx.drawImage(img, 0, 0, width, height)

        // 导出为 Blob
        canvas.toBlob(
          blob => {
            if (!blob) {
              reject(new Error('Image compression failed'))
              return
            }

            // 创建新的 File 对象，修改扩展名为 .webp
            const fileName = file.name.replace(/\.[^/.]+$/, '') + '.webp'
            const compressedFile = new File([blob], fileName, {
              type: IMAGE_QUALITY_CONFIG[qualityLevel].format,
              lastModified: Date.now(),
            })

            resolve(compressedFile)
          },
          IMAGE_QUALITY_CONFIG[qualityLevel].format,
          IMAGE_QUALITY_CONFIG[qualityLevel].quality
        )
      } catch (error) {
        reject(error)
      }
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Image loading failed'))
    }

    img.src = url
  })
}

/**
 * 批量压缩图片
 * @param files 原始文件数组
 * @param qualityLevel 压缩质量等级
 * @returns Promise<File[]> 压缩后的文件数组
 */
export const compressImages = async (
  files: File[],
  qualityLevel: ImageQuality = IMAGE_QUALITY.PREVIEW
): Promise<File[]> => {
  return Promise.all(files.map(file => compressImage(file, qualityLevel)))
}

/**
 * 生成 OSS 图片缩略图 URL
 * @param url 原始图片 URL
 * @param width 缩略图宽度，默认使用 DETAIL 配置
 * @returns 缩略图 URL
 */
export const getThumbnailUrl = (
  url: string,
  width: number = IMAGE_QUALITY_CONFIG[IMAGE_QUALITY.DETAIL].width
): string => {
  if (!url) return url
  // 如果已经有处理参数，直接返回
  if (url.includes('x-oss-process=')) return url
  // 添加 OSS 图片处理参数
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}x-oss-process=image/resize,w_${width}`
}
