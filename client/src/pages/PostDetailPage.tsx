import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Search, MoreHorizontal } from 'lucide-react'
import api from '@/lib/api'
import { Spinner } from '@/components/ui/spinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { normalizePost } from '@/lib/post-utils'
import type { IPost } from '@today-red-note/types'
import { PostDetailItem } from '@/components/PostDetailItem'

const ROOT_MARGIN_VALUE = '250px'

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>() // 获取 URL 参数
  const navigate = useNavigate()
  const [posts, setPosts] = useState<IPost[]>([]) // 存储笔记列表
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 滚动加载相关
  const observerTarget = useRef<HTMLDivElement>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [shouldLoadRelated, setShouldLoadRelated] = useState(false)

  /**
   * 加载更多相关笔记
   */
  const loadMoreRelatedPosts = useCallback(async () => {
    if (isLoadingMore || !id) return

    try {
      setIsLoadingMore(true)
      // 获取相关笔记
      const { data } = await api.get(`/posts/${id}/related`)
      const newPosts = data.posts.map(normalizePost)

      // 过滤掉已存在的笔记
      setPosts(prev => {
        const existingIds = new Set(prev.map(p => p._id))
        const uniqueNewPosts = newPosts.filter(
          (p: IPost) => !existingIds.has(p._id)
        )
        return [...prev, ...uniqueNewPosts]
      })
    } catch (err) {
      console.error('Failed to load related posts:', err)
    } finally {
      setIsLoadingMore(false)
    }
  }, [isLoadingMore, id])

  // 初始加载
  useEffect(() => {
    const fetchInitialPost = async () => {
      if (!id) return

      try {
        setLoading(true)
        // 清空之前的列表，避免闪烁
        setPosts([])
        setShouldLoadRelated(false)

        const { data } = await api.get<{ post: IPost }>(`/posts/${id}`)
        const normalizedPost = normalizePost(data.post)
        setPosts([normalizedPost])

        // 触发加载相关推荐
        setShouldLoadRelated(true)
      } catch (err) {
        console.error(err)
        setError('笔记不存在')
      } finally {
        setLoading(false)
      }
    }

    fetchInitialPost()
  }, [id])

  // 在初始笔记加载完成后，加载相关推荐
  useEffect(() => {
    if (shouldLoadRelated && !loading) {
      loadMoreRelatedPosts()
      setShouldLoadRelated(false)
    }
  }, [shouldLoadRelated, loading, loadMoreRelatedPosts])

  /**
   * 监听滚动到底部
   */
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !loading && !error) {
          loadMoreRelatedPosts()
        }
      },
      { threshold: 0.1, rootMargin: ROOT_MARGIN_VALUE }
    )

    if (observerTarget.current) {
      observer.observe(observerTarget.current)
    }

    return () => observer.disconnect()
  }, [loadMoreRelatedPosts, loading, error])

  // 加载中
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner />
      </div>
    )
  }

  // 加载失败
  if (error || posts.length === 0) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <p className="text-destructive">{error || 'Post not found'}</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          返回
        </Button>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* 顶部导航栏*/}
      <header className="sticky top-0 z-50 flex items-center justify-between bg-white px-4 py-2">
        {/* 返回按钮 */}
        <Button
          variant="ghost"
          size="icon"
          className="-ml-2"
          onClick={() => navigate(-1)}
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>

        {/* 搜索框 */}
        <div className="mx-4 flex flex-1 items-center rounded-full bg-secondary px-3 py-1.5">
          <Search className="mr-2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="搜你想看的"
            className="h-auto border-0 bg-transparent p-0 text-sm focus-visible:ring-0 placeholder:text-muted-foreground"
          />
        </div>

        {/* 右侧菜单按钮 */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="-mr-2">
            <MoreHorizontal className="h-6 w-6" />
          </Button>
        </div>
      </header>

      {/* 笔记列表容器 */}
      <main className="flex-1 overflow-y-auto">
        {posts.map(post => (
          <PostDetailItem key={post._id} post={post} />
        ))}

        {/* 底部加载触发器 */}
        <div
          ref={observerTarget}
          className="flex h-10 items-center justify-center py-4"
        >
          {isLoadingMore && <Spinner className="h-6 w-6" />}
        </div>
      </main>
    </div>
  )
}
