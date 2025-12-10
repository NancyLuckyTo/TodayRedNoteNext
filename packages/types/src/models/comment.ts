import { type IAuthor } from './post.js'

export interface IComment {
  _id: string
  post: string
  author: IAuthor
  content: string
  createdAt: string
  updatedAt: string
}
