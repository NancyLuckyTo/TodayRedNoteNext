# Next.js 全栈架构迁移计划

## 项目背景

将当前的 Vite + React (CSR) + Express 独立后端架构迁移至 **Next.js 14+ 全栈架构 (App Router)**。
目标是统一前后端代码库，利用 SSR 提升首屏性能和 SEO，同时保持现有的业务逻辑和 UI 组件。

### 架构对比

| 特性         | 当前架构 (Vite + Express)     | 目标架构 (Next.js App Router)                           |
| :----------- | :---------------------------- | :------------------------------------------------------ |
| **渲染模式** | CSR (客户端渲染)              | SSR (服务端渲染) + RSC (服务端组件) + Client Components |
| **路由**     | React Router DOM (客户端路由) | File-system Routing (文件系统路由)                      |
| **后端**     | Express Server (独立进程)     | Next.js Route Handlers (Serverless/Node.js)             |
| **数据库**   | MongoDB (Mongoose)            | MongoDB (Mongoose) - 直连                               |
| **认证**     | JWT in localStorage           | JWT in HTTP-only Cookie                                 |
| **API 通信** | Axios (HTTP)                  | Server Actions (直接调用) / Fetch (API Routes)          |

---

## User Review Required

> [!IMPORTANT]
> **认证机制变更 (Breaking Change)**
> 当前使用 `localStorage` 存储 Token，这在 SSR 中无法工作。
> **迁移方案**：登录接口将 Token 写入 `HTTP-only Cookie`。客户端通过 Server Component 读取 Cookie 获取用户信息，或通过 API `/api/auth/me` 获取。
> **影响**：需要修改 `login`、`register` 接口和 `useAuthStore`。

> [!WARNING]
> **环境变量**
> Next.js 客户端环境变量必须以 `NEXT_PUBLIC_` 开头。
> 服务端私有变量（如 `JWT_SECRET`、`MONGODB_URI`）**不能**带 `NEXT_PUBLIC_` 前缀。
> 需要整理 `.env` 文件。

> [!TIP]
> **渐进式迁移策略**
> 我们将采用 **"Side-by-Side" (并行)** 策略。
>
> 1. 在根目录创建 `next-app` (临时目录)。
> 2. 逐步搬运代码并改造。
> 3. 验证无误后，将 `next-app` 内容提升至根目录，替换旧代码。

---

## Proposed Changes

### Phase 1: 项目初始化 (Setup)

> 目标：搭建 Next.js 基础环境，配置 TailwindCSS 和 TypeScript，确保能运行 Hello World。

#### 1.1 创建 Next.js 项目

在项目根目录执行：

```bash
# 创建临时目录 next-app
npx create-next-app@latest next-app \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --no-turbopack
```

#### 1.2 安装依赖

进入 `next-app` 目录，安装从 `client` and `server` 迁移过来的依赖：

```bash
cd next-app

# 核心 UI 与工具库 (来自 client)
pnpm add @tanstack/react-query zustand clsx tailwind-merge lucide-react class-variance-authority
pnpm add @radix-ui/react-slot @radix-ui/react-label @radix-ui/react-tabs @radix-ui/react-dropdown-menu @radix-ui/react-alert-dialog
pnpm add react-hook-form @hookform/resolvers zod next-themes

# 富文本编辑器 (来自 client)
pnpm add @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-link @tiptap/extension-placeholder

# 后端核心库 (来自 server)
pnpm add mongoose jsonwebtoken bcrypt cookie-parser uuid ali-oss openai

# 开发依赖
pnpm add -D @types/jsonwebtoken @types/bcrypt @types/cookie-parser @types/uuid @types/ali-oss tw-animate-css

# 内部类型包 (Workspace)
pnpm add @today-red-note/types@workspace:*
```

#### 1.3 配置 `next.config.js`

允许跨域图片（阿里云 OSS）：

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.aliyuncs.com', // 根据实际 OSS 域名配置
      },
    ],
  },
  // 解决 Mongoose 在开发环境的热重载连接问题
  experimental: {
    serverComponentsExternalPackages: ['mongoose'],
  },
}

export default nextConfig
```

---

### Phase 2: 基础设施迁移 (Infrastructure)

> 目标：建立数据库连接、认证工具类、API 客户端封装。

#### 2.1 数据库连接 (`src/lib/db.ts`)

[NEW] 创建 MongoDB 连接单例，防止开发环境热重载导致连接数爆炸。

```typescript
import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI!

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable')
}

let cached = (global as any).mongoose

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null }
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    }

    cached.promise = mongoose.connect(MONGODB_URI, opts).then(mongoose => {
      return mongoose
    })
  }
  cached.conn = await cached.promise
  return cached.conn
}

export default connectDB
```

#### 2.2 认证工具 (`src/lib/auth.ts`)

[NEW] 用于服务端获取当前用户（解析 Cookie）。

```typescript
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { UserPayload } from '@today-red-note/types' // 假设类型包里有这个

const JWT_SECRET = process.env.JWT_SECRET!

export async function getSession() {
  const cookieStore = cookies()
  const token = cookieStore.get('token')?.value

  if (!token) return null

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserPayload
    return decoded
  } catch (error) {
    return null
  }
}
```

#### 2.3 模型迁移 (`src/models/*`)

[COPY] 将 `server/src/models/*.ts` 复制到 `next-app/src/models/`。
注意：确保 `mongoose.models.Post || mongoose.model('Post', schema)` 这种写法，防止模型重复编译错误。

---

### Phase 3: API Routes 迁移 (Backend)

> 目标：将 Express 路由转换为 Next.js Route Handlers。

#### 3.1 认证 API (`src/app/api/auth/login/route.ts`)

拆分为：

- `src/app/api/auth/login/route.ts`
- `src/app/api/auth/register/route.ts`
- `src/app/api/auth/logout/route.ts`
- `src/app/api/auth/me/route.ts`

**重点：Login 接口写入 Cookie**

```typescript
// src/app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/userModel';
import jwt from 'jsonwebtoken';

export async function POST(request: Request) {
  await connectDB();
  const { username, password } = await request.json();

  // ... 验证逻辑 ...

  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET!, { expiresIn: '7d' });

  const response = NextResponse.json({ success: true, user: { ... } });

  // 设置 HTTP-only Cookie
  response.cookies.set('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });

  return response;
}
```

#### 3.2 帖子 API (`src/app/api/posts/route.ts` 等)

将 `server/src/controllers/postController.ts` 的逻辑迁移到对应的 Route Handler。

- `GET /api/posts` -> `src/app/api/posts/route.ts`
- `POST /api/posts` -> `src/app/api/posts/route.ts`
- `GET /api/posts/[id]` -> `src/app/api/posts/[id]/route.ts`

---

### Phase 4: 前端页面与组件迁移 (Frontend)

> 目标：迁移 React 组件，适配 Next.js 路由和 SSR。

#### 4.1 布局与 Providers (`src/app/layout.tsx`)

[NEW] 包含 `QueryClientProvider`, `ThemeProvider`, `ToastProvider`。

```typescript
// src/app/layout.tsx
import './globals.css';
import { Providers } from '@/components/Providers'; // 封装客户端 Providers

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <Providers>
          <div className="flex min-h-screen justify-center bg-gray-100">
             <div className="relative w-full max-w-md min-h-screen bg-white shadow-lg">
                {children}
             </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
```

#### 4.2 首页 (`src/app/page.tsx`)

[MODIFY] 尝试使用 SSR 获取初始数据，然后传给客户端组件（瀑布流）。

```typescript
import { getSession } from '@/lib/auth';
import HomePageClient from '@/components/HomePageClient'; // 原 HomePage.tsx
import connectDB from '@/lib/db';
import Post from '@/models/postModel';

export default async function Page() {
  await connectDB();
  // SSR 获取首屏数据
  const initialPosts = await Post.find().sort({ createdAt: -1 }).limit(10).lean();

  // 序列化 MongoDB 对象 (转 String ID)
  const posts = JSON.parse(JSON.stringify(initialPosts));

  return <HomePageClient initialPosts={posts} />;
}
```

#### 4.3 详情页 (`src/app/post/[id]/page.tsx`)

[MODIFY] 支持动态 Metadata (SEO)。

```typescript
export async function generateMetadata({ params }: { params: { id: string } }) {
  const post = await getPost(params.id);
  return {
    title: post?.title,
    description: post?.bodyPreview,
  };
}

export default async function PostPage({ params }: { params: { id: string } }) {
  const post = await getPost(params.id);
  return <PostDetailClient post={post} />;
}
```

#### 4.4 组件迁移

- [COPY] `client/src/components/*` -> `next-app/src/components/*`.
- [MODIFY] 对于交互组件（如 `WaterfallContainer`, `PostCard`），在文件顶部添加 `'use client';`。
- [MODIFY] 将 `useNavigate` 替换为 `useRouter` (from `next/navigation`)。
- [MODIFY] 将 `<img>` 替换为 `next/image` (可选，建议优化)。

---

### Phase 5: 状态管理调整

#### 5.1 Auth Store (`src/stores/auth.ts`)

[MODIFY] 移除 `localStorage` 读取 Token 的逻辑（因为 Token 在 Cookie 里）。
初始化时，调用 `/api/auth/me` 接口确认登录状态。

```typescript
// src/stores/auth.ts
import { create } from 'zustand'

export const useAuthStore = create(set => ({
  user: null,
  isAuthenticated: false,
  initialize: async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (res.ok) {
        const data = await res.json()
        set({ user: data.user, isAuthenticated: true })
      }
    } catch (e) {
      set({ user: null, isAuthenticated: false })
    }
  },
  // ...
}))
```

---

## Verification Plan

### Automated Tests

目前项目无自动化测试。建议在迁移后添加基础 API 测试。

### Manual Verification

1.  **启动服务**：`pnpm dev` (在 `next-app` 目录下)。
2.  **首页渲染**：
    - 访问 `http://localhost:3000`。
    - 确认瀑布流加载正常。
    - 查看源代码，确认首屏 HTML 包含帖子内容 (SSR 验证)。
3.  **认证流程**：
    - 点击登录，输入账号密码。
    - 检查浏览器 DevTools -> Application -> Cookies，确认 `token` 存在且为 `HttpOnly`。
    - 刷新页面，确认登录态保持。
4.  **发布帖子**：
    - 进入 `/create-post`。
    - 上传图片、输入内容、发布。
    - 确认跳转回首页并显示新帖子。
5.  **详情页**：
    - 点击帖子进入详情。
    - 确认 URL 为 `/post/[id]`。
    - 确认 SEO Meta 标签正确。

---

## 扁平化操作 (Final Step)

当 `next-app` 完全验证通过后：

1.  删除根目录 `client` 和 `server` 文件夹。
2.  将 `next-app` 下的所有文件移动到根目录。
3.  更新根目录 `package.json`。
4.  更新 `pnpm-workspace.yaml`。
