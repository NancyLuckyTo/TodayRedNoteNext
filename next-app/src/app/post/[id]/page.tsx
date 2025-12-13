import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import connectDB from '@/lib/db'
import postService from '@/services/postService'
import PostDetailClient from '@/components/PostDetailClient'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await connectDB()
  const { id } = await params
  const post = await postService.getPostById(id)

  if (!post) {
    return {
      title: '笔记不存在',
    }
  }

  return {
    title: post.body?.slice(0, 20) || '笔记详情',
    description: post.bodyPreview || post.body?.slice(0, 100),
  }
}

export default async function PostPage({ params }: Props) {
  await connectDB()
  const { id } = await params
  const post = await postService.getPostById(id)

  if (!post) {
    notFound()
  }

  return <PostDetailClient post={post} />
}
