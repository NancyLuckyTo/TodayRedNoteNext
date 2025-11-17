import { Router } from 'express'
import { URL } from 'url'
import auth, { AuthRequest } from '../middleware/auth'
import Post from '../models/postModel'
import getOssClient from '../services/storageService'

const router = Router()

// 创建帖子（需要登录）
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
      payload.images = images
        .filter((img: any) => img && typeof img.url === 'string' && img.url)
        .map((img: any) => ({
          url: String(img.url),
          width:
            typeof img.width === 'number' && Number.isFinite(img.width)
              ? img.width
              : undefined,
          height:
            typeof img.height === 'number' && Number.isFinite(img.height)
              ? img.height
              : undefined,
        }))
    }

    // 创建帖子
    const post = await Post.create(payload)
    return res.status(201).json({ post })
  } catch (err) {
    next(err)
  }
})

// 获取帖子详情（联表作者信息）
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

// 更新帖子
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
      update.images = images
        .filter((img: any) => img && typeof img.url === 'string' && img.url)
        .map((img: any) => ({
          url: String(img.url),
          width:
            typeof img.width === 'number' && Number.isFinite(img.width)
              ? img.width
              : undefined,
          height:
            typeof img.height === 'number' && Number.isFinite(img.height)
              ? img.height
              : undefined,
        }))
    }

    const post = await Post.findByIdAndUpdate(id, update, { new: true })
    return res.json({ post })
  } catch (err) {
    next(err)
  }
})

// 删除帖子
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

    // 把这条帖子记录从 MongoDB 中彻底删除
    await found.deleteOne()
    return res.status(204).end()
  } catch (err) {
    next(err)
  }
})

export default router
