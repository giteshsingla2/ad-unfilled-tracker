module.exports = {
  apps: [
    {
      name: 'collector-api',
      cwd: './apps/collector-api',
      script: 'server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 4323,
        // Postgres
        PG_HOST: '127.0.0.1',
        PG_PORT: 5432,
        PG_USER: 'tracker_user',
        PG_PASSWORD: 'CHANGE_ME',
        PG_DATABASE: 'ad_tracker',
        // Redis
        REDIS_HOST: '127.0.0.1',
        REDIS_PORT: 6379,
        REDIS_PASSWORD: '',
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
    },
    {
      name: 'ad-dashboard',
      cwd: './apps/dashboard',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3005',
      env: {
        NODE_ENV: 'production',
        PORT: 3005,
        // Postgres
        PG_HOST: '127.0.0.1',
        PG_PORT: 5432,
        PG_USER: 'tracker_user',
        PG_PASSWORD: 'CHANGE_ME',
        PG_DATABASE: 'ad_tracker',
        // Dashboard auth
        DASHBOARD_PASSWORD: 'CHANGE_ME',
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
    },
  ],
};
