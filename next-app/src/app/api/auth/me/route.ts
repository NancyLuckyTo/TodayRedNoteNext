import { NextResponse } from 'next/server'
import connectDB from '@/server/db'
import User from '@/server/models/userModel'
import { getSession } from '@/server/auth'

// 根据 Cookie 中的 JWT 返回当前登录用户的基础信息
export async function GET() {
  const session = await getSession()

  if (!session || !session.userId) {
    return NextResponse.json({ user: null })
  }

  await connectDB()

  const user = await User.findById(session.userId).select(
    'username createdAt _id'
  )

  if (!user) {
    return NextResponse.json({ user: null })
  }

  return NextResponse.json({
    user: {
      _id: user.id,
      username: user.username,
      createdAt: user.createdAt,
    },
  })
}
