module.exports = {
  apps: [
    {
      name: "sramap-frontend",
      script: "server.js",
      cwd: "/var/www/sramap/current",
      instances: 2,
      exec_mode: "cluster",
      listen_timeout: 10000,
      kill_timeout: 5000,
      max_memory_restart: "600M",
      env: {
        NODE_ENV: "production",
        PORT: "3002",
        HOSTNAME: "127.0.0.1",
        // hits the backend directly; going through seqout.org gets Cloudflare bot-challenged
        PYSRAWEB_API_BASE: "http://127.0.0.1:8000",
      },
    },
  ],
};
