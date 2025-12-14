'use server'

import { cookies } from 'next/headers'
import { authService } from '@/server/services/auth'
import { loginSchema, registerSchema } from './schemas'

export type AuthState = {
  success?: boolean
  message?: string
  fieldErrors?: Record<string, string[] | undefined>
  user?: {
    id: string
    username: string
    createdAt: Date
  }
}

/**
 * 登录
 */
export async function loginAction(
  prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const rawData = Object.fromEntries(formData.entries())
  const validated = loginSchema.safeParse(rawData)

  if (!validated.success) {
    return {
      success: false,
      message: '表单验证失败',
      fieldErrors: validated.error.flatten().fieldErrors,
    }
  }

  const { username, password } = validated.data
  const result = await authService.login(username, password)

  if (!result.success || !result.token) {
    let message = '登录失败，请稍后重试'
    if (result.status === 401) {
      message = '账号或密码错误'
    } else if (result.status === 400) {
      message = '请输入账号和密码'
    } else if (result.status === 500) {
      message = '服务器连接异常，请稍后重试'
    }

    return {
      success: false,
      message,
    }
  }

  const cookieStore = await cookies()
  cookieStore.set('token', result.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })

  return {
    success: true,
    message: '登录成功',
    user: result.user,
  }
}

/**
 * 注册
 */
export async function registerAction(
  prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const rawData = Object.fromEntries(formData.entries())
  const validated = registerSchema.safeParse(rawData)

  if (!validated.success) {
    return {
      success: false,
      message: '表单验证失败',
      fieldErrors: validated.error.flatten().fieldErrors,
    }
  }

  const { username, password } = validated.data
  const result = await authService.register(username, password)

  if (!result.success || !result.token) {
    let message = '注册失败，请稍后重试'
    if (result.status === 409) {
      message = '该账号已存在'
    } else if (result.status === 400) {
      message = '注册信息不完整'
    } else if (result.status === 500) {
      message = '服务器连接异常，请稍后重试'
    }

    return {
      success: false,
      message,
    }
  }

  const cookieStore = await cookies()
  cookieStore.set('token', result.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })

  return {
    success: true,
    message: '注册成功',
    user: result.user,
  }
}
