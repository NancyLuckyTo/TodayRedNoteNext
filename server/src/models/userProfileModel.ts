import mongoose, { Document, Model, Schema, Types } from 'mongoose'

export interface IUserProfile extends Document {
  userId: Types.ObjectId
  interests: {
    topicId: Types.ObjectId // 指向具体话题
    weight: number // 权重分
    lastUpdated: Date // 时间衰减算法
  }[]
  // 行为日志
  behaviorHistory: {
    action: 'view' | 'like' | 'collect' | 'share'
    postId: Types.ObjectId
    topicId?: Types.ObjectId
    timestamp: Date
  }[]
  preferences: {
    preferredTopics: Types.ObjectId[] // 用户偏好话题
    blockedTopics: Types.ObjectId[] // 用户屏蔽话题
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
        topicId: { type: Schema.Types.ObjectId, ref: 'Topic', required: true },
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
        topicId: { type: Schema.Types.ObjectId, ref: 'Topic' },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    preferences: {
      preferredTopics: [{ type: Schema.Types.ObjectId, ref: 'Topic' }],
      blockedTopics: [{ type: Schema.Types.ObjectId, ref: 'Topic' }],
    },
  },
  { timestamps: true }
)

// 在 userId 上建立索引，用于快速查询
UserProfileSchema.index({ userId: 1 })

const UserProfile: Model<IUserProfile> =
  mongoose.models.UserProfile ||
  mongoose.model<IUserProfile>('UserProfile', UserProfileSchema)

export default UserProfile
