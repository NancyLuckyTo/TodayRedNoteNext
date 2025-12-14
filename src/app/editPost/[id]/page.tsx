import PostEditorClient from '@/features/post/ui/PostEditorClient'
import connectDB from '@/server/db'
import postService from '@/server/services/postService'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditPostPage({ params }: Props) {
  await connectDB()
  const { id } = await params
  const post = await postService.getPostById(id)

  if (!post) {
    notFound()
  }

  return <PostEditorClient id={id} initialPost={post} />
}
