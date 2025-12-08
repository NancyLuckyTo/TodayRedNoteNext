# TodayRedNote 项目技术说明

---

## 一、整体架构和技术栈

- **整体形态**
  - 一个偏“小红书风格”的图片 + 富文本笔记应用。
  - 前端是单页应用（SPA），后端是基于 Node.js 的 API 服务。
  - 中间用 HTTP / JSON 接口通信。

- **前端**
  - 框架：React + Vite
  - 路由：React Router
  - 状态管理：Zustand（轻量 Store，例如 `useHomeStore`、`useAuthStore`）
  - 网络请求：Axios
  - UI：Tailwind CSS + Radix UI + 自封装组件
  - 数据请求和缓存：@tanstack/react-query
  - 富文本编辑器：TipTap
  - 部署：Vercel

- **后端**
  - 框架：Express
  - 数据库：MongoDB（通过 Mongoose 访问）
  - 身份认证：JWT（JSON Web Token）
  - 密码安全：bcrypt 做哈希和加盐
  - 存储：阿里云 OSS（通过 ali-oss SDK 上传图片）
  - 部署：Railway

- **Monorepo 与共享类型**
  - 项目采用 Monorepo 架构管理。通过 Workspace 机制在 packages/types 目录中维护前后端共用的 TypeScript 接口（如`IPost`、`IDraft`等）,保证前后端数据结构的对齐度。

---

## 二、首页双列瀑布流 & 统一的封面图比例

### 1. 效果目标

- 首页是两列瀑布流布局，整体视觉、互动体验贴近小红书与抖音等主流应用的：
  - 每个卡片上半部分是图片封面，下半部分是 1~2 行正文预览。
  - 图片比例统一（竖图/横图），卡片高度整体协调，不会一高一矮太割裂。
  - 滚动时自然，不乱跳，不闪烁。

### 2. 技术方案概览

- 前端主页组件：`client/src/pages/HomePage.tsx`
- 瀑布流容器：`client/src/components/WaterfallContainer.tsx`
- 笔记卡片：`client/src/components/PostCard.tsx`
- 高度/比例计算：`client/src/lib/postUtils.ts`

### 3. 如何做“双列瀑布流”

1. **先算出每个卡片的大致高度**（预估）：
   - 根据当前屏幕宽度算出单列宽度：
     - `(window.innerWidth - 边距与列间距) / 2`
   - 再用函数 `calculatePostHeight(post, columnWidth)` 估算卡片高度：
     - 如果有图片：根据封面图比例（宽高比）算出图片高度。
     - 如果有正文：按“字数、文本行数、行高”粗略算出占多少高度。
     - 再加上作者信息、点赞区域的固定高度偏移量。

2. **再用一个容器组件做“分列”**：
   - `WaterfallContainer` 只负责：
     - 接收一组子元素（笔记卡片），
     - 读取每个子元素传进来的 `data-waterfall-height`，
     - 按**谁矮放谁**的策略，动态地把笔记卡片分配到左列或右列。
   - 实现上是一个很朴素的贪心算法：
     - 一开始两列高度都是 0；
     - 每放入一个笔记卡片，就放到当前高度更矮的那一列，并更新那一列的总高度。

3. **布局细节：`flex + min-w-0`**
   - 外层是一个 `flex` 容器，里面是两个 `flex-1` 列。
   - 每一列加了 `min-w-0`，这是为了解决一个常见的 bug：
     - 如果子元素里有图片或长文本，本身有最小宽度，列在收缩时可能会溢出导致抖动。
     - `min-w-0` 让列在需要时可以“硬生生地小一点”，保证整体布局稳定。

### 4. 封面图比例是怎么统一的

- 在 `postUtils.ts` 中定义了封面图的比例元数据：
  - `landscape`：4:3
  - `portrait`：3:4
- 每个笔记有一个 `coverRatio` 字段：
  - 若没有写，则默认 `portrait`（竖图，更贴近主流内容社区）。
- 在卡片渲染时：
  - 使用 `getAspectRatio(coverRatio)` 转成 CSS 的 `aspect-ratio` 字符串；
  - 外层用 `div` 固定 `aspect-ratio`，再让 `img` 填满这个容器并 `object-fit: cover`；
  - 这样即使原图尺寸不一致，呈现出来的封面看起来也会是统一、干净的矩形。

### 5. 和主流应用美学/交互的贴近点

- **列宽和间距**：按移动端竖屏优化，整体看起来和小红书类似的“双列瀑布流”间距。
- **图片优先加载**：首屏的前几张卡片会标记为优先加载（`priority`），对应浏览器的 `fetchPriority`。
- **防闪烁**：
  - 首屏会先显示骨架屏（`HomePageSkeleton`），视觉上跟真实卡片靠近；
  - 数据到达后再无缝切换，避免“空白页 → 界面突然长出一堆内容”的突兀感。

---

## 三、首页下拉刷新

### 1. 体验目标

- 仿原生 App “往下拉一拉，就能刷新”的手势。
- 要做到：
  - 只在列表已经滚到顶部时才能触发；
  - 有一个跟手的下拉指示器（小箭头/转圈）；
  - 刷新过程中，指示器悬停在一定高度，刷新结束再收回；
  - 性能要好，不要卡顿。

### 2. 技术实现位置

- 自定义 Hook：`client/src/hooks/usePullToRefresh.ts`
- 指示器组件：`client/src/components/PullToRefreshIndicator.tsx`
- 在首页使用：`HomePage.tsx` 中调用 `usePullToRefresh`。

### 3. 核心思路

1. **监听触摸事件（移动端手势）**：
   - 在滚动容器上，原生监听 `touchstart` / `touchmove` / `touchend`。
   - 只有当滚动条在顶部时（`scrollTop <= 0`）才开始跟踪下拉动作。

2. **用“阻尼”模拟手感**：
   - 真实手指位移叫 `deltaY`；
   - 显示出来的拉动距离是 `deltaY / RESISTANCE`，并设置一个最大限制。
   - 这样拉得越多，增量越小，手感更像原生 App。

3. **直接操作 DOM 提升性能**：
   - 指示器组件只是一个壳，内部图标用 `data-pull-icon` 标记；
   - Hook 里拿到 `indicatorRef` 后，直接改：
     - `style.height`（指示器高度）；
     - 图标的 `transform: rotate(...)` 和 `opacity`；
   - 这些操作都包在 `requestAnimationFrame` 里，保证动画和屏幕刷新同步，减少 React 重渲染带来的开销。

4. **状态机控制刷新流程**：
   - 有四个状态：`idle`（空闲）、`pulling`（下拉中）、`ready`（够深，可以松手刷新）、`refreshing`（正在刷新）。
   - 下拉超过阈值就进入 `ready`，松手触发 `onRefresh` 回调；
   - 回调结束后恢复到 `idle` 并收起指示器。

5. **结合首页数据刷新**
   - 首页里传入的 `onRefresh` 做了两件事：
     1. 清空本地记录的“已浏览笔记 ID”（让推荐逻辑重新生成一个“全新流”）。
     2. 调用 `fetchPosts()` 重拉首页数据。

---

## 四、用户画像与首页个性化推荐

### 1. 目标

- 把用户在站内的行为（浏览、点赞、收藏、分享）转成一个“用户画像”。
- 首页信息流优先展示用户更感兴趣的标签/话题内容，再用时间流做兜底。

### 2. 用户画像数据结构

- 模型定义：`server/src/models/userProfileModel.ts`
- 一个用户对应一份画像文档，主要包含：
  - `interests`：用户对各个标签的兴趣权重：
    - 每一项里有 `tagId`、`weight`（0~1 之间）、`lastUpdated`（做时间衰减用）。
  - `behaviorHistory`：行为日志：
    - 记录每一条笔记的浏览/点赞/收藏/分享行为、涉及到的标签、时间等。
  - `preferences`：用户主动偏好（预留，当前主要用兴趣权重来驱动推荐）。

### 3. 行为收集与兴趣更新

- 服务：`server/src/services/userProfileService.ts`
- 核心函数：
  - `getOrCreateUserProfile(userId)`：如果没有画像就自动创建一份空的。
  - `trackUserBehavior(userId, postId, action)`：记录具体行为，并顺带更新兴趣。
  - `updateUserInterest(userId, tagId, score)`：按标签累积兴趣权重。

- 行为是这样被用起来的：
  1. 在获取笔记详情接口中（`postController.getOne`），如果请求里带了合法 JWT，就会：
     - 在返回详情给前端后，**异步地**调用 `trackUserBehavior(userId, postId, 'view')`。
     - 这样浏览行为不会拖慢接口响应。
  2. 在 `trackUserBehavior` 里：
     - 会把这次行为塞进 `behaviorHistory` 列表；
     - 如果笔记没有标签但有话题，会自动把话题名转成标签并写回笔记，保证画像维度稳定；
     - 对每个标签调用 `updateUserInterest` 提升该标签的权重。

- 兴趣权重更新是一个简单但可控的算法：
  - 不同行为有不同基础分：浏览 < 点赞 < 收藏 < 分享；
  - 新权重 = 旧权重 + 行为得分 × 学习率（并限制在 0~1 之间）；
  - 只保留前 `MAX_INTERESTS` 个最高的兴趣标签，避免画像无限膨胀。

### 4. 首页个性化推荐

- 接口入口：`GET /posts`（`server/src/controllers/postController.ts`）
- 控制器会：
  1. 从请求头里尝试解析 JWT，获取 `currentUserId`；
  2. 如果拿到了用户 ID，就走个性化流 `postService.getPersonalizedFeed(...)`；
  3. 否则走普通时间流 `postService.getPosts(...)`。

- 个性化推荐核心：`postService.getPersonalizedFeed`（`services/postService.ts`）
  - 第一步：读取用户画像，取出兴趣最高的若干个标签。
  - 第二步：用 `tags: { $in: interestTagIds }` 作为查询条件，从笔记表里找出匹配这些标签的笔记。
  - 第三步：
    - 结果按创建时间倒序排序；
    - 再用“游标（cursor）”做分页，避免传统翻页在流式加载下的各种边界问题；
    - 同时会考虑 `excludeIds`（前端传来的“已展示过的笔记 ID”）做去重。
  - 第四步：
    - 如果兴趣流数据足够，就只返回兴趣流，并在游标里记下当前阶段是 `profile`；
    - 如果兴趣流不够一页，则用时间流 `getPosts` 做兜底补齐，并在下一页切换阶段为 `fallback`。

- 前端如何配合：
  - 首页的 `useHomeStore` 用 `sessionStorage` 记了一个“已浏览笔记 ID 列表”。
  - 每次请求 `/posts` 时都会把这些 ID 通过 `excludeIds` 参数传给后端，
  - 再加上当前列表里的 ID，保证新请求出来的内容尽量“不重复”。

---

## 五、笔记详情页的相关推荐（基于标签 + 用户画像）

### 1. 目标

- 在详情页底部，滚动加载“用户可能还感兴趣”的内容：
  - 先贴合当前这条笔记的标签；
  - 再结合用户的长期兴趣画像；
  - 最后兜底用时间流补齐。

### 2. 前端：详情页如何请求相关推荐

- 页面：`client/src/pages/PostDetailPage.tsx`
- 基本流程：
  1. 首先请求当前笔记详情 `/posts/:id`，显示在页面最上方；
  2. 然后调用 `/posts/:id/related` 拉第一批相关推荐；
  3. 用 `IntersectionObserver` 监听页面底部的一个占位 `div`：
     - 一旦这个占位元素进入视窗，就自动加载下一页相关推荐；
     - 直到服务端返回“没有下一页”。
  4. 每次拉到的新笔记都会：
     - 用本地 `Set` 记录已经展示过的 ID；
     - 在下一次请求里通过 `excludeIds` 参数告诉后端“这些不要再给我了”。

### 3. 后端：三阶段推荐策略

- 路由：`GET /posts/:id/related`（`server/src/routes/posts.ts`）
- 控制器：`postController.getRelated`
  - 支持 `cursor` + `limit` + `excludeIds`；
  - 如果请求头有 JWT，会解析出 `currentUserId` 用于个性化；
  - 调用 `postService.getRelatedPosts(...)` 返回结果。

- 服务端逻辑（在 `postService.ts` 中）：
  - **三阶段推荐：`related -> profile -> fallback`**。
  - 具体流程：
    1. **related 阶段**：
       - 先根据当前笔记的标签，从数据库里找“同标签或相似标签”的笔记；
       - 保证最先看到的是“和当前内容强相关”的笔记；
       - 如果这一步已经满足一页，就只返回这一批，并在游标中记下阶段是 `related`。

    2. **profile 阶段**：
       - 如果 `related` 阶段不足一整页，就进入 `buildRelatedProfilePhase`；
       - 根据用户画像里的兴趣标签，用 `tags: { $in: 用户兴趣标签 }` 再召回一批；
       - 和首页个性化推荐的思路一致，只是这里是“围绕当前笔记作补充”。

    3. **fallback 阶段**：
       - 如果 `profile` 阶段仍然不够，就走时间流兜底；
       - 兜底时也会排除掉前两阶段已经返回过的笔记 ID，避免重复。

---

## 六、用户注册与登录：密码哈希与加盐

### 1. 目标

- 不在数据库里存明文密码；
- 即使数据库泄露，也尽量保证攻击者无法直接还原用户密码。

### 2. 用户模型和密码存储

- 模型：`server/src/models/userModel.ts`
- 关键点：
  - `password` 字段在数据库中存的是 **哈希后的字符串**，而不是用户输入的原始密码；
  - 查询用户时默认不会返回 `password` 字段（`select: false`），需要明确 `.select('+password')` 才能访问。

### 3. 加盐哈希流程（注册 / 修改密码时）

- 在 User 模型的 `pre('save')` 钩子里：
  1. 先判断密码字段是否被修改过；
  2. 如果是：
     - 使用 `bcrypt.genSalt(10)` 生成一个随机盐，轮次为 10；
     - 使用 `bcrypt.hash(原始密码, 盐)` 生成哈希；
     - 把哈希结果写回 `user.password` 再保存到数据库；
  3. 之后数据库中再也看不到明文密码。

### 4. 登录校验流程

- 路由：`POST /auth/login`（`server/src/routes/auth.ts`）
- 逻辑：
  1. 校验 `username` 和 `password` 是否都有传；
  2. 通过 `username` 查用户，并显式 `.select('+password')` 把哈希取出来；
  3. 调用 `user.comparePassword(用户输入的密码)`：
     - 内部用 `bcrypt.compare(明文, 哈希)` 判断是否匹配；
  4. 匹配成功：
     - 使用 `jsonwebtoken` 签发一个 JWT，payload 里带上 `userId`；
     - 有效期设置为 7 天；
  5. 前端拿到这个 `token` 后，后续请求放在 `Authorization: Bearer xxx` 里。

### 5. 鉴权中间件

- 中间件：`server/src/middleware/auth.ts`
- 作用：
  - 从请求头解析出 Bearer Token；
  - 使用服务器上的 `JWT_SECRET` 验签；
  - 验证通过后，把 `userId` 挂在 `req.userId` 上，后面的接口就可以确认“谁在操作”。

- 只有登录用户才能访问的接口，比如：
  - 发布笔记：`POST /posts`；
  - 修改/删除自己的笔记；
  - 草稿云端接口等，都会挂上这个中间件做保护。

---

## 七、富文本编辑器 TipTap 的实现

### 1. 为什么选 TipTap

- TipTap 是基于 ProseMirror 的富文本编辑器封装：
  - 功能强：标题、列表、引用、链接、加粗、删除线、代码块等都支持；
  - 可扩展：以后要加 @ 提及、图片内嵌、更多块类型也方便。
- React 生态成熟，有官方的 `@tiptap/react` 包。

### 2. 编辑器组件封装

- 组件文件：`client/src/components/editPost/RichTextEditor.tsx`
- 封装思路：
  1. 对外暴露一个 React 组件 `RichTextEditor`，接收：
     - `content`：当前 HTML 内容；
     - `onChange`：内容更新回调；
     - `placeholder`：占位提示文案；
     - `disabled`：是否可编辑；
  2. 内部使用 `useEditor` 创建 TipTap 实例：
     - 加载 `StarterKit`（基础功能）+ `Link` 扩展 + `Placeholder` 扩展；
     - 通过 `editorProps.attributes` 统一注入一套 Tailwind class，把标题、段落、列表、引用等的样式调成类似小红书的排版风格；
  3. 在 `onUpdate` 回调中，通过 `editor.getHTML()` 拿到当前内容，并回调给外部表单；
  4. 用 `useEffect` 监听外部 `content` 变化，如果与编辑器内部不一致，则用 `setContent` 做同步；
  5. 用 `useImperativeHandle` 暴露 `editor` 实例，方便工具栏等组件拿到编辑器对象做操作。

### 3. 工具栏组件

- 文件：`client/src/components/editPost/RichTextToolbar.tsx`
- 功能：
  - 撤销 / 重做
  - 加粗、删除线
  - 一级标题 / 二级标题
  - 引用、无序列表、有序列表、分割线
  - 插入 / 移除链接
  - 清除所有格式
- 交互方式：
  - 接收 `editor` 实例，按钮点击时通过 `editor.chain().focus().xxx().run()` 调用 TipTap 的命令。
  - 当前选区若处于某种格式，会高亮对应按钮（`editor.isActive(...)`）。

### 4. 在页面中的使用

- 新建/编辑笔记页：`client/src/pages/PostEditorPage.tsx`
  - 被放在表单的正文字段 `body` 上；
  - 每次内容变更：
    - 一方面更新 React Hook Form 的值；
    - 一方面调用草稿自动保存。
  - 键盘弹出时，底部工具栏会跟随键盘上移，保持不被遮挡。

- 笔记详情页渲染：`PostDetailItem.tsx`
  - 直接复用同一个 `RichTextEditor`，但设置为 `disabled` 只读模式；

---

## 八、草稿功能：本地 + 云端同步

### 1. 设计目标

- 用户随时可以中断编辑：
  - 关闭页面 / 返回上一页 / 断网，都不会丢稿；
- 在有网络时，草稿会自动同步到云端，换设备也能恢复；
- 在没网络时，至少保证本地有一份可恢复的文本和图片。

### 2. 草稿数据结构

- 类型定义：`packages/types/src/models/draft.ts`
- 主要字段：
  - `body`：正文 HTML 内容；
  - `topic`：话题名；
  - `uploadedImages`：已上传到云端的图片 URL；
  - `localImages`：本地待上传的 base64 图片（用于离线场景）；
  - `createdAt` / `updatedAt` / `lastSyncedAt`：时间戳；
  - `isDirty`：是否有未同步到云端的修改。

### 3. 本地存储：`draftStorage`

- 文件：`client/src/lib/draftStorage.ts`
- 功能：
  1. 利用 `localStorage` 以固定 key 保存草稿 JSON；
  2. 提供 `saveLocal` / `getLocal` / `clearLocal` 等封装；
  3. 在保存时会调用 `isStoredDraftEmpty` 检查：
     - 如果正文空白且没有图片，直接清掉本地草稿，避免永远保留无效数据。
  4. 还封装了访问云端草稿的接口 `saveCloud` / `getCloud` / `deleteCloud`，
     - 实际就是调用后端的 `/drafts` 系列 API。

### 4. 自动保存 Hook：`useDraftAutoSave`

- 文件：`client/src/hooks/useDraftAutoSave.ts`
- 提供给编辑页使用的一个“一站式草稿管理”Hook：
  - 自动定时保存（默认每 5 秒触发一次）；
  - 管理“是否正在保存”“是否有未同步改动”“当前是否在线”等状态；
  - 在网络从离线变为在线时，自动重试云端同步。

- 工作流程（新建笔记时启用）：
  1. **加载草稿**：
     - 打开编辑页时，先尝试从本地拿草稿；
     - 如果本地没有且当前在线，再尝试从云端拿草稿并存回本地；
     - 拿到草稿后：恢复正文、话题和已上传图片。

  2. **监听内容变化**：
     - 每次正文、话题或图片发生变化，就调用 `updateDraft(content)`：
       - 内部会判断内容是否空；
       - 若为空且当前也没草稿，就不启动定时器，避免一进入编辑页就写一堆空草稿；
       - 若不空，则启动/重置一个 5 秒的 timer。

  3. **定时保存逻辑**：
     - 定时器到点后：
       - 若在线：
         - 先通过 `uploadImages` 上传本地新图片到 OSS，拿到 URL；
         - 把所有图片 URL 和文本一起通过 `/drafts` 接口写到云端；
         - 本地也更新一份完整草稿，并标记 `isDirty = false`；
       - 若离线：
         - 只更新本地草稿（包含文本和“已经上传过的图片 URL”），并标记 `isDirty = true`。

  4. **立即保存 / 清除草稿**：
     - 用户取消编辑返回时，页面会调用 `saveDraftNow` 或 `clearDraft`：
       - 若当前内容不为空：强制立即同步（本地 + 云端），并给用户一个“草稿已保存”的提示；
       - 若内容为空：直接清除本地和云端草稿。

  5. **页面关闭前兜底**：
     - 在 `beforeunload` 事件中，如果检测到有未同步的修改，会至少把当前文本同步到本地存储，防止浏览器意外关闭导致丢失。

### 5. 编辑器页面中的集成

- 文件：`client/src/pages/PostEditorPage.tsx`
- 集成方式：
  - 仅在“新建模式”（没有 `id` 参数时）启用自动草稿；
  - 每次 TipTap 内容变化时调用 `updateDraft`；
  - 点击右上角“取消”返回时：
    - 如果内容非空 → `saveDraftNow`；
    - 如果内容空 → `clearDraft`；
  - 顶部还做了一个小的“云朵图标 + 保存中 / 待同步”指示条，实时展示当前草稿状态。

---

## 九、其他亮点与优化

### 1. 首屏性能优化：服务端数据预取 + 骨架屏

- 在 HTML 里有一个脚本，会提前请求首页 `/api/posts`，把结果挂在 `window.__PREFETCH_POSTS__` 上；
- `HomePage` 挂载时会优先使用这份预取结果：
  - 如果拿到了数据，就直接用，不再二次请求；
  - 用完之后会清空这份预取数据；
- 这样做的效果：
  - 浏览器在加载 CSS/JS 的同时，就已经开始拉首页数据；
  - 用户打开页面时，数据通常已经在路上甚至已返回，首屏白屏时间更短；
  - 骨架屏的样式和真实卡片高度布局对齐，减少“跳动感”。

### 2. 图片上传与 CDN 缓存

- 上传流程集中在 `postUtils.uploadImages`：
  1. 先对图片做压缩，降低体积；
  2. 调用后端 `/upload/request-urls` 拿到阿里云 OSS 的预签名 URL 和公开访问 URL；
  3. 前端直接把压缩后的图片 PUT 到 OSS；
  4. 上传时设置 `Cache-Control: public, max-age=31536000`，让浏览器和 CDN 可以缓存一年；
- 保存成功后，会把公开访问 URL 和压缩后的宽高记录下来，用于后续计算封面比例和展示。

### 3. 信息流去重与缓存

- 首页不仅在前端用 `viewedPostIds` 去重；
- 后端也会在 `getPosts` 里：
  - 接收 `excludeIds` 参数，配合分页游标做去重；
  - 对“未登录、第一页、无排除条件”这种场景做了短期内的缓存：
    - 一段时间内多次请求可以直接命中缓存，减轻数据库压力；
    - 发布/删除笔记时会主动清理这份缓存。

---

## 十、总结

这套实现整体上实现以下功能：

- 瀑布流和封面比例保证了首页视觉统一；
- 下拉刷新和无限滚动让使用体验更接近原生 App；
- 用户画像 + 三阶段推荐，把“用户可能感兴趣”这件事尽量做到合理而不过度复杂；
- 富文本编辑 + 草稿本地/云端双保险，让创作体验尽量无“心理负担”——随时写，随时走，不怕丢；
- 在密码存储、权限控制、图片上传缓存等方面也遵循了比较稳妥的工程实践。
