import mongoose, { Document, Model, Schema, Types } from 'mongoose'

export interface IPost extends Document {
  author: Types.ObjectId // 作者 ID
  body: string
  bodyPreview?: string
  images: { url: string; width: number; height: number }[] // 多图支持，最多18张
  coverRatio: string
  tags: Types.ObjectId[] // 标签列表
  topic?: Types.ObjectId // 主要话题
  topics?: Types.ObjectId[] // 相关话题列表
  commentCount: number
  createdAt: Date
  updatedAt: Date
}

const PostSchema: Schema<IPost> = new Schema<IPost>(
  {
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true, trim: true },
    bodyPreview: { type: String, trim: true },
    images: {
      type: [
        new Schema(
          {
            url: { type: String, required: true, trim: true },
            width: { type: Number, required: true },
            height: { type: Number, required: true },
          },
          { _id: false }
        ),
      ],
      default: [],
      maxLength: 18,
    },
    coverRatio: { type: String },
    tags: [{ type: Schema.Types.ObjectId, ref: 'Tag', index: true }],
    topic: { type: Schema.Types.ObjectId, ref: 'Topic' },
    topics: [{ type: Schema.Types.ObjectId, ref: 'Topic' }],
    commentCount: { type: Number, default: 0 },
  },
  { timestamps: true }
)

const Post: Model<IPost> =
  mongoose.models.Post || mongoose.model<IPost>('Post', PostSchema)

export default Post
