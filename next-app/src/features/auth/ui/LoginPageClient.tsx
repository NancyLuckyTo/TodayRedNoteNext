'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import api from '@/lib/api'
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
import { getErrorMessage } from '@/lib/utils'

const LoginPage = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get('from')
  const setToken = useAuthStore(s => s.setToken)
  const setUser = useAuthStore(s => s.setUser)
  const resetHome = useHomeStore(s => s.reset)

  const [loading, setLoading] = useState(false)

  const [loginAccount, setLoginAccount] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  const [regAccount, setRegAccount] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirm, setRegConfirm] = useState('')

  const onLogin = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await api.post(
        '/auth/login',
        {
          username: loginAccount,
          password: loginPassword,
        },
        {
          validateStatus: status => (status ?? 0) < 500,
        }
      )

      if (res.status === 401) {
        toast.error('登录失败，请检查账号密码')
        return
      }

      const data = res.data
      // token 由服务端设置
      const token = data?.token as string
      if (token) {
        setToken(token)

        // 获取用户信息
        await api
          .get('/auth/me')
          .then(res => {
            setUser(res.data.user)
          })
          .catch(() => undefined)

        resetHome()
        toast.success('登录成功')
        router.push(from || '/profile')
        router.refresh() // 更新服务端组件
      } else {
        toast.error('登录失败，请稍后再试')
      }
    } catch (error: unknown) {
      console.error('登录请求异常:', error)
      toast.error('登录失败，请稍后再试')
    } finally {
      setLoading(false)
    }
  }

  const onRegister = async (e: FormEvent) => {
    e.preventDefault()
    if (regPassword !== regConfirm) {
      toast.error('两次输入的密码不一致')
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/register', {
        username: regAccount,
        password: regPassword,
      })
      // 注册成功后自动登录
      const { data } = await api.post('/auth/login', {
        username: regAccount,
        password: regPassword,
      })
      const token = data?.token as string
      if (token) {
        setToken(token)
        await api
          .get('/auth/me')
          .then(res => {
            setUser(res.data.user)
          })
          .catch(() => undefined)
        resetHome()
        toast.success('注册成功')
        router.push('/profile')
        router.refresh()
      }
    } catch (error: unknown) {
      console.log(getErrorMessage(error))
      toast.error('注册失败，请稍后再试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>账号</CardTitle>
          <CardDescription>登录或注册以继续</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="login">登录</TabsTrigger>
              <TabsTrigger value="register">注册</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-4">
              <form className="space-y-4" onSubmit={onLogin}>
                <div className="space-y-2">
                  <Label htmlFor="login-account">账号</Label>
                  <Input
                    id="login-account"
                    type="text"
                    required
                    value={loginAccount}
                    onChange={e => setLoginAccount(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">密码</Label>
                  <Input
                    id="login-password"
                    type="password"
                    required
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? '登录中...' : '登录'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register" className="mt-4">
              <form className="space-y-4" onSubmit={onRegister}>
                <div className="space-y-2">
                  <Label htmlFor="reg-account">账号</Label>
                  <Input
                    id="reg-account"
                    type="text"
                    placeholder="NancyLucky"
                    required
                    value={regAccount}
                    onChange={e => setRegAccount(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password">密码</Label>
                  <Input
                    id="reg-password"
                    type="password"
                    placeholder="至少 8 位"
                    required
                    value={regPassword}
                    onChange={e => setRegPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-confirm">确认密码</Label>
                  <Input
                    id="reg-confirm"
                    type="password"
                    placeholder="再次输入密码"
                    required
                    value={regConfirm}
                    onChange={e => setRegConfirm(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? '注册中...' : '创建账号'}
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
