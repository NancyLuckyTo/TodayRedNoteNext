import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'today-red-note.oss-cn-hongkong.aliyuncs.com',
      },
    ],
  },
  serverExternalPackages: ['mongoose'], // 解决 Mongoose 在开发环境的热重载连接问题
}

export default nextConfig
