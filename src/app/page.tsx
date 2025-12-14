import HomePageClient from '@/features/home/ui/HomePageClient'
import connectDB from '@/server/db'
import postService from '@/server/services/postService'
import { FETCH_LIMIT } from '@today-red-note/types'
// 确保相关模型已注册，因为 postService 会使用 populate
import '@/server/models/userModel'
import '@/server/models/tagModel'
import '@/server/models/topicModel'

// 首屏缓存策略：ISR 60秒重新验证
export const revalidate = 60

export default async function Page() {
  await connectDB()

  // SSR 获取首屏数据
  // 复用 postService.getPosts，与客户端 API 保持一致
  // 未登录用户使用公共信息流
  const result = await postService.getPosts(FETCH_LIMIT)

  return <HomePageClient initialPosts={result.posts} />
}
