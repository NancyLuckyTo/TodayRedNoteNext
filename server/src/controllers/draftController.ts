import { Response, NextFunction } from 'express'
import { AuthRequest } from '../middleware/auth.js'
import draftService from '../services/draftService.js'

class DraftController {
  /**
   * 获取当前用户的草稿
   * GET /api/drafts
   */
  async get(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.userId
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' })
      }

      const draft = await draftService.getDraft(userId)
      return res.json({ draft })
    } catch (err) {
      next(err)
    }
  }

  /**
   * 创建新草稿
   * POST /api/drafts
   */
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.userId
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' })
      }

      const { body, images } = req.body
      const draft = await draftService.saveDraft(userId, {
        body: body || '',
        images,
      })

      return res.status(201).json({ draft })
    } catch (err) {
      next(err)
    }
  }

  /**
   * 更新草稿
   * PUT /api/drafts/:id
   */
  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.userId
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' })
      }

      const { id } = req.params
      const { body, images } = req.body

      const draft = await draftService.updateDraft(id, userId, {
        body: body || '',
        images,
      })

      if (!draft) {
        return res.status(404).json({ message: 'Draft not found' })
      }

      return res.json({ draft })
    } catch (err) {
      next(err)
    }
  }

  /**
   * 删除草稿
   * DELETE /api/drafts/:id
   */
  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.userId
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' })
      }

      const { id } = req.params
      const success = await draftService.deleteDraft(id, userId)

      if (!success) {
        return res.status(404).json({ message: 'Draft not found' })
      }

      return res.status(204).end()
    } catch (err) {
      next(err)
    }
  }
}

export default new DraftController()
