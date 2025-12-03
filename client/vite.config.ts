import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // 代码分割策略
    rollupOptions: {
      output: {
        manualChunks: id => {
          // 富文本编辑器（较大，会被懒加载的页面引用）单独打包
          if (
            id.includes('node_modules/@tiptap') ||
            id.includes('node_modules/prosemirror')
          ) {
            return 'editor'
          }

          // 其他所有第三方依赖统一打包到 vendor
          // 避免因拆包过细（如将 react, lucide, radix 分开）导致的循环依赖或初始化顺序问题
          if (id.includes('node_modules')) {
            return 'vendor'
          }
        },
      },
    },
    // 设置警告阈值
    chunkSizeWarningLimit: 200,
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
