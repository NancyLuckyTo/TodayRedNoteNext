import UserProfile, { IUserProfile } from '../models/userProfileModel'
import Post from '../models/postModel'
import { Types } from 'mongoose'
import Topic from '../models/topicModel'
import tagService from '../services/tagService'

const SCORE_OF_VIEW = 1
const SCORE_OF_LIKE = 3
const SCORE_OF_SHARE = 4
const SCORE_OF_COLLECT = 5

const LEARNING_RATE = 0.05
const MAX_INTERESTS = 50

const MAX_BEHAVIOR_HISTORY = 100

/**
 * 获取或创建用户画像
 * @param userId 用户ID
 * @returns 用户画像文档
 */
export async function getOrCreateUserProfile(
  userId: string
): Promise<IUserProfile> {
  const userObjectId = new Types.ObjectId(userId)
  let profile = await UserProfile.findOne({ userId: userObjectId })

  if (!profile) {
    profile = await UserProfile.create({
      userId: userObjectId,
      interests: [],
      behaviorHistory: [],
      preferences: {
        preferredTags: [],
        blockedTags: [],
      },
    })
  }

  return profile
}

/**
 * 更新用户兴趣权重
 * @param userId 用户ID
 * @param tagId 标签ID
 * @param score 增加的分数
 */
export async function updateUserInterest(
  userId: string,
  tagId: string,
  score: number
): Promise<void> {
  const profile = await getOrCreateUserProfile(userId)
  const tagObjectId = new Types.ObjectId(tagId)

  const existingInterestIndex = profile.interests.findIndex(i =>
    i.tagId.equals(tagObjectId)
  )

  // 更新已有兴趣
  if (existingInterestIndex > -1) {
    // 更新现有兴趣，使用简单的衰减 + 累加算法
    // 新权重 = 旧权重 * 0.95 + 新分数 * 学习率
    let newWeight =
      profile.interests[existingInterestIndex].weight + score * LEARNING_RATE
    if (newWeight > 1) newWeight = 1
    profile.interests[existingInterestIndex].weight = newWeight
    profile.interests[existingInterestIndex].lastUpdated = new Date()
  } else {
    // 新增兴趣
    profile.interests.push({
      tagId: tagObjectId,
      weight: Math.min(score * LEARNING_RATE, 1),
      lastUpdated: new Date(),
    })
  }

  // 保持兴趣列表不过长
  if (profile.interests.length > MAX_INTERESTS) {
    profile.interests.sort((a, b) => b.weight - a.weight)
    profile.interests = profile.interests.slice(0, MAX_INTERESTS)
  }

  await profile.save()
}

/**
 * 追踪用户行为
 * @param userId 用户ID
 * @param postId 笔记ID
 * @param action 行为类型
 */
export async function trackUserBehavior(
  userId: string,
  postId: string,
  action: 'view' | 'like' | 'collect' | 'share'
): Promise<void> {
  try {
    const profile = await getOrCreateUserProfile(userId)
    const post = await Post.findById(postId)

    if (!post) return

    // Fallback: 如果没有标签但有话题，使用话题生成标签
    if ((!post.tags || post.tags.length === 0) && post.topic) {
      try {
        const topic = await Topic.findById(post.topic)
        if (topic) {
          const tagIds = await tagService.getOrCreateTags([topic.name])
          post.tags = tagIds
          await post.save() // 保存生成的标签到笔记
        }
      } catch (err) {
        console.error('Failed to fallback topic to tag:', err)
      }
    }

    // 记录行为历史
    profile.behaviorHistory.push({
      action,
      postId: new Types.ObjectId(postId),
      tagIds: post.tags,
      timestamp: new Date(),
    })

    // 限制历史记录长度
    if (profile.behaviorHistory.length > MAX_BEHAVIOR_HISTORY) {
      profile.behaviorHistory =
        profile.behaviorHistory.slice(-MAX_BEHAVIOR_HISTORY)
    }

    await profile.save()

    // 如果笔记有标签，更新兴趣权重
    if (post.tags && post.tags.length > 0) {
      const scoreMap = {
        view: SCORE_OF_VIEW,
        like: SCORE_OF_LIKE,
        collect: SCORE_OF_COLLECT,
        share: SCORE_OF_SHARE,
      }

      // 为每个标签更新兴趣
      for (const tagId of post.tags) {
        await updateUserInterest(userId, tagId.toString(), scoreMap[action])
      }
    }
  } catch (error) {
    console.error('Track user behavior failed:', error)
  }
}

export default {
  getOrCreateUserProfile,
  updateUserInterest,
  trackUserBehavior,
}
