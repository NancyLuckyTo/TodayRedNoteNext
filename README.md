# 项目总览：TodayRedNote (今日红书)

**TodayRedNote** 是一个**移动端优先 (Mobile-First)** 的现代化全栈资讯流 Web 应用。该项目采用 **Monorepo** 架构，整合 **AI 大模型** 能力，旨在打造一个高性能、高可用、体验丝滑的内容分享平台。

### 技术栈架构 (The Tech Stack)

该项目采用 **TypeScript 全栈开发**，统一前后端语言规范，并使用 **pnpm Monorepo** 进行高效的依赖管理与代码共享。

- **前端 (Client):**
  - **Core:** `React 19` + `Vite` + `TypeScript` + `react-router-dom`
  - **UI Framework:** `TailwindCSS v4` (样式引擎) + **`shadcn-ui`** (高定制化组件库)
  - **State Management:**
    - **Client State:** `Zustand` (管理 Auth、Token、User，含持久化)
    - **Server State:** **`@tanstack/react-query`** (管理 Feed 流缓存、突变、无限加载)
  - **Performance:** TODO
  - **Editor:** `@tiptap/react` (无头富文本编辑器)

- **后端 (Server / API):**
  - **Runtime:** `Node.js` + `Express` (适配 Serverless 环境)
  - **Database:** **MongoDB Atlas** (Mongoose ODM) - 云原生 NoSQL 数据库
  - **Storage:** **Ali-OSS** (阿里云对象存储) - 采用后端签名、前端直传策略
  - **Security:** `jsonwebtoken` (JWT 鉴权), `bcryptjs` (密码哈希)
  - **AI:** 通义千问 SDK (内容分析与推荐)

---

### 核心能力

#### 1. 用户鉴权体系

- **JWT 无状态认证：** 基于 `Authorization: Bearer <token>` 的标准认证流程。
- **持久化会话：** 利用 `Zustand` + `localStorage` 实现用户刷新后保持登录状态。
- **路由守卫：** 自动拦截未登录用户访问受保护页面（如发布页），并重定向至登录。

#### 2. 图片上传

- **预签名 URL 机制：** 后端通过 `Ali-OSS` SDK 签发临时的 `PUT` 权限 URL。
- **前端直传：** 前端直接将文件流上传至阿里云 OSS，**彻底绕过后端服务器**，节省服务器带宽与计算资源，支持秒传与高并发。

#### 3. 全生命周期内容管理

- **发布：** 支持多图/封面图上传，支持富文本内容。
- **查看：** 详情页展示作者信息、发布时间（相对时间格式化）、内容及相关推荐。
- **权限控制：** 严格的后端所有权校验（Ownership Check），确保用户只能编辑/删除自己的帖子。
- **孤儿文件清理：** 删除帖子时，异步触发 OSS 文件删除任务，防止云存储空间浪费。

#### 4. AI 驱动的内容增强

- **智能打标：** 帖子发布后，后端异步调用 **LLM (大语言模型)**，根据正文内容自动提取 **话题** 与 3-5 个精准关键词（Tags），无需人工干预。
- **相关推荐：** 基于 AI 生成的标签，在详情页底部通过 MongoDB 聚合查询，智能推荐具有相同标签的“相关话题”内容，提升用户留存。

#### 5. 极致性能优化

- **LCP 优化 (Largest Contentful Paint):**
  - 利用 Ali-OSS 的 **x-oss-process** 参数，动态请求 WebP/AVIF 格式及自适应尺寸的图片，显著降低带宽消耗。
  - 首屏图片添加 `fetchpriority="high"` 属性。
- **虚拟滚动 (Virtual Scrolling):** TODO
- **代码分割：** 路由级懒加载，减小首屏 Bundle 体积。

#### 6. 移动端体验

- **无限滚动 Feed 流：**
- **下拉刷新逻辑：** 实现数据重置与重新获取机制，保证用户获取最新内容。
- **移动端适配：** 采用 `Mobile-First` 的响应式布局策略，完美适配各种尺寸的手机屏幕。

#### 7. 创作体验

- **无头富文本编辑器：** 集成 **Tiptap**，支持加粗、列表、标题等格式，且完全由 TailwindCSS\shadcn-ui 控制样式。
- **自动保存 (Auto-Save):**
