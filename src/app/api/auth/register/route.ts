import { NextResponse } from 'next/server'
import { authService } from '@/server/services/auth'
import type { AuthBody } from '../types'

// 注册请求体：只包含用户名和密码

// 创建新用户并直接登录（写入 JWT Cookie）
export async function POST(request: Request) {
  let body: AuthBody | null = null
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 })
  }

  const { username, password } = body ?? {}

  const result = await authService.register(username, password)

  if (!result.success || !result.token) {
    return NextResponse.json(
      { message: result.error || 'Registration failed' },
      { status: result.status || 500 }
    )
  }

  const response = NextResponse.json(
    {
      success: true,
      token: result.token,
      user: result.user,
    },
    { status: 201 } // Created 资源创建成功
  )

  response.cookies.set('token', result.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7, // 7 天
    path: '/',
  })

  return response
}
