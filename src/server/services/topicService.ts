import Topic, { ITopic } from '../models/topicModel'

/**
 * 标准化话题名称
 * @param name 原始名称
 * @returns 标准化名称
 */
export function normalizeTopicName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, '')
}

/**
 * 获取或创建话题
 * @param name 话题名称
 * @returns 话题文档
 */
export async function getOrCreateTopic(name: string): Promise<ITopic> {
  const normalizedName = normalizeTopicName(name)

  // 尝试查找现有话题
  let topic = await Topic.findOne({ normalizedName })

  if (!topic) {
    // 创建新话题
    topic = await Topic.create({
      name: name.trim(),
      normalizedName,
    })
  }

  return topic
}

/**
 * 增加话题引用计数
 * @param topicId 话题ID
 */
export async function incrementTopicCount(topicId: string): Promise<void> {
  await Topic.findByIdAndUpdate(topicId, { $inc: { postCount: 1 } })
}

/**
 * 查找相似话题，简单模糊匹配
 * @param keyword 关键词
 * @returns 话题列表
 */
export async function findSimilarTopics(keyword: string): Promise<ITopic[]> {
  const regex = new RegExp(keyword, 'i')
  return Topic.find({
    $or: [{ name: regex }, { normalizedName: regex }],
  })
    .sort({ postCount: -1 })
    .limit(5)
}

export default {
  getOrCreateTopic,
  incrementTopicCount,
  findSimilarTopics,
  normalizeTopicName,
}
