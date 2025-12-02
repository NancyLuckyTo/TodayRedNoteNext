import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/auth'
import { Settings, Plus, Info, Search, Lock, LogOut } from 'lucide-react'
import { getDefaultAvatar } from '@/lib/avatarUtils'
import { WaterfallContainer } from '../components/WaterfallContainer'
import { PostCard } from '../components/PostCard'
import api from '@/lib/api'
import { calculatePostHeight, normalizePost } from '@/lib/postUtils'
import { Spinner } from '@/components/ui/spinner'
import { useProfilePostsStore } from '@/store/profilePostsStore'
import type { PostsResponse } from '@/types/posts'
import { ROOT_MARGIN_VALUE } from '@/constants/post'
import { FETCH_LIMIT, PRIORITY_LIMIT } from '@today-red-note/types'

const ProfilePage = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const {
    posts,
    nextCursor,
    hasNextPage,
    scrollPosition,
    setPosts,
    setPagination,
    setScrollPosition,
    reset,
  } = useProfilePostsStore()

  const onLogout = () => {
    logout()
    reset()
    navigate('/login', { replace: true })
  }

  // 激活的选项卡: 笔记、收藏、赞过
  const [activeTab, setActiveTab] = useState<'notes' | 'saved' | 'liked'>(
    'notes'
  )

  const [isInitialLoading, setIsInitialLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasLoadedInitial, setHasLoadedInitial] = useState(false)

  const columnWidth = (window.innerWidth - 12) / 2

  const isEmpty = useMemo(
    () => !posts.length && !isInitialLoading && hasLoadedInitial,
    [posts, isInitialLoading, hasLoadedInitial]
  )

  const fetchUserPosts = useCallback(
    async (options?: { cursor?: string | null; append?: boolean }) => {
      const { cursor, append = false } = options ?? {}
      setError(null)

      if (append) {
        setIsLoadingMore(true)
      } else {
        setIsInitialLoading(true)
      }

      try {
        const { data } = await api.get<PostsResponse>('/posts/mine', {
          params: {
            cursor: cursor ?? undefined,
            limit: FETCH_LIMIT,
          },
        })

        const normalizedPosts = (data.posts ?? []).map(normalizePost)

        if (!append) {
          setPosts(normalizedPosts)
        } else {
          setPosts(prevPosts => {
            const existingIds = new Set(prevPosts.map(p => p._id))
            const newPosts = normalizedPosts.filter(
              p => !existingIds.has(p._id)
            )
            return [...prevPosts, ...newPosts]
          })
        }

        setPagination(
          data.pagination?.nextCursor ?? null,
          Boolean(data.pagination?.hasNextPage)
        )
      } catch (err) {
        console.error(err)
        setError(
          err instanceof Error ? err.message : '获取笔记失败，请稍后再试'
        )
      } finally {
        if (append) {
          setIsLoadingMore(false)
        } else {
          setIsInitialLoading(false)
        }
        setHasLoadedInitial(true)
      }
    },
    [setPagination, setPosts]
  )

  useEffect(() => {
    if (activeTab === 'notes' && !hasLoadedInitial && !isInitialLoading) {
      fetchUserPosts()
    }
  }, [activeTab, fetchUserPosts, hasLoadedInitial, isInitialLoading])

  useEffect(() => {
    if (scrollPosition > 0) {
      window.scrollTo(0, scrollPosition)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      setScrollPosition(window.scrollY)
    }

    window.addEventListener('scroll', handleScroll)
    return () => {
      setScrollPosition(window.scrollY)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [setScrollPosition])

  const handlePostClick = useCallback(
    (postId: string) => {
      setScrollPosition(window.scrollY)
      navigate(`/post/${postId}`, {
        state: { disableRecommendations: true },
      })
    },
    [navigate, setScrollPosition]
  )

  const observerTarget = useRef<HTMLDivElement | null>(null)

  const handleLoadMore = useCallback(() => {
    if (!hasNextPage || isLoadingMore) return
    fetchUserPosts({ cursor: nextCursor, append: true })
  }, [fetchUserPosts, hasNextPage, isLoadingMore, nextCursor])

  useEffect(() => {
    if (activeTab !== 'notes') return
    const element = observerTarget.current
    if (!element || !hasNextPage || isLoadingMore) return

    const observer = new IntersectionObserver(
      entries => {
        const first = entries[0]
        if (first && first.isIntersecting) {
          handleLoadMore()
        }
      },
      {
        root: null,
        threshold: 0.1,
        rootMargin: ROOT_MARGIN_VALUE,
      }
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [activeTab, hasNextPage, isLoadingMore, handleLoadMore])

  return (
    <div className="min-h-screen">
      {/* 头部容器 */}
      <div className="bg-linear-to-b from-gray-600 to-gray-500 px-6 pt-8 pb-6">
        {/* 头像、昵称、简介 */}
        <div className="flex items-start gap-4 mb-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-400">
              <img
                src={getDefaultAvatar(user?.username, 96)}
                alt="avatar"
                className="w-full h-full object-cover"
              />
            </div>
            {/* 黄色加号按钮 */}
            <button className="absolute bottom-0 right-0 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center shadow-md">
              <Plus className="w-5 h-5 text-gray-900" strokeWidth={3} />
            </button>
          </div>

          {/* 右侧文字信息区域：flex-1 占满剩余宽度 */}
          <div className="flex-1 pt-2">
            <div className="flex items-center justify-between">
              <h1 className="text-white text-xl font-bold mb-2">
                {user?.username || '用户'}
              </h1>
              <Button variant="ghost" onClick={onLogout}>
                {<LogOut className="w-5 h-5 text-gray-300" />}
              </Button>
            </div>
            <div className="flex items-center gap-2 text-gray-200 text-sm mb-1.5">
              <span>今日号: 18923080116</span>
            </div>
            <div className="flex items-center gap-1 text-gray-200 text-sm">
              <span>IP 属地: 湖北</span>
              <Info className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="text-gray-300 text-sm mb-2">点击这里，填写简介</div>
        </div>

        <div className="flex items-center justify-between">
          {/* 关注、粉丝、获赞数据 */}
          <div className="flex gap-8">
            <div className="text-center">
              <div className="text-white text-xl font-semibold mb-1">0</div>
              <div className="text-gray-300 text-xs">关注</div>
            </div>
            <div className="text-center">
              <div className="text-white text-xl font-semibold mb-1">0</div>
              <div className="text-gray-300 text-xs">粉丝</div>
            </div>
            <div className="text-center">
              <div className="text-white text-xl font-semibold mb-1">0</div>
              <div className="text-gray-300 text-xs">获赞与收藏</div>
            </div>
          </div>

          <div className="flex gap-3">
            <button className="px-6 py-2 rounded-full border-2 border-white/30 text-white text-sm font-medium">
              编辑资料
            </button>
            <button className="w-10 h-10 rounded-full border-2 border-white/30 flex items-center justify-center">
              <Settings className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* 笔记卡片容器 */}
      <div className="bg-gray-100 rounded-t-3xl min-h-[70vh]">
        {/* 吸顶导航栏 */}
        <div className="sticky top-0 bg-white z-10 border-b border-gray-100">
          <div className="flex items-center px-6 pt-3 pb-3">
            {/* 标签页按钮组 */}
            <div className="flex-1 flex gap-10">
              {/* 笔记 Tab */}
              <button
                onClick={() => setActiveTab('notes')}
                className={`relative pb-1 text-base font-medium ${
                  activeTab === 'notes' ? 'text-gray-900' : 'text-gray-400'
                }`}
              >
                笔记
                {activeTab === 'notes' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500"></div>
                )}
              </button>
              {/* 收藏 Tab */}
              <button
                onClick={() => setActiveTab('saved')}
                className={`relative pb-1 text-base font-medium ${
                  activeTab === 'saved' ? 'text-gray-900' : 'text-gray-400'
                }`}
              >
                收藏
                {activeTab === 'saved' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500"></div>
                )}
              </button>
              {/* 赞过 Tab */}
              <button
                onClick={() => setActiveTab('liked')}
                className={`relative pb-1 flex items-center gap-1.5 text-base font-medium ${
                  activeTab === 'liked' ? 'text-gray-900' : 'text-gray-400'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                赞过
                {activeTab === 'liked' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500"></div>
                )}
              </button>
            </div>
            <Search className="w-5 h-5 text-gray-400" />
          </div>
        </div>

        <div className="px-1 pb-20">
          {activeTab === 'notes' && (
            <>
              {isInitialLoading && !posts.length ? (
                <div className="flex justify-center items-center py-10">
                  <Spinner />
                </div>
              ) : null}

              {!isEmpty && (
                <WaterfallContainer>
                  {posts.map((post, index) => (
                    <PostCard
                      key={post._id}
                      post={post}
                      onClick={() => handlePostClick(post._id)}
                      data-waterfall-height={calculatePostHeight(
                        post,
                        columnWidth
                      )}
                      priority={index < PRIORITY_LIMIT}
                    />
                  ))}
                </WaterfallContainer>
              )}

              {isEmpty && !error && (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <p className="text-sm">你还没有发布任何笔记</p>
                  <Button
                    className="border bg-background text-black px-3 py-4 mt-4 rounded-full"
                    onClick={() => navigate('/createPost')}
                  >
                    去发布
                  </Button>
                </div>
              )}

              {error && posts.length ? (
                <div className="px-4 pt-4">
                  <div className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    {error}
                  </div>
                </div>
              ) : null}

              <div className="flex w-full justify-center px-4 py-6">
                <div
                  ref={observerTarget}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  {isLoadingMore ? <Spinner /> : null}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProfilePage
