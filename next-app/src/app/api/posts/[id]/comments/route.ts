import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/server/db'
import Comment from '@/server/models/commentModel'
import Post from '@/server/models/postModel'
import { getSession } from '@/server/auth'
import { z } from 'zod'

const MIN_COMMENT_LENGTH = 1
const MAX_COMMENT_LENGTH = 200

const createCommentSchema = z.object({
  content: z
    .string()
    .min(MIN_COMMENT_LENGTH, 'Comment cannot be empty')
    .max(MAX_COMMENT_LENGTH, 'Comment is too long'),
})

/**
 * 获取笔记评论区
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB()
    const { id } = await params

    const comments = await Comment.find({ post: id })
      .populate('author', 'username avatar')
      .sort({ createdAt: -1 })
      .lean()

    return NextResponse.json(comments)
  } catch (error) {
    console.error('Error fetching comments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    )
  }
}

/**
 * 在指定笔记中发布评论
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession() // 权限守卫
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parseResult = createCommentSchema.safeParse(body) // 校验评论的有效性
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid comment input',
          detials: parseResult.error.format(),
        },
        { status: 400 }
      )
    }
    const { content } = parseResult.data // 评论的内容

    await connectDB()
    const { id: postId } = await params

    const targetPost = await Post.findById(postId) // 查询笔记
    if (!targetPost) {
      return NextResponse.json(
        {
          error: 'Post not found',
        },
        { status: 404 }
      )
    }

    // 创建评论
    const newComment = await Comment.create({
      content,
      post: postId,
      author: session.userId,
    })
    await Post.findByIdAndUpdate(postId, { $inc: { commentCount: 1 } })

    // 填充评论作者信息并返回
    const populatedComment = await Comment.findById(newComment._id)
      .populate('author', 'username avatar')
      .lean()

    return NextResponse.json(populatedComment, { status: 201 })
  } catch (error) {
    console.error('Error creating comment:', error)
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    )
  }
}
