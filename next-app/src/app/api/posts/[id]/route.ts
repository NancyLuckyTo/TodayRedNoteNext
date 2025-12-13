import { NextResponse } from 'next/server'
import connectDB from '@/server/db'
import postService from '@/server/services/postService'
import userProfileService from '@/server/services/userProfileService'
import { getSession } from '@/server/auth'
import { getErrorMessage } from '@/lib/utils'

/**
 * 获取笔记详情
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB()
    const { id } = await params
    const user = await getSession()
    const currentUserId = user?.userId

    const post = await postService.getPostById(id, currentUserId)
    if (!post) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 })
    }

    // 异步记录用户的浏览记录
    if (currentUserId) {
      userProfileService
        .trackUserBehavior(currentUserId, id, 'view')
        .catch(console.error)
    }

    return NextResponse.json({ post })
  } catch (error: unknown) {
    console.error('Error in GET /api/posts/[id]:', error)
    return NextResponse.json(
      { message: getErrorMessage(error) || 'Internal Server Error' },
      { status: 500 }
    )
  }
}

/**
 * 修改笔记
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB()
    const { id } = await params
    const user = await getSession()

    if (!user || !user.userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    try {
      const post = await postService.updatePost(id, user.userId, body)
      if (!post) {
        return NextResponse.json({ message: 'Not found' }, { status: 404 })
      }
      return NextResponse.json({ post })
    } catch (error: unknown) {
      const message = getErrorMessage(error)
      // 试图修改别人的笔记
      if (message === 'Forbidden') {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
      }
      // 修改后的内容不合规，如图片数量过多
      if (message?.includes('Max') && message?.includes('images')) {
        return NextResponse.json({ message: message }, { status: 400 })
      }
      throw error
    }
  } catch (error: unknown) {
    console.error('Error in PUT /api/posts/[id]:', error)
    return NextResponse.json(
      { message: getErrorMessage(error) || 'Internal Server Error' },
      { status: 500 }
    )
  }
}

/**
 * 删除笔记
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB()
    const { id } = await params
    const user = await getSession()

    if (!user || !user.userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    try {
      const success = await postService.deletePost(id, user.userId)
      if (!success) {
        return NextResponse.json({ message: 'Not found' }, { status: 404 })
      }
      return new NextResponse(null, { status: 204 }) // 204 表示删除成功，但不返回任何内容
    } catch (error: unknown) {
      const message = getErrorMessage(error)
      if (message === 'Forbidden') {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
      }
      throw error
    }
  } catch (error: unknown) {
    console.error('Error in DELETE /api/posts/[id]:', error)
    return NextResponse.json(
      { message: getErrorMessage(error) || 'Internal Server Error' },
      { status: 500 }
    )
  }
}
