'use client'

// 简易 Auth 测试页：通过按钮快速调用注册、登录、获取当前用户、退出登录四个接口
import { useState } from 'react'

interface RequestResult {
  path: string
  status: number
  ok: boolean
  body: unknown
}

export default function AuthTestPage() {
  // 表单状态：用户名和密码
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  // 最近一次请求的响应结果（以 JSON 字符串形式展示）
  const [result, setResult] = useState<string>('')

  // 通用请求封装：负责调用指定接口并记录结果
  async function callApi(path: string, init: RequestInit) {
    try {
      const res = await fetch(path, {
        // 携带 Cookie，确保能够发送/接收服务端设置的 token
        credentials: 'include',
        ...init,
      })

      let body: unknown = null
      try {
        body = await res.json()
      } catch {
        // 如果不是 JSON 响应，忽略解析错误
      }

      const data: RequestResult = {
        path,
        status: res.status,
        ok: res.ok,
        body,
      }

      setResult(JSON.stringify(data, null, 2))
    } catch (error) {
      setResult(`请求失败: ${String(error)}`)
    }
  }

  // 注册新用户并自动登录（服务端会写入 JWT Cookie）
  async function handleRegister() {
    await callApi('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
  }

  // 使用用户名密码登录
  async function handleLogin() {
    await callApi('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
  }

  // 获取当前登录用户信息（依赖 Cookie 中的 token）
  async function handleMe() {
    await callApi('/api/auth/me', {
      method: 'GET',
    })
  }

  // 退出登录：清除服务端设置的 JWT Cookie
  async function handleLogout() {
    await callApi('/api/auth/logout', {
      method: 'POST',
    })
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 text-sm text-zinc-900">
      <div className="mx-auto flex max-w-xl flex-col gap-6 rounded-lg bg-white p-6 shadow">
        <h1 className="text-lg font-semibold">Auth 测试页</h1>
        <p className="text-xs text-zinc-500">
          通过下方表单和按钮，快速验证 /api/auth/register、/login、/me、/logout
          四个接口是否工作正常。
        </p>

        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium">用户名</span>
            <input
              className="rounded border px-2 py-1 text-sm outline-none focus:border-zinc-900"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="输入用户名"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium">密码</span>
            <input
              type="password"
              className="rounded border px-2 py-1 text-sm outline-none focus:border-zinc-900"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="输入密码"
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleRegister}
            className="rounded bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700"
          >
            注册并登录
          </button>
          <button
            type="button"
            onClick={handleLogin}
            className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
          >
            登录
          </button>
          <button
            type="button"
            onClick={handleMe}
            className="rounded bg-zinc-800 px-3 py-1 text-xs font-medium text-white hover:bg-black"
          >
            获取当前用户 (/me)
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700"
          >
            退出登录
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium">最新响应结果</span>
          <pre className="max-h-80 overflow-auto rounded bg-zinc-950 p-3 text-xs text-zinc-100">
            {result || '尚未发起请求'}
          </pre>
        </div>
      </div>
    </main>
  )
}
