import { Navigate, useLocation } from 'react-router-dom'
import { type PropsWithChildren } from 'react'
import { useAuthStore } from '@/stores/auth'

const PrivateRoute = ({ children }: PropsWithChildren) => {
  const location = useLocation()
  const initialized = useAuthStore(s => s.initialized)
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  // 检查 useAuthStore中的 initialize() 函数是否已经执行完毕
  if (!initialized) return null
  if (!isAuthenticated) {
    // 跳转到登录页面
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  // 验证通过，渲染子组件
  return children
}

export default PrivateRoute
