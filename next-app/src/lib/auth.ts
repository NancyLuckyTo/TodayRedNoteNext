import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { UserPayload } from '@today-red-note/types'

const JWT_SECRET = process.env.JWT_SECRET!

export async function getSession() {
  const cookieStore = cookies()
  const token = cookieStore.get('token')?.value

  if (!token) return null

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserPayload
    return decoded
  } catch (error) {
    return null
  }
}
