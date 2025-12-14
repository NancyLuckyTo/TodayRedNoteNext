import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getSession } from '@/server/auth'
import getOssClient from '@/server/services/storageService'

const CACHE_CONTROL = 'public, max-age=31536000' // 缓存时间为 1 年
const MAX_FILES_LENGTH = 18 // 限制上传文件数量

interface UploadRequestFile {
  filename: string
  contentType: string
}

/**
 * 获取直传预签名 URL
 */
export async function POST(request: Request) {
  try {
    const user = await getSession()
    if (!user || !user.userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const files: UploadRequestFile[] = Array.isArray(body?.files)
      ? body.files
      : []

    if (!files.length) {
      return NextResponse.json(
        { message: 'files is required' },
        { status: 400 }
      )
    }
    if (files.length > MAX_FILES_LENGTH) {
      return NextResponse.json(
        { message: `Max ${MAX_FILES_LENGTH} files` },
        { status: 400 }
      )
    }

    const client = getOssClient()
    const expires = 300 // 单位秒，过期时间
    const region = process.env.ALI_OSS_REGION as string
    const bucket = process.env.ALI_OSS_BUCKET as string
    const cdnDomain = process.env.CDN_DOMAIN
    const baseUrl = cdnDomain
      ? `https://${cdnDomain}`
      : `https://${bucket}.${region}.aliyuncs.com`

    const items = files.map((f: UploadRequestFile) => {
      const filename = String(f?.filename || '')
      const contentType = String(f?.contentType || '') // 强制约束 预签名 与 上传文件 的类型匹配，防止伪造文件类型
      if (!filename || !contentType) {
        throw new Error('filename and contentType are required for each file')
      }

      const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_') // 文件名清洗
      const objectName = `${user.userId}/${uuidv4()}_${safeName}`
      const uploadUrl = client.signatureUrl(objectName, {
        method: 'PUT',
        expires,
        'Content-Type': contentType,
      })
      const publicUrl = `${baseUrl}/${objectName}`

      return {
        uploadUrl,
        publicUrl,
        objectName,
        expires,
        cacheControl: CACHE_CONTROL,
      }
    })

    return NextResponse.json({ items, expires })
  } catch (error) {
    console.error('Error generating upload URLs:', error)
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
