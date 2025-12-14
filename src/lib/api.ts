import axios from 'axios'

// 生产环境使用环境变量配置的 API 地址，开发环境使用 Next.js 代理
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || '/api',
})

export default api
