import { ImageRatio } from '../constants/image'

// 作者
export interface IAuthor {
  _id: string
  username: string
  avatar: string
}

// 笔记
export interface IPost {
  _id: string
  author: IAuthor
  body: string
  bodyPreview?: string
  images: Array<{ url: string; width: number; height: number }>
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
  commentCount: number
}
