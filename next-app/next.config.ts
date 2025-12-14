import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'today-red-note.oss-cn-hongkong.aliyuncs.com',
      },
      {
        protocol: 'https',
        hostname: 'img.todayrednote.top',
      },
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
      },
    ],
    // 允许 SVG 图片（UI Avatars 返回 SVG 格式）
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  serverExternalPackages: ['mongoose'], // 解决 Mongoose 在开发环境的热重载连接问题
}

export default nextConfig
