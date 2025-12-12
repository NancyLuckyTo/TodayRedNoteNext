import mongoose, { Document, Model, Schema, Types } from 'mongoose'

export interface IComment extends Document {
  post: Types.ObjectId
  author: Types.ObjectId
  content: string
  createdAt: Date
  updatedAt: Date
}

const CommentSchema: Schema<IComment> = new Schema<IComment>(
  {
    post: {
      type: Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
      index: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
  },
  { timestamps: true }
)

const Comment: Model<IComment> =
  mongoose.models.Comment || mongoose.model<IComment>('Comment', CommentSchema)

export default Comment
