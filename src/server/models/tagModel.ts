import mongoose, { Document, Model, Schema } from 'mongoose'

export interface ITag extends Document {
  name: string
  normalizedName: string
  postCount: number
  createdAt: Date
  updatedAt: Date
}

// 标签模型
const TagSchema: Schema<ITag> = new Schema<ITag>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    normalizedName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    postCount: {
      type: Number,
      default: 0,
      index: -1, // 倒序索引，用于热门标签榜单
    },
  },
  { timestamps: true }
)

const Tag: Model<ITag> =
  mongoose.models.Tag || mongoose.model<ITag>('Tag', TagSchema)

export default Tag
