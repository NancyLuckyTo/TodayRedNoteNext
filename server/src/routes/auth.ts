import { Router } from 'express'
import jwt from 'jsonwebtoken'
import User from '../models/userModel.js'
import auth, { AuthRequest } from '../middleware/auth.js'

const router = Router()

router.post('/register', async (req, res, next) => {
  try {
    const { username, password } = req.body ?? {}
    if (!username || !password) {
      return res
        .status(400)
        .json({ message: 'username and password are required' })
    }

    const existed = await User.exists({ username })
    if (existed) {
      return res.status(409).json({ message: 'username already exists' })
    }

    const user = new User({ username, password })
    await user.save()

    return res.status(201).json({ success: true })
  } catch (err: any) {
    if (err && err.code === 11000) {
      return res.status(409).json({ message: 'username already exists' })
    }
    next(err)
  }
})

router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body ?? {}
    if (!username || !password) {
      return res
        .status(400) // 用户端输入错误
        .json({ message: 'username and password are required' })
    }

    // 查询用户
    const user = await User.findOne({ username }).select('+password')
    // 验证用户是否存在
    if (!user) {
      return res.status(401).json({ message: 'invalid credentials' })
    }

    // 验证密码
    const ok = await user.comparePassword(password)
    if (!ok) {
      // 密码不匹配
      return res.status(401).json({ message: 'invalid credentials' })
    }

    // 检查服务器配置
    const secret = process.env.JWT_SECRET
    if (!secret) {
      // 服务器配置错误
      return res.status(500).json({ message: 'Server misconfigured' })
    }

    // 验证通过，创建并签署 JWT
    const token = jwt.sign({ userId: user.id }, secret, {
      expiresIn: '7d',
    })
    return res.json({ token })
  } catch (err) {
    next(err)
  }
})

router.get('/profile', auth, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ message: 'Unauthorized' })
    const user = await User.findById(userId).select('username createdAt _id')
    if (!user) return res.status(404).json({ message: 'Not found' })
    return res.json({ user })
  } catch (err) {
    next(err)
  }
})

export default router
