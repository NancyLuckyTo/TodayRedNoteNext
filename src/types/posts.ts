import type { IPost } from '@today-red-note/types'

export interface CreatePostDto {
  body: string
  bodyPreview?: string
  images?: Array<{ url: string; width: number; height: number }>
  topic?: string
}

export interface UpdatePostDto {
  body?: string
  bodyPreview?: string
  images?: Array<{ url: string; width: number; height: number }>
  topic?: string
}

export interface DecodedCursor {
  phase?: string
  createdAt?: Date
  updatedAt?: Date
  _id?: string
  innerCursor?: string
}

export type PostsResponse = {
  posts: IPost[]
  pagination?: {
    nextCursor: string | null
    hasNextPage: boolean
    limit: number
  }
}
