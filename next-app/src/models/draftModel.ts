import mongoose, { Document, Model, Schema, Types } from 'mongoose'

export interface IDraft extends Document {
  // 所属用户
  user: Types.ObjectId
  // 正文内容（HTML 格式）
  body: string
  // 话题名称
  topic?: string
  // 已上传的图片 URL 列表
  images: string[]
  createdAt: Date
  updatedAt: Date
}

const DraftSchema: Schema<IDraft> = new Schema<IDraft>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    body: { type: String, default: '' },
    topic: { type: String, default: '' },
    images: { type: [String], default: [] },
  },
  { timestamps: true }
)

// 每个用户只保留一个草稿
DraftSchema.index({ user: 1 }, { unique: true })

const Draft: Model<IDraft> =
  mongoose.models.Draft || mongoose.model<IDraft>('Draft', DraftSchema)

export default Draft
