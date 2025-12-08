import Comment from '../models/commentModel.js'
import Post from '../models/postModel.js'

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

    await comment.populate('author', 'username avatar')

    return comment.toObject()
  }
}

export default new CommentService()
