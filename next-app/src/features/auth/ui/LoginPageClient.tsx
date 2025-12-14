'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuthStore } from '@/stores/auth'
import { useHomeStore } from '@/stores/homeStore'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { loginAction, registerAction } from '../actions'
import {
  loginSchema,
  registerSchema,
  type LoginFormValues,
  type RegisterFormValues,
} from '../schemas'

const LoginPage = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get('from')
  const setUser = useAuthStore(s => s.setUser)
  const resetHome = useHomeStore(s => s.reset)
  const [isPending, startTransition] = useTransition()
  const [activeTab, setActiveTab] = useState('login')

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  })

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      password: '',
      confirmPassword: '',
    },
  })

  const onLogin = async (data: LoginFormValues) => {
    startTransition(async () => {
      const formData = new FormData()
      formData.append('username', data.username)
      formData.append('password', data.password)

      const result = await loginAction({}, formData)

      if (result.success && result.user) {
        setUser({
          _id: result.user.id,
          username: result.user.username,
          avatar: undefined, // Server action doesn't return avatar yet, can be added if needed
        })
        resetHome()
        router.push(from || '/profile')
        router.refresh()
      } else {
        toast.error(result.message || '登录失败')
      }
    })
  }

  const onRegister = async (data: RegisterFormValues) => {
    startTransition(async () => {
      const formData = new FormData()
      formData.append('username', data.username)
      formData.append('password', data.password)
      formData.append('confirmPassword', data.confirmPassword)

      const result = await registerAction({}, formData)

      if (result.success && result.user) {
        setUser({
          _id: result.user.id,
          username: result.user.username,
          avatar: undefined,
        })
        resetHome()
        router.push('/profile')
        router.refresh()
      } else {
        toast.error(result.message || '注册失败')
      }
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>账号</CardTitle>
          <CardDescription>登录或注册以继续</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="login">登录</TabsTrigger>
              <TabsTrigger value="register">注册</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-4">
              <form
                onSubmit={loginForm.handleSubmit(onLogin)}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="login-username">账号</Label>
                  <Input
                    id="login-username"
                    {...loginForm.register('username')}
                    placeholder="请输入账号"
                  />
                  {loginForm.formState.errors.username && (
                    <p className="text-sm text-red-500">
                      {loginForm.formState.errors.username.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">密码</Label>
                  <Input
                    id="login-password"
                    type="password"
                    {...loginForm.register('password')}
                    placeholder="请输入密码"
                  />
                  {loginForm.formState.errors.password && (
                    <p className="text-sm text-red-500">
                      {loginForm.formState.errors.password.message}
                    </p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending ? '登录中...' : '登录'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register" className="mt-4">
              <form
                onSubmit={registerForm.handleSubmit(onRegister)}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="register-username">账号</Label>
                  <Input
                    id="register-username"
                    {...registerForm.register('username')}
                    placeholder="NancyLucky"
                  />
                  {registerForm.formState.errors.username && (
                    <p className="text-sm text-red-500">
                      {registerForm.formState.errors.username.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password">密码</Label>
                  <Input
                    id="register-password"
                    type="password"
                    {...registerForm.register('password')}
                    placeholder="至少 8 位"
                  />
                  {registerForm.formState.errors.password && (
                    <p className="text-sm text-red-500">
                      {registerForm.formState.errors.password.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">确认密码</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    {...registerForm.register('confirmPassword')}
                    placeholder="再次输入密码"
                  />
                  {registerForm.formState.errors.confirmPassword && (
                    <p className="text-sm text-red-500">
                      {registerForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending ? '注册中...' : '创建账号'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="justify-center text-xs text-muted-foreground">
          继续即表示同意服务协议与隐私政策
        </CardFooter>
      </Card>
    </div>
  )
}

export default LoginPage
