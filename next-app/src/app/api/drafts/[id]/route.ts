import { NextResponse } from 'next/server'
import connectDB from '@/server/db'
import draftService from '@/server/services/draftService'
import { getSession } from '@/server/auth'

/**
 * 更新草稿
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB()
    const user = await getSession()
    if (!user || !user.userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const draft = await draftService.updateDraft(id, user.userId, body)

    if (!draft) {
      return NextResponse.json({ message: 'Draft not found' }, { status: 404 })
    }

    return NextResponse.json({ draft })
  } catch (error) {
    console.error('Error updating draft:', error)
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

/**
 * 删除草稿
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB()
    const user = await getSession()
    if (!user || !user.userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const success = await draftService.deleteDraft(id, user.userId)

    if (!success) {
      return NextResponse.json({ message: 'Draft not found' }, { status: 404 })
    }

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error deleting draft:', error)
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
