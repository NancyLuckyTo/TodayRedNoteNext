import { NextResponse } from 'next/server'
import connectDB from '@/server/db'
import draftService from '@/server/services/draftService'
import { getSession } from '@/server/auth'

/**
 * 获取当前用户的草稿
 */
export async function GET() {
  try {
    await connectDB()
    const user = await getSession()
    if (!user || !user.userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const draft = await draftService.getDraft(user.userId)
    return NextResponse.json({ draft })
  } catch (error) {
    console.error('Error getting draft:', error)
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

/**
 * 创建新草稿
 */
export async function POST(request: Request) {
  try {
    await connectDB()
    const user = await getSession()
    if (!user || !user.userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const draft = await draftService.saveDraft(user.userId, body)

    return NextResponse.json({ draft }, { status: 201 })
  } catch (error) {
    console.error('Error creating draft:', error)
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
