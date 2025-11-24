import { URL } from 'url'
import Post from '../models/postModel.js'
import getOssClient from '../services/storageService.js'
import { processImageUrl, calculateRatioType } from '../utils/imageUtils.js'
import { IMAGE_RATIO, IMAGE_QUALITY } from '@today-red-note/types'
import { extractTopic, extractTags } from '../services/aiService.js'
import topicService from '../services/topicService.js'
import tagService from '../services/tagService.js'
import userProfileService from '../services/userProfileService.js'

const MAX_RELATED_NOTES = 10 // 笔记详情页相关笔记最大数量

const normalizeImages = (images: any[]) =>
  images
    .filter((img: any) => img && typeof img.url === 'string' && img.url)
    .map((img: any) => ({
      url: String(img.url),
      width:
        typeof img.width === 'number' && Number.isFinite(img.width)
          ? img.width
          : 0,
      height:
        typeof img.height === 'number' && Number.isFinite(img.height)
          ? img.height
          : 0,
    }))

class PostService {
  async createPost(userId: string, data: any) {
    const { body, bodyPreview, images } = data

    if (!body || !String(body).trim()) {
      throw new Error('Body are required')
    }

    const bodyStr = String(body).trim()
    const payload: any = {
      body: bodyStr,
      author: userId,
    }

    payload.bodyPreview = bodyPreview ? bodyPreview : ''

    if (Array.isArray(images)) {
      if (images.length > 18) {
        throw new Error('Max 18 images')
      }

      const validImages = normalizeImages(images)

      if (validImages.length > 0) {
        payload.coverRatio = calculateRatioType(validImages[0])
      }

      payload.images = validImages
    }

    try {
      const topicName = await extractTopic(bodyStr)
      const topic = await topicService.getOrCreateTopic(topicName)
      payload.topic = topic._id
    } catch (error) {
      console.error('Topic generation failed:', error)
    }

    // AI 提取标签
    try {
      const tagNames = await extractTags(bodyStr)
      const tagIds = await tagService.getOrCreateTags(tagNames)
      payload.tags = tagIds
    } catch (error) {
      console.error('Tag extraction failed:', error)
    }

    const post = await Post.create(payload)

    if (payload.topic) {
      topicService.incrementTopicCount(payload.topic).catch(console.error)
    }

    if (payload.tags && payload.tags.length > 0) {
      tagService.incrementTagCounts(payload.tags).catch(console.error)
    }

    return post
  }

  async getPostById(id: string, currentUserId?: string) {
    const post = await Post.findById(id)
      .populate('author', 'username')
      .populate('topic', 'name')
      .populate('tags', 'name')

    if (!post) return null

    if (currentUserId) {
      userProfileService
        .trackUserBehavior(currentUserId, id, 'view')
        .catch(console.error)
    }

    const hasImages = Array.isArray(post.images) && post.images.length > 0
    const processedImages = hasImages
      ? post.images.map((img: any) => ({
          ...img,
          url: processImageUrl(img.url, IMAGE_QUALITY.PREVIEW),
        }))
      : []

    return {
      ...post.toObject(),
      images: processedImages,
    }
  }

  async getRelatedPosts(id: string) {
    const currentPost = await Post.findById(id)
    if (!currentPost) return null

    // 构建复杂推荐查询：优先标签匹配，其次话题匹配
    const matchByTags =
      currentPost.tags && currentPost.tags.length > 0
        ? {
            _id: { $ne: currentPost._id },
            tags: { $in: currentPost.tags },
          }
        : null

    const matchByTopic = currentPost.topic
      ? {
          _id: { $ne: currentPost._id },
          topic: currentPost.topic,
          // 排除已通过标签匹配的
          ...(matchByTags ? { tags: { $nin: currentPost.tags } } : {}),
        }
      : null

    // 分别获取标签匹配和话题匹配的笔记
    const tagMatchedPosts = matchByTags
      ? await Post.find(matchByTags)
          .sort({ createdAt: -1 })
          .limit(MAX_RELATED_NOTES)
          .populate('author', 'username avatar')
          .populate('topic', 'name')
          .populate('tags', 'name')
          .lean()
      : []

    const topicMatchedPosts = matchByTopic
      ? await Post.find(matchByTopic)
          .sort({ createdAt: -1 })
          .limit(MAX_RELATED_NOTES - tagMatchedPosts.length)
          .populate('author', 'username avatar')
          .populate('topic', 'name')
          .populate('tags', 'name')
          .lean()
      : []

    // 合并结果：标签匹配优先
    const posts = [...tagMatchedPosts, ...topicMatchedPosts].slice(
      0,
      MAX_RELATED_NOTES
    )

    return posts.map((post: any) => {
      const hasImages = Array.isArray(post.images) && post.images.length > 0
      const processedImages = hasImages
        ? post.images.map((img: any) => ({
            ...img,
            url: processImageUrl(img.url, IMAGE_QUALITY.THUMBNAIL),
          }))
        : []

      return {
        ...post,
        images: processedImages,
        coverRatio: post.coverRatio,
        isTextOnly: !hasImages,
      }
    })
  }

  async updatePost(id: string, userId: string, data: any) {
    const found = await Post.findById(id)
    if (!found) return null
    if (found.author.toString() !== userId) {
      throw new Error('Forbidden')
    }

    const { body, bodyPreview, images } = data
    const update: any = {}

    if (typeof body === 'string') {
      const bodyStr = body.trim()
      update.body = bodyStr
      update.bodyPreview = bodyPreview ? bodyPreview : ''
    }
    if (Array.isArray(images)) {
      if (images.length > 18) {
        throw new Error('Max 18 images')
      }

      const validImages = normalizeImages(images)

      if (validImages.length > 0) {
        update.coverRatio = calculateRatioType(validImages[0])
      } else {
        update.coverRatio = IMAGE_RATIO.NONE
      }

      update.images = validImages
    }

    return await Post.findByIdAndUpdate(id, update, { new: true })
  }

  async deletePost(id: string, userId: string) {
    const found = await Post.findById(id)
    if (!found) return null
    if (found.author.toString() !== userId) {
      throw new Error('Forbidden')
    }

    const images = Array.isArray(found.images) ? found.images : []
    if (images.length) {
      const objectKeys = images
        .map(img => {
          try {
            const parsed = new URL(String(img.url))
            return parsed.pathname.replace(/^\/+/, '')
          } catch {
            return null
          }
        })
        .filter((key): key is string => Boolean(key))

      if (objectKeys.length) {
        const client = getOssClient()
        if (objectKeys.length === 1) {
          await client.delete(objectKeys[0])
        } else {
          await client.deleteMulti(objectKeys, { quiet: true })
        }
      }
    }

    await found.deleteOne()
    return true
  }

  async getPosts(limit: number, cursor?: string) {
    let query: any = {}

    if (cursor) {
      try {
        const decoded = JSON.parse(
          Buffer.from(cursor, 'base64').toString('utf-8')
        )
        const cursorTime = new Date(decoded.createdAt)
        const cursorId = decoded._id

        query = {
          $or: [
            { createdAt: { $lt: cursorTime } },
            { createdAt: cursorTime, _id: { $lt: cursorId } },
          ],
        }
      } catch (err) {
        query = {}
      }
    }

    const posts = await Post.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1)
      .populate('author', 'username avatar')
      .populate('topic', 'name')
      .populate('tags', 'name')
      .lean()

    const hasNextPage = posts.length > limit
    if (hasNextPage) {
      posts.pop()
    }

    const formattedPosts = posts.map((post: any) => {
      const hasImages = Array.isArray(post.images) && post.images.length > 0
      const processedImages = hasImages
        ? post.images.map((img: any) => ({
            ...img,
            url: processImageUrl(img.url, IMAGE_QUALITY.THUMBNAIL),
          }))
        : []

      return {
        ...post,
        images: processedImages,
        coverRatio: post.coverRatio,
        isTextOnly: !hasImages,
      }
    })

    let nextCursor = null
    if (hasNextPage && formattedPosts.length > 0) {
      const lastPost = formattedPosts[formattedPosts.length - 1]
      const cursorPayload = JSON.stringify({
        createdAt: lastPost.createdAt,
        _id: lastPost._id,
      })
      nextCursor = Buffer.from(cursorPayload).toString('base64')
    }

    return {
      posts: formattedPosts,
      pagination: {
        nextCursor,
        hasNextPage,
        limit,
      },
    }
  }
}

export default new PostService()
