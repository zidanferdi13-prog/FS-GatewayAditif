module.exports = {
  apps: [{
    name: 'fs-dashboard-aditif-premix-frontend',
    cwd: __dirname,
    script: 'npm',
    args: 'run preview -- --host 0.0.0.0 --port 4173',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '250M',
    env: {
      NODE_ENV: 'production',
      PORT: 5173
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 4000,
    time: true
  }]
};
