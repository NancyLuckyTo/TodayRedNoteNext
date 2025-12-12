## 0. 迁移前准备与风险控制（新增章节）

在你当前 Phase 1 之前，增加一个 “Phase 0: 准备与风险控制”。

### 0.1 分支策略

- **创建长期迁移分支**
  - `git checkout -b feat/next-migration`
  - 所有 Next 相关改动都在这个分支完成，主分支只做 Bug 修或小 Feature。
- **使用 Git Tag 保护当前可用版本**
  - 在当前稳定版打 Tag：`git tag v1-before-next && git push origin v1-before-next`

### 0.2 环境与配置梳理

- **列出所有当前使用的环境变量**（从 `server/.env`、Railway、Vercel 面板中确认）：
  - `MONGODB_URI`
  - `JWT_SECRET`
  - `CORS_ORIGIN`
  - OSS 相关：`ALI_ACCESS_KEY_ID`、`ALI_ACCESS_KEY_SECRET`、`ALI_OSS_BUCKET`、`ALI_OSS_REGION`
  - OpenAI：`OPENAI_API_KEY`
- **在 Next 阶段的映射规则**
  - 仅前端可读的变量才加 `NEXT_PUBLIC_` 前缀（目前计划中只有 `NEXT_PUBLIC_API_URL`，迁移后其实可以去掉，直接用 `/api` 即可）。
  - 所有机密信息（DB、JWT、OSS、OpenAI）保留为**服务端环境变量**，不加前缀。

### 0.3 数据与回滚策略

- **数据库保持共用**
  - 整个迁移过程中，Express 和 Next 共用同一 MongoDB 实例。
  - 避免引入破坏字段结构的 DB 变更（如重命名字段、删除字段），如必须更改，先做兼容逻辑。
- **回滚路径**
  - 如果 Next 版本线上出现严重问题：
    - 直接将 Vercel 的 Production 指回当前 Vite SPA 项目（保留原 project / build 设置）。
    - Railway 上的 Express 服务保持在线，不立即下线。
  - 保留 `feat/next-migration` 分支，问题修完后再重新部署 Next。

---

## 1. 迁移期本地开发与部署策略（补充说明）

这一块在原计划里比较隐含，可以单独成节。

### 1.1 本地开发策略

- **阶段 A：Next 与旧后端并行开发**
  - 旧前端：`pnpm --filter client dev`（Vite：5173）
  - 旧后端：`pnpm --filter server dev`（Express：3000）
  - 新 Next：`pnpm --filter next-app dev`（Next：3000，**注意端口冲突**）
    - 建议：**开发期让 Next 用 4000 端口**，避免和 Express 冲突：
      - 在 [package.json](cci:7://file:///Users/nancy/Project/Frontend/TodayRedNote/package.json:0:0-0:0) 增加脚本：`"dev": "next dev -p 4000"`
- **阶段 B：只保留 Next**
  - 停止 [server](cci:7://file:///Users/nancy/Project/Frontend/TodayRedNote/server:0:0-0:0) 开发脚本，Express 仅用于线上过渡。
  - 本地以 Next 单一进程开发：`cd next-app && pnpm dev`（默认 3000）。

### 1.2 线上部署切换思路

你当前 Vercel 配置是：

- 构建 [client](cci:7://file:///Users/nancy/Project/Frontend/TodayRedNote/client:0:0-0:0)，产物 `client/dist`
- 所有 `/api` 请求重写到 Railway 的 Express 服务

迁移后目标：

- 改为**由 Next 直接处理前后端**，不再依赖 Railway Express。
- 推荐步骤：
  - 在 Vercel 上先新建一个 **Preview 环境 / 新 Project** 指向同一个仓库，但：
    - 不使用自定义 [vercel.json](cci:7://file:///Users/nancy/Project/Frontend/TodayRedNote/vercel.json:0:0-0:0)（让 Vercel 识别 Next 项目）。
    - Build 命令：`pnpm install && pnpm --filter next-app build`（扁平化后就是 `pnpm build`）。
  - 在 Preview 环境中跑完全量验证（下面的 Verification Plan）。
  - 确认无误后，才把 Production 切换到 Next 项目：
    - 旧 Project 保留一段时间作为回滚备用。

---

## 2. API Routes 迁移详细映射（细化 Phase 5 / Phase 3）

你现在只示例了 `/api/posts`，建议在计划里加一个**完整路由对照表 + 推荐迁移顺序**。

### 2.1 路由映射总表

| 旧 Express 路径                 | 文件来源                    | 新 Next 路由                                | 说明                   |
| ------------------------------- | --------------------------- | ------------------------------------------- | ---------------------- |
| `POST /api/auth/register`       | `server/src/routes/auth`    | `src/app/api/auth/register/route.ts`        | 注册                   |
| `POST /api/auth/login`          | 同上                        | `src/app/api/auth/login/route.ts`           | 登录，设置 Cookie      |
| `GET /api/auth/profile`         | 同上                        | `src/app/api/auth/profile/route.ts` 或 `me` | 获取当前用户           |
| `POST /api/auth/logout`(新增)   | 新增                        | `src/app/api/auth/logout/route.ts`          | 清除 Token Cookie      |
| `GET/POST /api/posts`           | `routes/posts + controller` | `src/app/api/posts/route.ts`                | 列表 + 创建            |
| `GET/PUT/DELETE /api/posts/:id` | 同上                        | `src/app/api/posts/[id]/route.ts`           | 详情、更新、删除       |
| `POST /api/posts/:id/comments`  | 同上                        | `src/app/api/posts/[id]/comments/route.ts`  | 评论                   |
| `GET /api/posts/:id/related`    | 同上                        | `src/app/api/posts/[id]/related/route.ts`   | 相关推荐               |
| `/api/drafts/*`                 | `routes/drafts`             | `src/app/api/drafts/route.ts` 等            | 草稿相关               |
| `/api/upload/*`                 | `routes/upload`             | `src/app/api/upload/route.ts`               | 图片上传（阿里云 OSS） |

### 2.2 推荐迁移顺序

1. **认证相关 `/api/auth/*`**
   - `register` → `login` → `profile/me` → `logout`
   - 迁移完成后，可先只让 Next 前端使用这些 API，旧 Vite 前端仍用 Express，以减少一次性风险。
2. **帖子核心 `/api/posts/*`**
   - 先移列表 & 详情（GET），再移创建/更新/删除，再移评论、相关帖子。
3. **草稿 `/api/drafts/*`**
4. **上传 `/api/upload/*` + OSS 相关服务**

每完成一个模块，计划里建议加上：

- **完成定义 (Definition of Done)**：
  - 所有相关 Route Handlers 写好，并通过本地测试。
  - 对应 Mongoose Service 层在 Next 中正常工作。
  - 旧 Express 路由标记为“待删除”，但暂不立刻删。

---

## 3. 认证体系迁移完整流程（强化 Phase 3.1 + Zustand 改造）

你已有 `lib/auth.ts` 和 Zustand 改造示例，可以在文档里明确写出**前后端完整链路**：

### 3.1 登录流程（前端视角）

1. 登录页表单提交到 `/api/auth/login`：
   - 使用 `fetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) })`
2. 接口返回：
   - Body 中带 `user` 信息；
   - 响应头里由 Route Handler 写入 `Set-Cookie: token=xxx; HttpOnly; …`
3. 前端处理：
   - 不再存 `localStorage.token`；
   - 将 `user` 写入 `useAuthStore.setUser`；
   - 跳转首页或来源页。

### 3.2 退出登录流程

1. 前端调用 `/api/auth/logout`（POST）：
   - 服务器通过 `response.cookies.set('token', '', { maxAge: 0, … })` 清除 Cookie。
2. `useAuthStore.logout`：
   - 清空 `user` 和 `isAuthenticated`。
   - 可选：重定向到 `/login`。

### 3.3 SSR 与客户端状态同步

- 服务端页面（如 `profile/page.tsx`）：
  - 在 `Page()` 中调用 `getServerSession()`（或 `getSession()`）判断用户是否登录。
  - 未登录：直接 `redirect('/login')`。
- 客户端：
  - `useAuthStore.initialize()` 中改为请求 `/api/auth/profile` 或 `/api/auth/me`。
  - 避免在 `initialize` 里依赖 `localStorage`。

### 3.4 兼容旧数据

- 如之前 `localStorage` 存过 `profile`，在迁移初期可在登录成功后**暂时兼容写入**一次 `localStorage.profile`，只为旧代码 fallback；等所有页面迁完后，再统一删除。

---

## 4. 页面与路由迁移细化（扩展 Phase 4）

在现有 Phase 4 的基础上，可以增加一个“小 checklist”，每个页面说明：

- 页面类型（Server / Client / 混合）；
- 首屏数据获取方式；
- 访问权限（公开 / 需要登录）。

### 4.1 首页 `/`（`app/page.tsx`）

- **类型**：Server Component + Client 子组件（瀑布流）。
- **数据获取**：
  - `Page()` 中 SSR 查询最近帖子（你已有 `getInitialPosts` 示例）。
  - 将初始数据传给 `HomePageClient`；内部再用 React Query 做后续分页/下拉加载。
- **权限**：公开访问。

### 4.2 登录页 `/login`

- **类型**：Client Component（包含表单交互）。
- **要点**：
  - 不再依赖 `useNavigate`，使用 `useRouter`；
  - 登录成功只更新 Zustand，不写 `localStorage.token`。

### 4.3 个人页 `/profile`

- **类型**：推荐 Server + Client 混合。
  - `Page()`：检查会话；若无登录 `redirect('/login')`；
  - 将 `user` 作为 props 传给 Client 组件。
- **要点**：
  - 这样浏览器禁用 JS 时，Profile 也能 SSR 显示。

### 4.4 详情页 `/post/[id]`

- 你已写了 SSR + `generateMetadata` 示例，计划里可以再强调：
  - 当帖子不存在时统一使用 `notFound()` + `app/post/[id]/not-found.tsx`；
  - 对于 `PostDetailClient` 中的 TipTap 渲染，保持 `'use client'`，仅接收纯数据。

### 4.5 创建 / 编辑帖子页

- `/create-post` / `/edit-post/[id]`：
  - 类型：Client Component（富文本编辑器）。
  - 数据：
    - 编辑页 SSR 预取旧帖子数据，避免首次加载闪烁；
    - 非必须时也可以只在客户端获取，减少服务器压力。
  - 访问权限：服务端先校验 Session，不通过则重定向登录。

---

## 5. 状态管理与数据获取（扩充 Phase 3.2 / 3.3 / Phase 5）

在计划书里，可以单独开小节总结：

### 5.1 TanStack Query 在 Next App Router 中的用法

- **推荐模式**：
  - SSR 的初始数据通过 props 传给 Client 组件；
  - 在 Client 中 `useQuery` 时用 `initialData` 注入，避免重复请求。
- **避免的问题**：
  - 不要在 Server Component 中直接使用 React Query；
  - 跨请求共享 QueryClient 要通过 `Providers` 包装，已在你的 Plan 中有示例。

### 5.2 Zustand 的使用边界

- 只在 Client Component 中使用 `useAuthStore` / 其他 stores。
- SSR 相关的数据（用户、首屏帖子列表）尽量**通过 props 下发**，再写入 store，而不是在 `useEffect` 里重新请求一遍。

---

## 6. 构建、扁平化与工作区配置（细化 Phase 1.5 / Phase 8 / 扁平化）

你已有“根目录扁平化”思路，这里可以再细化到文件级操作步骤。

### 6.1 扁平化操作详细步骤

1. **确认 Next 功能完整**：所有 Phase 1–7 Checklist 全部勾上。
2. **停止使用旧脚本**
   - 不再使用 `pnpm --filter client dev` / `build:client` / `build:server`。
3. **移动文件**
   - 将 `next-app` 下的：
     - [src/](cci:7://file:///Users/nancy/Project/Frontend/TodayRedNote/server/src:0:0-0:0)、`public/`、`next.config.*`、`tailwind.config.*`、`postcss.config.*`、`tsconfig.*`、[package.json](cci:7://file:///Users/nancy/Project/Frontend/TodayRedNote/package.json:0:0-0:0) 等，移动到仓库根目录。
   - 根目录原 [package.json](cci:7://file:///Users/nancy/Project/Frontend/TodayRedNote/package.json:0:0-0:0) 中的脚本修改为：
     - `"dev": "next dev"`
     - `"build": "next build"`
     - `"start": "next start"`
4. **更新 workspace**
   - [pnpm-workspace.yaml](cci:7://file:///Users/nancy/Project/Frontend/TodayRedNote/pnpm-workspace.yaml:0:0-0:0) 修改为：
     ```yaml
     packages:
       - 'packages/*'
     ```
   - 如果将来还有其他子包（如工具库），再扩展。
5. **删除遗留**
   - [client/](cci:7://file:///Users/nancy/Project/Frontend/TodayRedNote/client:0:0-0:0)、[server/](cci:7://file:///Users/nancy/Project/Frontend/TodayRedNote/server:0:0-0:0)、`next-app/` 整个目录；
   - Vite 配置、Express 相关文件；
   - [vercel.json](cci:7://file:///Users/nancy/Project/Frontend/TodayRedNote/vercel.json:0:0-0:0) 如果只为 SPA + 后端代理，Next 时代可删除，改用 Vercel 默认行为或仅保留部分重写。

---

## 7. 验收、监控与性能（增强 Verification Plan）

在你已有的 Verification Plan 上增加：

### 7.1 Next 特有检查点

- **`loading.tsx` / 骨架屏**
  - 首页、详情页路由段下新增 `loading.tsx`，体验比纯客户端骨架更顺滑。
- **`error.tsx` / `not-found.tsx`**
  - 为关键路由（如 `/post/[id]`）添加专用的错误与 404 UI，使 API 抛错时用户看到友好页面。
- **缓存策略**
  - 列表页：使用 `revalidate` 或 `fetch` 的缓存选项；
  - 详情页：可选择 `dynamic = 'force-static'` + `revalidate`，视你更新频率而定。

### 7.2 生产监控

- 在计划书中写明：**完成迁移后要做的运维动作**：
  - Vercel 监控：请求量、错误率；
  - MongoDB Atlas 或云服务中的连接数与慢查询监控；
  - 重点观察：图片上传、AI 接口（OpenAI）、瀑布流加载性能。

---

## 8. 最后整理建议

你可以这样处理两份计划：

- 以 [implement_plan.md](cci:7://file:///Users/nancy/Project/Frontend/TodayRedNote/implement_plan.md:0:0-0:0) 为主干，因为它已经有 Phase 1–8、Checklist、时间估算等完整结构；
- 将 [implement_plan02.md](cci:7://file:///Users/nancy/Project/Frontend/TodayRedNote/implement_plan02.md:0:0-0:0) 中更细的代码片段（如 `lib/db.ts`、`auth.ts`、`login` Route Handler 示例）合并到对应 Phase；
- 再把我上面这几个新增/加强章节插入进去：
  - Phase 0：准备与风险控制
  - Phase 2/3/5：补充 API 映射表、认证整体流程、状态管理指南
  - Phase 8：扁平化详细操作
  - 验收 & 运维扩展段落

---

## 总结

- 你原来的计划已经涵盖了**绝大多数技术点**（SSR、认证、API Routes、目录结构、组件迁移），我主要补上了：
  - 迁移前准备与风险控制；
  - 并行架构和部署切换策略；
  - 更细粒度的 API 路由映射与迁移顺序；
  - 认证 & 状态管理的端到端流程；
  - 扁平化与 workspace/脚本的具体操作；
  - 生产环境验证与监控要点。
- 如果你愿意，我可以下一步**直接帮你编辑 [implement_plan.md](cci:7://file:///Users/nancy/Project/Frontend/TodayRedNote/implement_plan.md:0:0-0:0)**：  
  在现有内容基础上插入这些新章节，变成一份结构化完整的“Next 全栈迁移手册”。
