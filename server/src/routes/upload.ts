import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import auth, { AuthRequest } from '../middleware/auth'
import getOssClient from '../services/storageService'

const router = Router()

// 授权客户端直接将文件上传到云存储
router.post('/request-url', auth, async (req: AuthRequest, res, next) => {
  try {
    const { filename, contentType } = req.body ?? {}
    if (!filename || !contentType) {
      return res
        .status(400)
        .json({ message: 'filename and contentType are required' })
    }

    // 从 auth 中间件获取已登录的 userId
    const userId = req.userId
    if (!userId) return res.status(401).json({ message: 'Unauthorized' })

    // 文件名清理
    const safeName = String(filename).replace(/[^a-zA-Z0-9._-]/g, '_')
    // 将每个用户的文件存储在以其 userId 命名的“文件夹”中，便于管理和设置权限
    const objectName = `${userId}/${uuidv4()}_${safeName}`

    const client = getOssClient()
    const expires = 300 // seconds
    const uploadUrl = client.signatureUrl(objectName, {
      method: 'PUT',
      expires,
      'Content-Type': String(contentType),
    })

    const region = process.env.ALI_OSS_REGION as string
    const bucket = process.env.ALI_OSS_BUCKET as string
    const publicUrl = `https://${bucket}.${region}.aliyuncs.com/${objectName}`

    return res.json({ uploadUrl, publicUrl, objectName, expires })
  } catch (err) {
    next(err)
  }
})

// 批量申请直传 URL（一次最多 18 个）
router.post('/request-urls', auth, async (req: AuthRequest, res, next) => {
  try {
    const files = Array.isArray(req.body?.files) ? req.body.files : []
    if (!files.length) {
      return res.status(400).json({ message: 'files is required' })
    }
    if (files.length > 18) {
      return res.status(400).json({ message: 'Max 18 files' })
    }

    const userId = req.userId
    if (!userId) return res.status(401).json({ message: 'Unauthorized' })

    const client = getOssClient()
    const expires = 300 // seconds
    const region = process.env.ALI_OSS_REGION as string
    const bucket = process.env.ALI_OSS_BUCKET as string

    const results = files.map((f: any) => {
      const filename = String(f?.filename || '')
      const contentType = String(f?.contentType || '')
      if (!filename || !contentType)
        throw new Error('filename and contentType are required for each file')
      const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
      const objectName = `${userId}/${uuidv4()}_${safeName}`
      const uploadUrl = client.signatureUrl(objectName, {
        method: 'PUT',
        expires,
        'Content-Type': contentType,
      })
      const publicUrl = `https://${bucket}.${region}.aliyuncs.com/${objectName}`
      return { uploadUrl, publicUrl, objectName, expires }
    })

    return res.json({ items: results, expires })
  } catch (err) {
    next(err)
  }
})

export default router
