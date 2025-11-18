import mongoose, { Document, Model, Schema, Types } from 'mongoose'

export interface IPost extends Document {
  author: Types.ObjectId // 作者 ID
  body: string
  images: { url: string; width: number; height: number }[] // 多图支持，最多18张
  coverRatio: string
  tags: string[] // 标签列表
  createdAt: Date
  updatedAt: Date
}

const PostSchema: Schema<IPost> = new Schema<IPost>(
  {
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true, trim: true },
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
    tags: { type: [String], index: true, default: [] },
  },
  { timestamps: true }
)

const Post: Model<IPost> =
  mongoose.models.Post || mongoose.model<IPost>('Post', PostSchema)

export default Post
