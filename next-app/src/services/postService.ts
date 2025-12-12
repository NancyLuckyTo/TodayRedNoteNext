import { URL } from 'url'
import Post from '../models/postModel'
import getOssClient from '../services/storageService'
import { encodeCursor, decodeFeedCursor } from '../utils/cursorUtils'
import { formatPostWithImages, applyImagesToTarget } from '../utils/postUtils'
import { IMAGE_QUALITY } from '@today-red-note/types'
import { extractTopic, extractTags } from '../services/aiService'
import topicService from '../services/topicService'
import tagService from '../services/tagService'
import userProfileService from '../services/userProfileService'

const MAX_RELATED_NOTES = 10 // 笔记详情页相关笔记最大数量
const MAX_INTEREST_TAGS = 10 // 个性化推荐时使用的兴趣标签数量上限
const MAX_EXCLUDE_IDS = 200 // 最大排除 ID 数量，防止查询过大

// 首屏数据缓存配置
const FIRST_PAGE_CACHE_TTL = 60 * 1000 // 缓存 60 秒
let firstPageCache: {
  data: any
  timestamp: number
  limit: number
} | null = null

// 清除首屏缓存（发布/删除帖子时调用）
function invalidateFirstPageCache() {
  firstPageCache = null
}

class PostService {
  /**
   * 构建分页结果
   */
  private buildPaginationResult(
    posts: any[],
    pagination: {
      nextCursor: string | null
      hasNextPage: boolean
      limit: number
    }
  ) {
    return {
      posts,
      pagination,
    }
  }

  /**
   * 构建兜底流结果
   */
  private async buildFallbackFeedResult(
    limit: number,
    cursor?: string,
    excludeIds?: string[]
  ) {
    const baseResult = await this.getPosts(limit, cursor, excludeIds)
    const basePagination = baseResult.pagination ?? {
      nextCursor: null,
      hasNextPage: false,
      limit,
    }

    let wrappedNextCursor: string | null = null
    if (basePagination.hasNextPage && basePagination.nextCursor) {
      const payload = {
        phase: 'fallback',
        innerCursor: basePagination.nextCursor,
      }
      wrappedNextCursor = encodeCursor(payload)
    }

    return this.buildPaginationResult(baseResult.posts, {
      ...basePagination,
      nextCursor: wrappedNextCursor,
    })
  }

  /**
   * 创建笔记
   */
  async createPost(userId: string, data: any) {
    const { body, bodyPreview, images, topic: userTopic } = data

    if (!body || !String(body).trim()) {
      throw new Error('Body are required')
    }

    const bodyStr = String(body).trim()
    const payload: any = {
      body: bodyStr,
      author: userId,
    }

    payload.bodyPreview = bodyPreview ? bodyPreview : ''

    applyImagesToTarget(payload, images)

    // 话题处理：优先使用用户手动传入的话题，否则 AI 自动提取
    try {
      if (userTopic && typeof userTopic === 'string' && userTopic.trim()) {
        // 用户手动输入话题
        const topic = await topicService.getOrCreateTopic(userTopic.trim())
        payload.topic = topic._id
      } else {
        // AI 自动提取话题
        const topicName = await extractTopic(bodyStr)
        const topic = await topicService.getOrCreateTopic(topicName)
        payload.topic = topic._id
      }
    } catch (error) {
      console.error('Topic generation failed:', error)
    }

    // AI 提取标签
    try {
      const tagNames = await extractTags(bodyStr)
      const tagIds = await tagService.getOrCreateTags(tagNames)
      payload.tags = tagIds
    } catch (error) {
      console.error('Tag extraction failed:', error)
    }

    const post = await Post.create(payload)

    // 清除首屏缓存，确保新笔记能被看到
    invalidateFirstPageCache()

    if (payload.topic) {
      topicService.incrementTopicCount(payload.topic).catch(console.error)
    }

    if (payload.tags && payload.tags.length > 0) {
      tagService.incrementTagCounts(payload.tags).catch(console.error)
    }

    return post
  }

  /**
   * 获取笔记详情
   */
  async getPostById(id: string, currentUserId?: string) {
    const post = await Post.findById(id)
      .populate('author', 'username')
      .populate('topic', 'name')
      .populate('tags', 'name')

    if (!post) return null

    return formatPostWithImages(post, IMAGE_QUALITY.PREVIEW, false)
  }

  /**
   * 用于笔记详情页获取更多相关笔记（支持三阶段推荐：related -> profile -> fallback）
   */
  async getRelatedPosts(
    id: string,
    userId?: string,
    limit: number = MAX_RELATED_NOTES,
    cursor?: string,
    excludeIds?: string[]
  ) {
    const currentPost = await Post.findById(id)
    if (!currentPost) return null

    // 解析 cursor 确定当前阶段
    let phase: 'related' | 'profile' | 'fallback' = 'related'
    let relatedCursorCreatedAt: Date | undefined
    let relatedCursorId: string | undefined
    let profileCursorCreatedAt: Date | undefined
    let profileCursorId: string | undefined
    let fallbackInnerCursor: string | undefined

    if (cursor) {
      const decoded = decodeFeedCursor(cursor)
      if (decoded) {
        if (decoded.phase === 'related' && decoded.createdAt && decoded._id) {
          phase = 'related'
          relatedCursorCreatedAt = new Date(decoded.createdAt)
          relatedCursorId = String(decoded._id)
        } else if (decoded.phase === 'profile') {
          phase = 'profile'
          if (decoded.createdAt && decoded._id) {
            profileCursorCreatedAt = new Date(decoded.createdAt)
            profileCursorId = String(decoded._id)
          }
        } else if (decoded.phase === 'fallback') {
          phase = 'fallback'
          if (typeof decoded.innerCursor === 'string') {
            fallbackInnerCursor = decoded.innerCursor
          }
        }
      }
    }

    // 确保当前笔记 ID 始终被排除
    const safeExcludeIds = excludeIds
      ? [...excludeIds.slice(0, MAX_EXCLUDE_IDS), id]
      : [id]

    // Phase: fallback - 兜底流
    if (phase === 'fallback') {
      return this.buildFallbackFeedResult(
        limit,
        fallbackInnerCursor,
        safeExcludeIds
      )
    }

    // Phase: profile - 用户画像推荐
    if (phase === 'profile') {
      return this.buildRelatedProfilePhase(
        userId,
        limit,
        profileCursorCreatedAt,
        profileCursorId,
        safeExcludeIds
      )
    }

    // Phase: related - 基于 tags/topic 的相关推荐
    return this.buildRelatedPhase(
      currentPost,
      userId,
      limit,
      relatedCursorCreatedAt,
      relatedCursorId,
      safeExcludeIds
    )
  }

  /**
   * 构建 related 阶段结果（基于 tags/topic）
   */
  private async buildRelatedPhase(
    currentPost: any,
    userId: string | undefined,
    limit: number,
    cursorCreatedAt?: Date,
    cursorId?: string,
    excludeIds?: string[]
  ) {
    // 构建查询条件
    const query: any = {
      _id: { $nin: excludeIds || [] },
      $or: [] as any[],
    }

    // 标签匹配条件
    if (currentPost.tags && currentPost.tags.length > 0) {
      query.$or.push({ tags: { $in: currentPost.tags } })
    }
    // 话题匹配条件
    if (currentPost.topic) {
      query.$or.push({ topic: currentPost.topic })
    }

    // 如果没有 tags 也没有 topic，直接进入画像阶段
    if (query.$or.length === 0) {
      return this.buildRelatedProfilePhase(
        userId,
        limit,
        undefined,
        undefined,
        excludeIds
      )
    }

    // cursor 分页条件
    if (cursorCreatedAt && cursorId) {
      query.$and = [
        { $or: query.$or },
        {
          $or: [
            { createdAt: { $lt: cursorCreatedAt } },
            { createdAt: cursorCreatedAt, _id: { $lt: cursorId } },
          ],
        },
      ]
      delete query.$or
    }

    const posts = await Post.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1)
      .populate('author', 'username avatar')
      .populate('topic', 'name')
      .populate('tags', 'name')
      .lean()

    const hasMoreRelated = posts.length > limit
    if (hasMoreRelated) {
      posts.pop()
    }

    const formattedPosts = posts.map((post: any) =>
      formatPostWithImages(post, IMAGE_QUALITY.THUMBNAIL, true)
    )

    // related 阶段还有数据
    if (hasMoreRelated && formattedPosts.length > 0) {
      const lastPost = formattedPosts[formattedPosts.length - 1]
      const nextCursor = encodeCursor({
        phase: 'related',
        createdAt: lastPost.createdAt,
        _id: lastPost._id,
      })
      return this.buildPaginationResult(formattedPosts, {
        nextCursor,
        hasNextPage: true,
        limit,
      })
    }

    // related 阶段数据不足，需要用 profile/fallback 补充
    const remainingNeeded = limit - formattedPosts.length

    if (remainingNeeded <= 0) {
      // 刚好满页，下一页切换到 profile 阶段
      const nextCursor = encodeCursor({ phase: 'profile' })
      return this.buildPaginationResult(formattedPosts, {
        nextCursor,
        hasNextPage: true,
        limit,
      })
    }

    // 需要从 profile/fallback 补充
    const existingIds = new Set(formattedPosts.map((p: any) => String(p._id)))
    const profileExcludeIds = [
      ...(excludeIds || []),
      ...Array.from(existingIds),
    ]

    const supplementResult = await this.buildRelatedProfilePhase(
      userId,
      remainingNeeded,
      undefined,
      undefined,
      profileExcludeIds
    )

    // 去重合并
    const dedupSupplementPosts = supplementResult.posts.filter(
      (p: any) => !existingIds.has(String(p._id))
    )
    const combinedPosts = [...formattedPosts, ...dedupSupplementPosts]

    // 构建下一页 cursor
    let nextCursor: string | null = null
    if (
      supplementResult.pagination?.hasNextPage &&
      supplementResult.pagination?.nextCursor
    ) {
      nextCursor = supplementResult.pagination.nextCursor
    } else if (dedupSupplementPosts.length > 0) {
      // supplement 已结束但有数据，检查是否还有 fallback
      nextCursor = encodeCursor({ phase: 'fallback' })
    }

    return this.buildPaginationResult(combinedPosts, {
      nextCursor,
      hasNextPage: Boolean(nextCursor),
      limit,
    })
  }

  /**
   * 构建 profile 阶段结果（基于用户画像）
   */
  private async buildRelatedProfilePhase(
    userId: string | undefined,
    limit: number,
    cursorCreatedAt?: Date,
    cursorId?: string,
    excludeIds?: string[]
  ) {
    // 无用户登录，直接进入兜底流
    if (!userId) {
      return this.buildFallbackFeedResult(limit, undefined, excludeIds)
    }

    const profile = await userProfileService.getOrCreateUserProfile(userId)

    // 提取用户感兴趣的标签
    const sortedInterests = Array.isArray(profile.interests)
      ? [...profile.interests].sort((a: any, b: any) => b.weight - a.weight)
      : []

    const interestTagIds = sortedInterests
      .slice(0, MAX_INTEREST_TAGS)
      .map((item: any) => item.tagId)

    // 无兴趣标签，直接进入兜底流
    if (!interestTagIds.length) {
      return this.buildFallbackFeedResult(limit, undefined, excludeIds)
    }

    // 构建查询
    const query: any = {
      tags: { $in: interestTagIds },
    }

    if (excludeIds && excludeIds.length > 0) {
      query._id = { $nin: excludeIds.slice(0, MAX_EXCLUDE_IDS) }
    }

    if (cursorCreatedAt && cursorId) {
      query.$or = [
        { createdAt: { $lt: cursorCreatedAt } },
        { createdAt: cursorCreatedAt, _id: { $lt: cursorId } },
      ]
    }

    const posts = await Post.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1)
      .populate('author', 'username avatar')
      .populate('topic', 'name')
      .populate('tags', 'name')
      .lean()

    const hasMoreProfile = posts.length > limit
    if (hasMoreProfile) {
      posts.pop()
    }

    const formattedPosts = posts.map((post: any) =>
      formatPostWithImages(post, IMAGE_QUALITY.THUMBNAIL, true)
    )

    // profile 数据为空，直接进入 fallback
    if (!formattedPosts.length) {
      return this.buildFallbackFeedResult(limit, undefined, excludeIds)
    }

    // profile 还有数据
    if (hasMoreProfile) {
      const lastPost = formattedPosts[formattedPosts.length - 1]
      const nextCursor = encodeCursor({
        phase: 'profile',
        createdAt: lastPost.createdAt,
        _id: lastPost._id,
      })
      return this.buildPaginationResult(formattedPosts, {
        nextCursor,
        hasNextPage: true,
        limit,
      })
    }

    // profile 数据不足，用 fallback 补充
    const remainingNeeded = limit - formattedPosts.length

    if (remainingNeeded <= 0) {
      const nextCursor = encodeCursor({ phase: 'fallback' })
      return this.buildPaginationResult(formattedPosts, {
        nextCursor,
        hasNextPage: true,
        limit,
      })
    }

    const existingIds = new Set(formattedPosts.map((p: any) => String(p._id)))
    const fallbackExcludeIds = [
      ...(excludeIds || []),
      ...Array.from(existingIds),
    ]

    const fallbackResult = await this.buildFallbackFeedResult(
      remainingNeeded,
      undefined,
      fallbackExcludeIds
    )

    const dedupFallbackPosts = fallbackResult.posts.filter(
      (p: any) => !existingIds.has(String(p._id))
    )
    const combinedPosts = [...formattedPosts, ...dedupFallbackPosts]

    let nextCursor: string | null = null
    if (
      fallbackResult.pagination?.hasNextPage &&
      fallbackResult.pagination?.nextCursor
    ) {
      nextCursor = fallbackResult.pagination.nextCursor
    }

    return this.buildPaginationResult(combinedPosts, {
      nextCursor,
      hasNextPage: Boolean(nextCursor),
      limit,
    })
  }

  /**
   * 更新笔记
   */
  async updatePost(id: string, userId: string, data: any) {
    const found = await Post.findById(id)
    if (!found) return null
    if (found.author.toString() !== userId) {
      throw new Error('Forbidden')
    }

    const { body, bodyPreview, images, topic: userTopic } = data
    const update: any = {}

    if (typeof body === 'string') {
      const bodyStr = body.trim()
      update.body = bodyStr
      update.bodyPreview = bodyPreview ? bodyPreview : ''
    }

    if (Array.isArray(images)) {
      applyImagesToTarget(update, images, { resetWhenEmpty: true })
    }

    // 更新话题：如果用户提供了话题则更新
    if (typeof userTopic === 'string') {
      if (userTopic.trim()) {
        const topic = await topicService.getOrCreateTopic(userTopic.trim())
        update.topic = topic._id
      } else {
        // 用户清空了话题
        update.topic = null
      }
    }

    return await Post.findByIdAndUpdate(id, update, { new: true })
  }

  /**
   * 删除笔记
   */
  async deletePost(id: string, userId: string) {
    const found = await Post.findById(id)
    if (!found) return null
    if (found.author.toString() !== userId) {
      throw new Error('Forbidden')
    }

    const images = Array.isArray(found.images) ? found.images : []
    if (images.length) {
      const objectKeys = images
        .map(img => {
          try {
            const parsed = new URL(String(img.url))
            return parsed.pathname.replace(/^\/+/, '')
          } catch {
            return null
          }
        })
        .filter((key): key is string => Boolean(key))

      if (objectKeys.length) {
        const client = getOssClient()
        if (objectKeys.length === 1) {
          await client.delete(objectKeys[0])
        } else {
          await client.deleteMulti(objectKeys, { quiet: true })
        }
      }
    }

    await found.deleteOne()

    // 清除首屏缓存
    invalidateFirstPageCache()

    return true
  }

  /**
   * 用于瀑布流首页获取笔记列表
   * @param excludeIds 排除的笔记 ID 列表，用于避免重复展示
   */
  async getPosts(limit: number, cursor?: string, excludeIds?: string[]) {
    // 首屏请求缓存优化：无 cursor 且无 excludeIds 时使用缓存
    const isFirstPage = !cursor && (!excludeIds || excludeIds.length === 0)

    if (isFirstPage) {
      const now = Date.now()
      if (
        firstPageCache &&
        firstPageCache.limit === limit &&
        now - firstPageCache.timestamp < FIRST_PAGE_CACHE_TTL
      ) {
        // 命中缓存，直接返回
        return firstPageCache.data
      }
    }

    let query: any = {}

    // 排除已展示的笔记 ID
    if (excludeIds && excludeIds.length > 0) {
      const safeExcludeIds = excludeIds.slice(0, MAX_EXCLUDE_IDS)
      query._id = { $nin: safeExcludeIds }
    }

    if (cursor) {
      try {
        const decoded = JSON.parse(
          Buffer.from(cursor, 'base64').toString('utf-8')
        )
        const cursorTime = new Date(decoded.createdAt)
        const cursorId = decoded._id

        const cursorCondition = {
          $or: [
            { createdAt: { $lt: cursorTime } },
            { createdAt: cursorTime, _id: { $lt: cursorId } },
          ],
        }

        // 合并 cursor 条件和 excludeIds 条件
        if (query._id) {
          query = { $and: [{ _id: query._id }, cursorCondition] }
        } else {
          query = cursorCondition
        }
      } catch (err) {
        // cursor 解析失败，保持现有 query（可能包含 excludeIds）
      }
    }

    const posts = await Post.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1)
      .populate('author', 'username avatar')
      .populate('topic', 'name')
      .populate('tags', 'name')
      .lean()

    const hasNextPage = posts.length > limit
    if (hasNextPage) {
      posts.pop()
    }

    const formattedPosts = posts.map((post: any) =>
      formatPostWithImages(post, IMAGE_QUALITY.THUMBNAIL, true)
    )

    let nextCursor = null
    if (hasNextPage && formattedPosts.length > 0) {
      const lastPost = formattedPosts[formattedPosts.length - 1]
      const cursorPayload = {
        createdAt: lastPost.createdAt,
        _id: lastPost._id,
      }
      nextCursor = encodeCursor(cursorPayload)
    }

    const result = this.buildPaginationResult(formattedPosts, {
      nextCursor,
      hasNextPage,
      limit,
    })

    // 首屏请求：写入缓存
    if (isFirstPage) {
      firstPageCache = {
        data: result,
        timestamp: Date.now(),
        limit,
      }
    }

    return result
  }

  /**
   * 获取用户自己的笔记列表
   */
  async getUserPosts(userId: string, limit: number, cursor?: string) {
    let query: any = { author: userId }

    if (cursor) {
      try {
        const decoded = JSON.parse(
          Buffer.from(cursor, 'base64').toString('utf-8')
        )
        const cursorTime = new Date(decoded.updatedAt)
        const cursorId = decoded._id

        query = {
          author: userId,
          $or: [
            { updatedAt: { $lt: cursorTime } },
            { updatedAt: cursorTime, _id: { $lt: cursorId } },
          ],
        }
      } catch (err) {
        query = { author: userId }
      }
    }

    const posts = await Post.find(query)
      .sort({ updatedAt: -1, _id: -1 })
      .limit(limit + 1)
      .populate('author', 'username avatar')
      .populate('topic', 'name')
      .populate('tags', 'name')
      .lean()

    const hasNextPage = posts.length > limit
    if (hasNextPage) {
      posts.pop()
    }

    const formattedPosts = posts.map((post: any) =>
      formatPostWithImages(post, IMAGE_QUALITY.THUMBNAIL, true)
    )

    let nextCursor: string | null = null
    if (hasNextPage && formattedPosts.length > 0) {
      const lastPost = formattedPosts[formattedPosts.length - 1]
      const cursorPayload = {
        updatedAt: lastPost.updatedAt,
        _id: lastPost._id,
      }
      nextCursor = encodeCursor(cursorPayload)
    }

    return this.buildPaginationResult(formattedPosts, {
      nextCursor,
      hasNextPage,
      limit,
    })
  }

  /**
   * 混合型个性化推荐信息流：先推荐用户画像匹配的笔记，如果余量不足则推荐时间流笔记
   * @param excludeIds 排除的笔记 ID 列表，用于避免重复展示
   */
  async getPersonalizedFeed(
    userId: string,
    limit: number,
    cursor?: string,
    excludeIds?: string[]
  ) {
    let phase: 'profile' | 'fallback' = 'profile'
    let profileCursorCreatedAt: Date | undefined // 用于在画像阶段进行数据库分页查询
    let profileCursorId: string | undefined
    let fallbackInnerCursor: string | undefined

    // 如果存在 cursor，则说明不是第一页，需要解析 cursor 中的状态
    if (cursor) {
      const decoded = decodeFeedCursor(cursor) // 解码 base64 字符串为 JSON 对象
      if (
        decoded &&
        decoded.phase === 'profile' &&
        decoded.createdAt &&
        decoded._id
      ) {
        // 画像阶段
        phase = 'profile'
        profileCursorCreatedAt = new Date(decoded.createdAt)
        profileCursorId = String(decoded._id)
      } else if (decoded && decoded.phase === 'fallback') {
        // 兜底阶段
        phase = 'fallback'
        if (typeof decoded.innerCursor === 'string') {
          fallbackInnerCursor = decoded.innerCursor
        }
      } else {
        // 解析失败，退化到兜底阶段
        phase = 'fallback'
        fallbackInnerCursor = cursor
      }
    }

    // 兜底阶段：完全复用时间流逻辑
    if (phase === 'fallback') {
      return this.buildFallbackFeedResult(
        limit,
        fallbackInnerCursor,
        excludeIds
      )
    }

    // 画像阶段：根据用户兴趣标签召回
    const profile = await userProfileService.getOrCreateUserProfile(userId)

    // 提取用户感兴趣的标签，并按权重降序排列
    const sortedInterests = Array.isArray(profile.interests)
      ? [...profile.interests].sort((a: any, b: any) => b.weight - a.weight)
      : []

    // 取出前 MAX_INTEREST_TAGS 个标签 ID，避免查询条件过长
    const interestTagIds = sortedInterests
      .slice(0, MAX_INTEREST_TAGS)
      .map((item: any) => item.tagId)

    // 无兴趣标签，直接退化到兜底流
    if (!interestTagIds.length) {
      return this.buildFallbackFeedResult(limit, undefined, excludeIds)
    }

    // 执行数据库查询
    const query: any = {
      // 构造查询条件：笔记的 tags 字段必须包含用户的兴趣标签之一 ($in 查询)
      tags: { $in: interestTagIds },
    }

    // 排除已展示的笔记 ID
    if (excludeIds && excludeIds.length > 0) {
      const safeExcludeIds = excludeIds.slice(0, MAX_EXCLUDE_IDS)
      query._id = { $nin: safeExcludeIds }
    }

    if (profileCursorCreatedAt && profileCursorId) {
      query.$or = [
        { createdAt: { $lt: profileCursorCreatedAt } },
        { createdAt: profileCursorCreatedAt, _id: { $lt: profileCursorId } },
      ]
    }

    // 查询数据库
    const rawProfilePosts = await Post.find(query)
      .sort({ createdAt: -1, _id: -1 }) // 按发布时间倒序
      .limit(limit + 1)
      .populate('author', 'username avatar')
      .populate('topic', 'name')
      .populate('tags', 'name')
      .lean() // 转为普通 JS 对象，提高性能

    // 是否还有下一页
    const hasMoreProfile = rawProfilePosts.length > limit
    if (hasMoreProfile) {
      rawProfilePosts.pop()
    }

    // 数据清洗与格式化
    const profilePosts = rawProfilePosts.map((post: any) =>
      formatPostWithImages(post, IMAGE_QUALITY.THUMBNAIL, true)
    )

    // 如果画像召回为空，直接进入兜底阶段
    if (!profilePosts.length) {
      return this.buildFallbackFeedResult(limit, undefined, excludeIds)
    }

    // 画像阶段还有下一页，则本次只返回画像数据
    if (hasMoreProfile) {
      const lastPost = profilePosts[profilePosts.length - 1]
      const payload = {
        phase: 'profile',
        createdAt: lastPost.createdAt,
        _id: lastPost._id,
      }
      const nextCursor = encodeCursor(payload)

      return this.buildPaginationResult(profilePosts, {
        nextCursor,
        hasNextPage: true,
        limit,
      })
    }

    // 画像阶段最后一页：不足一整页，用兜底流补齐；
    // 如果刚好一整页（fallbackNeeded = 0），则下一页直接切换到兜底阶段
    const fallbackNeeded = Math.max(limit - profilePosts.length, 0)

    if (fallbackNeeded <= 0) {
      const payload = {
        phase: 'fallback', // 下一次请求直接从 fallback 开始
      }
      const nextCursor = encodeCursor(payload)

      return this.buildPaginationResult(profilePosts, {
        nextCursor,
        hasNextPage: true,
        limit,
      })
    }

    const fallbackResult = await this.getPosts(
      fallbackNeeded,
      undefined,
      excludeIds
    )
    const fallbackPagination = fallbackResult.pagination ?? {
      nextCursor: null,
      hasNextPage: false,
      limit: fallbackNeeded,
    }

    // 去重逻辑：防止兜底流里出现了画像流里刚展示过的笔记
    const existingIds = new Set(
      profilePosts.map((post: any) => String(post._id))
    )
    const dedupFallbackPosts = fallbackResult.posts.filter(
      (post: any) => !existingIds.has(String(post._id))
    )
    const combinedPosts = [...profilePosts, ...dedupFallbackPosts]

    let combinedNextCursor: string | null = null
    if (fallbackPagination.hasNextPage && fallbackPagination.nextCursor) {
      const payload = {
        phase: 'fallback',
        innerCursor: fallbackPagination.nextCursor,
      }
      combinedNextCursor = encodeCursor(payload)
    }

    return this.buildPaginationResult(combinedPosts, {
      nextCursor: combinedNextCursor,
      hasNextPage: Boolean(fallbackPagination.hasNextPage),
      limit,
    })
  }
}

const postService = new PostService()
export default postService
