import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import BottomNav from './components/BottomNav'
import Home from './pages/Home'
import Publish from './pages/Publish'
import Me from './pages/Me'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/publish" element={<Publish />} />
          <Route path="/me" element={<Me />} />
        </Routes>
        <BottomNav />
      </div>
    </Router>
  )
}

export default App
