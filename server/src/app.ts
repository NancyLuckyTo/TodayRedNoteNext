import { fileURLToPath } from 'url'
import { dirname } from 'path'
import createError from 'http-errors'
import express, { NextFunction, Request, Response } from 'express'
import path from 'path'
import cookieParser from 'cookie-parser'
import logger from 'morgan'
import authRouter from './routes/auth.js'
import uploadRouter from './routes/upload.js'
import postsRouter from './routes/posts.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()

app.set('views', path.resolve(__dirname, '../views'))
app.set('view engine', 'jade')

app.use(logger('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(express.static(path.resolve(__dirname, '../public')))

app.use('/api/auth', authRouter)
app.use('/api/upload', uploadRouter)
app.use('/api/posts', postsRouter)

app.get('/', (_req, res) => {
  res.json({ ok: true })
})

app.use((req: Request, res: Response, next: NextFunction) => {
  next(createError(404))
})

app.use(
  (
    err: createError.HttpError,
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    res.locals.message = err.message
    res.locals.error = req.app.get('env') === 'development' ? err : {}

    res.status(err.status || 500)
    res.render('error')
  }
)

export default app
