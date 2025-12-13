import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import User from '@/models/userModel'
import jwt from 'jsonwebtoken'

// 登录请求体：只包含用户名和密码
interface AuthBody {
  username?: string
  password?: string
}

// 验证用户名密码，签发 JWT 并写入 HttpOnly Cookie
export async function POST(request: Request) {
  await connectDB()

  let body: AuthBody | null = null
  try {
    body = await request.json() // 从请求中读取并解析 JSON 数据
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 })
  }

  const { username, password } = body ?? {}
  if (!username || !password) {
    return NextResponse.json(
      { message: 'username and password are required' },
      { status: 400 }
    )
  }

  const user = await User.findOne({ username }).select('+password') // 查询用户并包含密码字段
  if (!user) {
    return NextResponse.json(
      { message: 'invalid credentials' },
      { status: 401 }
    )
  }

  const ok = await user.comparePassword(password)
  if (!ok) {
    return NextResponse.json(
      { message: 'invalid credentials' },
      { status: 401 }
    )
  }

  const secret = process.env.JWT_SECRET // 从环境变量中读取 JWT 密钥
  if (!secret) {
    return NextResponse.json(
      { message: 'Server misconfigured' },
      { status: 500 }
    )
  }

  // 签发 token
  const token = jwt.sign({ userId: user.id, username: user.username }, secret, {
    expiresIn: '7d',
  })

  const response = NextResponse.json({
    success: true,
    token,
    user: {
      id: user.id,
      username: user.username,
      createdAt: user.createdAt,
    },
  })

  // 将 JWT 写入 HttpOnly Cookie，前端 JS 无法直接访问，只能通过服务端或受保护接口间接使用
  response.cookies.set('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict', // 防止 CSRF（跨站请求伪造）攻击，限制 Cookie 只能在当前站点请求中发送
    maxAge: 60 * 60 * 24 * 7, // 7 天
    path: '/',
  })

  return response
}
