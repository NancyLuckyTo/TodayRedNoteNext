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
  images: string[]
  tags?: string[]
  createdAt: string
  updatedAt: string
  likesCount: number
  coverRatio: ImageRatio
  isTextOnly?: boolean
}
