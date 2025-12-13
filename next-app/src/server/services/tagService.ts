import Tag, { ITag } from '../models/tagModel'
import { Types } from 'mongoose'

/**
 * 标准化标签名称
 * @param name 原始名称
 * @returns 标准化名称
 */
export function normalizeTagName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, '')
}

/**
 * 获取或创建标签
 * @param name 标签名称
 * @returns 标签文档
 */
export async function getOrCreateTag(name: string): Promise<ITag> {
  const normalizedName = normalizeTagName(name)

  // 尝试查找现有标签
  let tag = await Tag.findOne({ normalizedName })

  if (!tag) {
    // 创建新标签
    tag = await Tag.create({
      name: name.trim(),
      normalizedName,
    })
  }

  return tag
}

/**
 * 批量获取或创建标签
 * @param names 标签名称数组
 * @returns 标签ID数组
 */
export async function getOrCreateTags(
  names: string[]
): Promise<Types.ObjectId[]> {
  const tagIds: Types.ObjectId[] = []

  for (const name of names) {
    try {
      const tag = await getOrCreateTag(name)
      tagIds.push(tag._id as Types.ObjectId)
    } catch (error) {
      console.error(`Failed to create tag: ${name}`, error)
    }
  }

  return tagIds
}

/**
 * 增加标签引用计数
 * @param tagId 标签ID
 */
export async function incrementTagCount(tagId: string): Promise<void> {
  await Tag.findByIdAndUpdate(tagId, { $inc: { postCount: 1 } })
}

/**
 * 批量增加标签引用计数
 * @param tagIds 标签ID数组
 */
export async function incrementTagCounts(
  tagIds: Types.ObjectId[]
): Promise<void> {
  await Promise.all(
    tagIds.map(tagId =>
      Tag.findByIdAndUpdate(tagId, { $inc: { postCount: 1 } })
    )
  )
}

/**
 * 查找相似标签，简单模糊匹配
 * @param keyword 关键词
 * @returns 标签列表
 */
export async function findSimilarTags(keyword: string): Promise<ITag[]> {
  const regex = new RegExp(keyword, 'i')
  return Tag.find({
    $or: [{ name: regex }, { normalizedName: regex }],
  })
    .sort({ postCount: -1 })
    .limit(10)
}

/**
 * 获取热门标签
 * @param limit 数量限制
 * @returns 标签列表
 */
export async function getPopularTags(limit: number = 20): Promise<ITag[]> {
  return Tag.find().sort({ postCount: -1 }).limit(limit)
}

export default {
  getOrCreateTag,
  getOrCreateTags,
  incrementTagCount,
  incrementTagCounts,
  findSimilarTags,
  getPopularTags,
  normalizeTagName,
}
