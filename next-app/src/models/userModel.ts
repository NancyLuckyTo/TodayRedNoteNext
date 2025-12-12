import mongoose, { Document, Model, Schema } from 'mongoose'
import bcrypt from 'bcrypt'

interface IUser extends Document {
  username: string
  password: string
  createdAt: Date
  comparePassword(candidate: string): Promise<boolean>
}

const UserSchema: Schema<IUser> = new Schema<IUser>({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    select: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

// 密码加盐
UserSchema.pre('save', async function (next) {
  const user = this as IUser
  if (!user.isModified('password')) return next()
  try {
    const saltRounds = 10 // 加盐轮次
    const salt = await bcrypt.genSalt(saltRounds)
    user.password = await bcrypt.hash(user.password, salt)
    next()
  } catch (err) {
    next(err as Error)
  }
})

// 校验密码
UserSchema.methods.comparePassword = function (candidate: string) {
  const user = this as IUser
  return bcrypt.compare(candidate, user.password)
}

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema)

export default User
