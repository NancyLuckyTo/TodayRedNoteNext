import { NextResponse } from 'next/server'

// 通过将 token Cookie 置空来退出登录
export async function POST() {
  const response = NextResponse.json({ success: true })

  response.cookies.set('token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  })

  return response
}
