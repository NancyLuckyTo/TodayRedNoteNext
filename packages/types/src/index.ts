export const IMAGE_RATIO = {
  LANDSCAPE: 'landscape',
  PORTRAIT: 'portrait',
  SQUARE: 'square',
  NONE: 'none',
} as const

export type ImageRatio = (typeof IMAGE_RATIO)[keyof typeof IMAGE_RATIO]

export interface Author {
  _id: string
  username: string
  avatar: string
}

export interface IPost {
  _id: string
  author: Author
  body: string
  bodyPreview?: string
  images: string[]
  tags?: Array<{
    _id: string
    name: string
  }>
  topic?: {
    _id: string
    name: string
  }
  createdAt: string
  updatedAt: string
  likesCount: number
  coverRatio: ImageRatio
  isTextOnly?: boolean
}

export const IMAGE_QUALITY = {
  THUMBNAIL: 'thumbnail',
  PREVIEW: 'preview',
  DETAIL: 'detail',
} as const

export type ImageQuality = (typeof IMAGE_QUALITY)[keyof typeof IMAGE_QUALITY]

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
