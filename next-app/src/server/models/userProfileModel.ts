import mongoose, { Document, Model, Schema, Types } from 'mongoose'

export interface IUserProfile extends Document {
  userId: Types.ObjectId
  interests: {
    tagId: Types.ObjectId // 指向具体标签
    weight: number // 权重分
    lastUpdated: Date // 时间衰减算法
  }[]
  // 行为日志
  behaviorHistory: {
    action: 'view' | 'like' | 'collect' | 'share'
    postId: Types.ObjectId
    tagIds?: Types.ObjectId[]
    timestamp: Date
  }[]
  preferences: {
    preferredTags: Types.ObjectId[] // 用户偏好标签
    blockedTags: Types.ObjectId[] // 用户屏蔽标签
  }
  createdAt: Date
  updatedAt: Date
}

// 用户画像
const UserProfileSchema: Schema<IUserProfile> = new Schema<IUserProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // 一个用户只能有一份画像文档
    },
    interests: [
      {
        tagId: { type: Schema.Types.ObjectId, ref: 'Tag', required: true },
        weight: { type: Number, required: true, min: 0, max: 1 },
        lastUpdated: { type: Date, default: Date.now },
      },
    ],
    behaviorHistory: [
      {
        action: {
          type: String,
          enum: ['view', 'like', 'collect', 'share'],
          required: true,
        },
        postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
        tagIds: [{ type: Schema.Types.ObjectId, ref: 'Tag' }],
        timestamp: { type: Date, default: Date.now },
      },
    ],
    preferences: {
      preferredTags: [{ type: Schema.Types.ObjectId, ref: 'Tag' }],
      blockedTags: [{ type: Schema.Types.ObjectId, ref: 'Tag' }],
    },
  },
  { timestamps: true }
)

const UserProfile: Model<IUserProfile> =
  mongoose.models.UserProfile ||
  mongoose.model<IUserProfile>('UserProfile', UserProfileSchema)

export default UserProfile
