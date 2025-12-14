import Draft, { IDraft } from '../models/draftModel'

interface DraftData {
  body: string
  topic?: string
  images?: string[]
}

class DraftService {
  /**
   * 获取用户的草稿
   * 每个用户只有一个草稿
   */
  async getDraft(userId: string): Promise<IDraft | null> {
    return Draft.findOne({ user: userId })
  }

  /**
   * 创建或更新草稿（upsert）
   * 如果用户已有草稿则更新，否则创建新草稿
   */
  async saveDraft(userId: string, data: DraftData): Promise<IDraft> {
    const draft = await Draft.findOneAndUpdate(
      { user: userId },
      {
        $set: {
          body: data.body,
          topic: data.topic || '',
          images: data.images || [],
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    )
    return draft
  }

  /**
   * 更新草稿
   */
  async updateDraft(
    draftId: string,
    userId: string,
    data: DraftData
  ): Promise<IDraft | null> {
    const draft = await Draft.findOneAndUpdate(
      { _id: draftId, user: userId },
      {
        $set: {
          body: data.body,
          topic: data.topic || '',
          images: data.images || [],
        },
      },
      { new: true }
    )
    return draft
  }

  /**
   * 删除草稿
   */
  async deleteDraft(draftId: string, userId: string): Promise<boolean> {
    const result = await Draft.deleteOne({ _id: draftId, user: userId })
    return result.deletedCount > 0
  }

  /**
   * 删除用户的所有草稿（发布成功后调用）
   */
  async clearUserDraft(userId: string): Promise<boolean> {
    const result = await Draft.deleteOne({ user: userId })
    return result.deletedCount > 0
  }
}

const draftService = new DraftService()
export default draftService
