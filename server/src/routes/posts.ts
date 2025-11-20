import { Router } from 'express'
import { URL } from 'url'
import auth, { AuthRequest } from '../middleware/auth.js'
import Post from '../models/postModel.js'
import getOssClient from '../services/storageService.js'
import type { ImageRatio } from '@today-red-note/types'
import { IMAGE_RATIO } from '@today-red-note/types'

const RATIO_THRESHOLD = {
  // 宽高比大于 1.2 视为横图
  LANDSCAPE_MIN: 1.2,
  // 宽高比小于 0.8 视为竖图
  PORTRAIT_MAX: 0.8,
} as const

const router = Router()

// 计算图片比例类型
const calculateRatioType = (image: {
  width: number
  height: number
}): ImageRatio => {
  if (image.width === 0 || image.height === 0) return IMAGE_RATIO.NONE
  const ratio = image.width / image.height
  if (ratio > RATIO_THRESHOLD.LANDSCAPE_MIN) return IMAGE_RATIO.LANDSCAPE
  if (ratio < RATIO_THRESHOLD.PORTRAIT_MAX) return IMAGE_RATIO.PORTRAIT
  return IMAGE_RATIO.SQUARE
}

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

// 发布笔记
router.post('/', auth, async (req: AuthRequest, res, next) => {
  try {
    // 获取输入
    const { body, images, tags } = req.body ?? {}

    // 验证输入
    if (!body || !String(body).trim()) {
      return res.status(400).json({ message: 'Body are required' })
    }

    // 身份验证
    const author = req.userId
    if (!author) return res.status(401).json({ message: 'Unauthorized' })

    // 构建数据库载荷
    const payload: any = {
      body: String(body).trim(),
      author,
    }

    // 处理可选字段
    if (Array.isArray(tags)) payload.tags = tags.map((t: any) => String(t))

    if (Array.isArray(images)) {
      if (images.length > 18) {
        return res.status(400).json({ message: 'Max 18 images' })
      }

      const validImages = normalizeImages(images)

      if (validImages.length > 0) {
        payload.coverRatio = calculateRatioType(validImages[0])
      }

      payload.images = validImages
    }

    // 创建笔记
    const post = await Post.create(payload)
    return res.status(201).json({ post })
  } catch (err) {
    next(err)
  }
})

// 获取笔记详情，联表作者信息
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const post = await Post.findById(id).populate('author', 'username')
    if (!post) return res.status(404).json({ message: 'Not found' })
    return res.json({ post })
  } catch (err) {
    next(err)
  }
})

// 更新笔记
router.put('/:id', auth, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params
    const found = await Post.findById(id)
    if (!found) return res.status(404).json({ message: 'Not found' })
    if (!req.userId || found.author.toString() !== req.userId) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const { body, images, tags } = req.body ?? {}
    const update: any = {}
    if (typeof body === 'string') update.body = body.trim()
    if (Array.isArray(tags)) update.tags = tags.map((t: any) => String(t))
    if (Array.isArray(images)) {
      if (images.length > 18) {
        return res.status(400).json({ message: 'Max 18 images' })
      }

      const validImages = normalizeImages(images)

      if (validImages.length > 0) {
        update.coverRatio = calculateRatioType(validImages[0])
      } else {
        update.coverRatio = IMAGE_RATIO.NONE
      }

      update.images = validImages
    }

    const post = await Post.findByIdAndUpdate(id, update, { new: true })
    return res.json({ post })
  } catch (err) {
    next(err)
  }
})

// 删除笔记
router.delete('/:id', auth, async (req: AuthRequest, res, next) => {
  try {
    // 查找与授权
    const { id } = req.params
    const found = await Post.findById(id)
    if (!found) return res.status(404).json({ message: 'Not found' })
    // 比较帖子的作者 ID 和 当前发起请求的用户 ID
    if (!req.userId || found.author.toString() !== req.userId) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const images = Array.isArray(found.images) ? found.images : []
    // 只有当帖子包含图片时才执行清理逻辑
    if (images.length) {
      const bucket = process.env.ALI_OSS_BUCKET
      const region = process.env.ALI_OSS_REGION
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

    // 把这条笔记记录从 MongoDB 中彻底删除
    await found.deleteOne()
    return res.status(204).end()
  } catch (err) {
    next(err)
  }
})

// 获取笔记列表
router.get('/', async (req, res, next) => {
  try {
    // 限制最多一次获取 50 条
    const limit = Math.min(
      parseInt(String(req.query.limit as string)) || 10,
      50
    )
    const cursor = req.query.cursor as string | undefined

    // 构建查询条件
    let query: any = {}

    // 解码游标
    if (cursor) {
      try {
        // 游标结构: { createdAt: string, _id: string }
        const decoded = JSON.parse(
          Buffer.from(cursor, 'base64').toString('utf-8')
        )
        const cursorTime = new Date(decoded.createdAt)
        const cursorId = decoded._id

        // 查找 (发布时间 < 游标时间) 或者 (时间相同 但 ID 更小) 的记录
        query = {
          $or: [
            { createdAt: { $lt: cursorTime } },
            { createdAt: cursorTime, _id: { $lt: cursorId } },
          ],
        }
      } catch (err) {
        // 如果游标解析失败则忽略它，重置为第一页
        query = {}
      }
    }

    // 查询数据库，limit + 1 条是为了判断是否有下一页
    const posts = await Post.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1)
      .populate('author', 'username avatar')
      .lean()

    // 判断是否有下一页
    const hasNextPage = posts.length > limit
    if (hasNextPage) {
      posts.pop()
    }

    const formattedPosts = posts.map((post: any) => {
      const hasImages = Array.isArray(post.images) && post.images.length > 0

      return {
        ...post,
        coverRatio: post.coverRatio,
        isTextOnly: !hasImages,
      }
    })

    // 构建下一页游标
    let nextCursor = null
    if (hasNextPage && formattedPosts.length > 0) {
      const lastPost = formattedPosts[formattedPosts.length - 1]
      // 将最后一条数据的关键排序字段编码为 Base64（安全性）
      const cursorPayload = JSON.stringify({
        createdAt: lastPost.createdAt,
        _id: lastPost._id,
      })
      nextCursor = Buffer.from(cursorPayload).toString('base64')
    }

    return res.json({
      posts: formattedPosts,
      pagination: {
        nextCursor, // 前端翻页时需携带
        hasNextPage,
        limit,
      },
    })
  } catch (err) {
    next(err)
  }
})

export default router
