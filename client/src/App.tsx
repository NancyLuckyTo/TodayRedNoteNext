import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from 'react-router-dom'
import { useEffect } from 'react'
import BottomNav from './components/BottomNav'
import HomePage from './pages/HomePage'
import CreatePostPage from './pages/CreatePostPage'
import ProfilePage from './pages/ProfilePage'
import LoginPage from './pages/LoginPage'
import PrivateRoute from './components/PrivateRoute'
import PostDetailPage from './pages/PostDetailPage'
import { useAuthStore } from './store/auth'
import { Toaster } from '@/components/ui/sonner'

function Layout() {
  const location = useLocation()
  const hideBottomNav =
    location.pathname.startsWith('/post/') ||
    location.pathname === '/createPost'

  return (
    <div className="min-h-screen bg-gray-100">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/createPost"
          element={
            <PrivateRoute>
              <CreatePostPage />
            </PrivateRoute>
          }
        />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/post/:id" element={<PostDetailPage />} />
      </Routes>

      {!hideBottomNav && <BottomNav />}
      <Toaster richColors />
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
