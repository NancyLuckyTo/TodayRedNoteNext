import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import BottomNav from './components/BottomNav'
import HomePage from './pages/HomePage'
import CreatePostPage from './pages/CreatePostPage'
import ProfilePage from './pages/ProfilePage'
import LoginPage from './pages/LoginPage'
import PrivateRoute from './components/PrivateRoute'
import { useAuthStore } from './store/auth'
import { Toaster } from '@/components/ui/sonner'

function App() {
  const initialize = useAuthStore(s => s.initialize)
  useEffect(() => {
    initialize()
  }, [initialize])

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
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
        </Routes>
        <BottomNav />
        <Toaster richColors />
      </div>
    </Router>
  )
}

export default App
