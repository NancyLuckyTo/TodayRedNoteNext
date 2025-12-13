import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import postService from '@/services/postService'
import { FETCH_LIMIT } from '@today-red-note/types'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB()
    const { id } = await params // 笔记 ID
    const { searchParams } = new URL(request.url)
    const cursor = searchParams.get('cursor') || undefined // 获取分页游标
    const excludeIdsStr = searchParams.get('excludeIds')
    const excludeIds = excludeIdsStr ? excludeIdsStr.split(',') : undefined // 待去重笔记 ID 列表

    // TODO: 目前的业务逻辑暂时不区分用户，未来会加入个性化推荐
    const userId = undefined

    const result = await postService.getRelatedPosts(
      id,
      userId,
      FETCH_LIMIT,
      cursor,
      excludeIds
    )

    return NextResponse.json(result) // 将结果序列化为 JSON 并返回给客户端，HTTP 状态码默认为 200
  } catch (error) {
    console.error('Error fetching related posts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch related posts' },
      { status: 500 }
    )
  }
}
