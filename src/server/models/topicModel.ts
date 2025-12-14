import mongoose, { Document, Model, Schema } from 'mongoose'

export interface ITopic extends Document {
  name: string
  normalizedName: string
  description?: string
  postCount: number
  createdAt: Date
  updatedAt: Date
}

// 话题
const TopicSchema: Schema<ITopic> = new Schema<ITopic>(
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
    description: {
      type: String,
      trim: true,
    },
    postCount: {
      type: Number,
      default: 0,
      index: -1, // 倒序索引，用于热门话题榜单
    },
  },
  { timestamps: true }
)

const Topic: Model<ITopic> =
  mongoose.models.Topic || mongoose.model<ITopic>('Topic', TopicSchema)

export default Topic
