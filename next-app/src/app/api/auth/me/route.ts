import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import User from '@/models/userModel'
import { getSession } from '@/lib/auth'

// 根据 Cookie 中的 JWT 返回当前登录用户的基础信息
export async function GET() {
  const session = await getSession()

  if (!session || !session.userId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()

  const user = await User.findById(session.userId).select(
    'username createdAt _id'
  )

  if (!user) {
    return NextResponse.json({ message: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      createdAt: user.createdAt,
    },
  })
}
