import { NextResponse } from 'next/server'
import connectDB from '@/server/db'
import postService from '@/server/services/postService'
import { getSession } from '@/server/auth'
import { FETCH_LIMIT } from '@today-red-note/types'

export async function GET(request: Request) {
  try {
    await connectDB()
    const user = await getSession()
    if (!user || !user.userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || String(FETCH_LIMIT))
    const cursor = searchParams.get('cursor') || undefined

    const result = await postService.getUserPosts(user.userId, limit, cursor)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in GET /api/posts/mine:', error)
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
