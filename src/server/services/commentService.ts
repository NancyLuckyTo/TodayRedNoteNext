import Comment from '../models/commentModel'
import Post from '../models/postModel'

class CommentService {
  async getCommentsByPostId(postId: string) {
    const comments = await Comment.find({ post: postId })
      .sort({ createdAt: 1 })
      .populate('author', 'username avatar')
      .lean()

    return comments
  }

  async createComment(postId: string, authorId: string, content: string) {
    if (!content || !content.trim()) {
      throw new Error('Content required')
    }

    const trimmed = content.trim()

    const postExists = await Post.exists({ _id: postId })
    if (!postExists) {
      throw new Error('Post not found')
    }

    const comment = await Comment.create({
      post: postId,
      author: authorId,
      content: trimmed,
    })

    await Post.updateOne({ _id: postId }, { $inc: { commentCount: 1 } })

    await comment.populate('author', 'username avatar')

    return comment.toObject()
  }
}

const commentService = new CommentService()
export default commentService
