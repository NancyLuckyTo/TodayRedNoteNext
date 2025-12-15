module.exports = {
  apps: [
    {
      name: 'today-red-note',
      script: 'npm',
      args: 'start',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      log_date_format: 'YYYY-MM-DD HH:mm:ss', // 日志时间格式
      merge_logs: true, // 合并日志
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
}
