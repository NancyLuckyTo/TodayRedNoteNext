import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { UserPayload } from '@today-red-note/types'

const JWT_SECRET = process.env.JWT_SECRET!

/**
 * 从服务端环境读取 Cookie 中的 token，并解析出当前登录用户信息
 * 只能在服务器端调用（Route Handler、Server Component 等），不能在浏览器里直接使用
 * @returns
 */
export async function getSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value

  if (!token) return null // 用户未登录 或 Cookie 过期已被浏览器清除

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserPayload
    return decoded
  } catch {
    return null
  }
}
