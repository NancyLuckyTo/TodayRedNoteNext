// 图片质量
export const IMAGE_QUALITY = {
  THUMBNAIL: 'thumbnail',
  PREVIEW: 'preview',
  DETAIL: 'detail',
} as const

export type ImageQuality = (typeof IMAGE_QUALITY)[keyof typeof IMAGE_QUALITY]

// 图片质量配置
export const IMAGE_QUALITY_CONFIG = {
  [IMAGE_QUALITY.THUMBNAIL]: {
    width: 300,
    quality: 60,
    format: 'webp',
  },

  [IMAGE_QUALITY.PREVIEW]: {
    width: 600,
    quality: 70,
    format: 'webp',
  },

  [IMAGE_QUALITY.DETAIL]: {
    width: 1200,
    quality: 85,
    format: 'webp',
  },
}

// 图片比例（仅横图/竖图两种形式）
export const IMAGE_RATIO = {
  LANDSCAPE: 'landscape',
  PORTRAIT: 'portrait',
} as const

export type ImageRatio = (typeof IMAGE_RATIO)[keyof typeof IMAGE_RATIO]
