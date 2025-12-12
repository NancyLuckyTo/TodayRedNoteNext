import OSS from 'ali-oss'

let client: InstanceType<typeof OSS> | null = null

// ali-oss 客户端实例
export function getOssClient() {
  if (client) return client

  const region = process.env.ALI_OSS_REGION as string
  const accessKeyId = process.env.ALI_OSS_ACCESS_KEY_ID as string
  const accessKeySecret = process.env.ALI_OSS_ACCESS_KEY_SECRET as string
  const bucket = process.env.ALI_OSS_BUCKET as string

  if (!region || !accessKeyId || !accessKeySecret || !bucket) {
    throw new Error('Missing ALI_OSS_* environment variables')
  }

  client = new OSS({
    region,
    accessKeyId,
    accessKeySecret,
    bucket,
    secure: true,
  })
  return client
}

export default getOssClient
