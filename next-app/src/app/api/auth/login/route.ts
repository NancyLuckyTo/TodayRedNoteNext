import { NextResponse } from 'next/server'
import { authService } from '@/server/services/auth'
import type { AuthBody } from '../types'

// 登录请求体：只包含用户名和密码

// 验证用户名密码，签发 JWT 并写入 HttpOnly Cookie
export async function POST(request: Request) {
  let body: AuthBody | null = null
  try {
    body = await request.json() // 从请求中读取并解析 JSON 数据
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 })
  }

  const { username, password } = body ?? {}

  const result = await authService.login(username, password)

  if (!result.success || !result.token) {
    return NextResponse.json(
      { message: result.error || 'Login failed' },
      { status: result.status || 401 }
    )
  }

  const response = NextResponse.json({
    success: true,
    token: result.token,
    user: result.user,
  })

  // 将 JWT 写入 HttpOnly Cookie，前端 JS 无法直接访问，只能通过服务端或受保护接口间接使用
  response.cookies.set('token', result.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict', // 防止 CSRF（跨站请求伪造）攻击，限制 Cookie 只能在当前站点请求中发送
    maxAge: 60 * 60 * 24 * 7, // 7 天
    path: '/',
  })

  return response
}
