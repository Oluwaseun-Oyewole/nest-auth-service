module.exports = {
  apps: [
    {
      name: 'nestapp',
      script: 'dist/main.js',
      instances: 'max', // one per CPU core
      exec_mode: 'cluster',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // Load .env file
      env_file: '/home/appuser/app/.env',
      // Restart policy
      max_restarts: 10,
      min_uptime: '5s',
      restart_delay: 3000,
      // Logging
      out_file: '/var/log/nestapp/out.log',
      error_file: '/var/log/nestapp/error.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // Memory threshold
      max_memory_restart: '512M',
    },
  ],
};
