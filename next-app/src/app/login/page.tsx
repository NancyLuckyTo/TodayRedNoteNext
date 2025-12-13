import { Suspense } from 'react'
import LoginPageClient from '@/features/auth/ui/LoginPageClient'

const LoginPage = () => {
  return (
    <Suspense fallback={null}>
      <LoginPageClient />
    </Suspense>
  )
}

export default LoginPage
