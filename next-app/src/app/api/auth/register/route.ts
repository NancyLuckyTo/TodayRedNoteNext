import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import User from '@/models/userModel'
import jwt from 'jsonwebtoken'

// 注册请求体：只包含用户名和密码
interface AuthBody {
  username?: string
  password?: string
}

// 创建新用户并直接登录（写入 JWT Cookie）
export async function POST(request: Request) {
  await connectDB()

  let body: AuthBody | null = null
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 })
  }

  const { username, password } = body ?? {}
  if (!username || !password) {
    return NextResponse.json(
      { message: 'username and password are required' },
      { status: 400 } // Bad Request
    )
  }

  try {
    const existed = await User.exists({ username }) // 检查用户名是否已存在
    if (existed) {
      return NextResponse.json(
        { message: 'username already exists' },
        { status: 409 } // Conflict
      )
    }

    const user = new User({ username, password })
    await user.save() // 密码进行加盐哈希存储

    const secret = process.env.JWT_SECRET
    if (!secret) {
      return NextResponse.json(
        { message: 'Server misconfigured' },
        { status: 500 } // Internal Server Error
      )
    }

    // 签发 token，注册成功自动登录
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      secret,
      { expiresIn: '7d' }
    )

    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          createdAt: user.createdAt,
        },
      },
      { status: 201 } // Created 资源创建成功
    )

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 天
      path: '/',
    })

    return response
  } catch (err: unknown) {
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code?: number | string }).code === 11000
    ) {
      return NextResponse.json(
        { message: 'username already exists' },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
