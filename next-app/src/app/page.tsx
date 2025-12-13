import HomePageClient from '@/features/home/ui/HomePageClient'
import connectDB from '@/server/db'
import Post from '@/server/models/postModel'
import '@/server/models/userModel'
import { formatPostWithImages } from '@/server/utils/postUtils'
import { IMAGE_QUALITY, FETCH_LIMIT, type IPost } from '@today-red-note/types'

// 强制动态渲染，因为笔记列表经常更新
export const dynamic = 'force-dynamic'

export default async function Page() {
  await connectDB()

  // SSR 获取首屏数据
  // 注意：这里直接查库，不走 API Route，效率更高
  const initialPosts = await Post.find()
    .sort({ createdAt: -1 })
    .limit(FETCH_LIMIT)
    .populate('author', 'username avatar') // 填充作者信息
    .lean()

  // 序列化 MongoDB 对象 (转 String ID)
  // 并统一进行图片 URL 处理 (OSS 鉴权/压缩/WebP格式化)
  const posts: IPost[] = JSON.parse(JSON.stringify(initialPosts)).map(
    (post: IPost) =>
      formatPostWithImages(post, IMAGE_QUALITY.THUMBNAIL, true) as IPost
  )

  return <HomePageClient initialPosts={posts} />
}
