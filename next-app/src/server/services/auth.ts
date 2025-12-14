import connectDB from '@/server/db'
import User from '@/server/models/userModel'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET!

interface AuthResult {
  success: boolean
  token?: string
  user?: {
    id: string
    username: string
    createdAt: Date
  }
  error?: string
  status?: number
}

export const authService = {
  login: async (username?: string, password?: string): Promise<AuthResult> => {
    await connectDB()

    if (!username || !password) {
      return {
        success: false,
        error: 'Username and password are required',
        status: 400,
      }
    }

    const user = await User.findOne({ username }).select('+password')
    if (!user) {
      return { success: false, error: 'Invalid credentials', status: 401 }
    }

    const ok = await user.comparePassword(password)
    if (!ok) {
      return { success: false, error: 'Invalid credentials', status: 401 }
    }

    if (!JWT_SECRET) {
      return { success: false, error: 'Server misconfigured', status: 500 }
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      {
        expiresIn: '7d',
      }
    )

    return {
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        createdAt: user.createdAt,
      },
    }
  },

  register: async (
    username?: string,
    password?: string
  ): Promise<AuthResult> => {
    await connectDB()

    if (!username || !password) {
      return {
        success: false,
        error: 'Username and password are required',
        status: 400,
      }
    }

    try {
      const existed = await User.exists({ username })
      if (existed) {
        return { success: false, error: 'Username already exists', status: 409 }
      }

      const user = new User({ username, password })
      await user.save()

      if (!JWT_SECRET) {
        return { success: false, error: 'Server misconfigured', status: 500 }
      }

      const token = jwt.sign(
        { userId: user.id, username: user.username },
        JWT_SECRET,
        { expiresIn: '7d' }
      )

      return {
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          createdAt: user.createdAt,
        },
        status: 201,
      }
    } catch (err: unknown) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code?: number | string }).code === 11000
      ) {
        return { success: false, error: 'Username already exists', status: 409 }
      }
      return { success: false, error: 'Internal Server Error', status: 500 }
    }
  },
}
