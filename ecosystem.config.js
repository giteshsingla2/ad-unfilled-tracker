module.exports = {
  apps: [
    {
      name: 'collector-api',
      cwd: './apps/collector-api',
      script: 'server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 4323,
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
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
    },
  ],
};
