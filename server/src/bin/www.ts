import 'dotenv/config'
import http from 'http'
import debugFactory from 'debug'
import app from '../app.js'
import connectDB from '../models/connection.js'

const debug = debugFactory('server:server')

const port = normalizePort(process.env.PORT || '3000')
app.set('port', port)

// 创建服务器
const server = http.createServer(app)

// 连接数据库，启动服务器
connectDB()
  .then(() => {
    server.listen(port)
    server.on('error', onError)
    server.on('listening', onListening)
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB, server not started.')
    console.error(err)
    process.exit(1)
  })

// 端口规范化
function normalizePort(val: string): number | string {
  const parsedPort = parseInt(val, 10)

  if (Number.isNaN(parsedPort)) {
    return val
  }

  if (parsedPort >= 0) {
    return parsedPort
  }

  return '3000'
}

function onError(error: NodeJS.ErrnoException): void {
  if (error.syscall !== 'listen') {
    throw error
  }

  const bind = typeof port === 'string' ? `Pipe ${port}` : `Port ${port}`

  switch (error.code) {
    case 'EACCES':
      console.error(`${bind} requires elevated privileges`)
      process.exit(1)
      break
    case 'EADDRINUSE':
      console.error(`${bind} is already in use`)
      process.exit(1)
      break
    default:
      throw error
  }
}

function onListening(): void {
  const addr = server.address()
  if (!addr) {
    debug('Server address unavailable')
    return
  }

  const bind = typeof addr === 'string' ? `pipe ${addr}` : `port ${addr.port}`
  debug(`Listening on ${bind}`)
}
