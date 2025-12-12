import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import postService from '@/services/postService'
import { getSession } from '@/lib/auth'
import { FETCH_LIMIT } from '@today-red-note/types'
import { getErrorMessage } from '@/lib/utils'

export async function GET(request: Request) {
  try {
    await connectDB()
    const { searchParams } = new URL(request.url) // 解析 URL 参数
    const limit = parseInt(searchParams.get('limit') || String(FETCH_LIMIT))
    const cursor = searchParams.get('cursor') || undefined // 获取游标用于瀑布流分页

    // 去重列表
    let excludeIds: string[] | undefined
    const excludeIdsParam = searchParams.get('excludeIds')
    if (excludeIdsParam) {
      excludeIds = excludeIdsParam.split(',').filter(Boolean)
    }

    const user = await getSession() // 获取当前用户身份
    const currentUserId = user?.userId

    // 根据用户是否登录，分别进行个性化推荐流或公共流
    const result = currentUserId
      ? await postService.getPersonalizedFeed(
          currentUserId,
          limit,
          cursor,
          excludeIds
        )
      : await postService.getPosts(limit, cursor, excludeIds)

    // 是否为“没有登录 + 没有游标（第一页） + 没有需去重的笔记 ID”
    const isFirstPage = !currentUserId && !cursor && !excludeIds
    const response = NextResponse.json(result)

    // 首页缓存，如果非首页则不进行缓存，保证数据的实时性和个性化
    if (isFirstPage) {
      response.headers.set(
        'Cache-Control',
        'public, s-maxage=60, stale-while-revalidate=300'
        // 第一页缓存 60s，过期后 300s 内可继续使用缓存，过期且复用后拉取最新数据更新缓存
      )
    }

    return response
  } catch (error: unknown) {
    console.error('Error in GET /api/posts:', error)
    const message = getErrorMessage(error)
    return NextResponse.json({ message: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    await connectDB()
    const user = await getSession()

    // 权限守卫
    if (!user || !user.userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json() // 获取前端传来的笔记 JSON 数据
    const post = await postService.createPost(user.userId, body) // 确保笔记挂载在用户上

    return NextResponse.json({ post }, { status: 201 }) // 资源已创建
  } catch (error: unknown) {
    console.error('Error in POST /api/posts:', error)
    const message = getErrorMessage(error)
    if (message?.includes('Max') && message?.includes('images')) {
      return NextResponse.json({ message }, { status: 400 }) // 客户端错误，图片数量超限
    }
    return NextResponse.json(
      { message: message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}
