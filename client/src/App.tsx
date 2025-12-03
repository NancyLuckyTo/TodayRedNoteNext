import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from 'react-router-dom'
import { useEffect, lazy, Suspense } from 'react'
import BottomNav from './components/BottomNav'
import HomePage from './pages/HomePage' // 首页保持同步加载，优化 LCP
import PrivateRoute from './components/PrivateRoute'
import { useAuthStore } from './store/auth'
import { ToastProvider } from '@/components/ui/toast'
import { Spinner } from '@/components/ui/spinner'

// 非首屏页面使用懒加载，减少首次加载的 JS 体积
const PostEditorPage = lazy(() => import('./pages/PostEditorPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const PostDetailPage = lazy(() => import('./pages/PostDetailPage'))

// 页面加载中的占位组件
function PageLoading() {
  return (
    <div className="flex h-screen items-center justify-center">
      <Spinner />
    </div>
  )
}

function Layout() {
  const location = useLocation()
  const hideBottomNav =
    location.pathname.startsWith('/post/') ||
    location.pathname.startsWith('/editPost/') ||
    location.pathname === '/createPost'

  return (
    <div className="min-h-screen bg-gray-100">
      <Suspense fallback={<PageLoading />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/createPost"
            element={
              <PrivateRoute>
                <PostEditorPage />
              </PrivateRoute>
            }
          />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/post/:id" element={<PostDetailPage />} />
          <Route
            path="/editPost/:id"
            element={
              <PrivateRoute>
                <PostEditorPage />
              </PrivateRoute>
            }
          />
        </Routes>
      </Suspense>

      {!hideBottomNav && <BottomNav />}
      <ToastProvider position="top-center" />
    </div>
  )
}

import { usePreventZoom } from './hooks/usePreventZoom'

function App() {
  usePreventZoom()
  const initialize = useAuthStore(s => s.initialize)
  useEffect(() => {
    initialize()
  }, [initialize])

  return (
    <Router>
      <Layout />
    </Router>
  )
}

export default App
