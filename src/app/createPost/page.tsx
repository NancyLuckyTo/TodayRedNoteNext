import PostEditorClient from '@/features/post/ui/PostEditorClient'
import { Suspense } from 'react'
import { Spinner } from '@/components/ui/spinner'

export default function CreatePostPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh items-center justify-center">
          <Spinner />
        </div>
      }
    >
      <SearchParamsWrapper searchParams={searchParams} />
    </Suspense>
  )
}

async function SearchParamsWrapper({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { topic } = await searchParams
  const initialTopic = typeof topic === 'string' ? topic : undefined

  return <PostEditorClient initialTopic={initialTopic} />
}
