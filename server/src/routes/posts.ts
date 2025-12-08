import { Router } from 'express'
import auth from '../middleware/auth.js'
import postController from '../controllers/postController.js'

const router = Router()

// 发布笔记
router.post('/', auth, postController.create)

// 获取用户自己的笔记列表
router.get('/mine', auth, postController.listMine)

// 获取瀑布流笔记列表
router.get('/', postController.list)

// 获取笔记详情，联表作者信息
router.get('/:id', postController.getOne)

// 获取相关推荐笔记
router.get('/:id/related', postController.getRelated)

// 获取笔记评论列表
router.get('/:id/comments', postController.getComments)

// 新增笔记评论
router.post('/:id/comments', auth, postController.addComment)

// 更新笔记
router.put('/:id', auth, postController.update)

// 删除笔记
router.delete('/:id', auth, postController.delete)

export default router
