const env = require('./config/env');
const app = require('./app');

const PORT = env.PORT;

const server = app.listen(PORT, () => {
  console.log(`[EVE Healthcare API] Server running in ${env.NODE_ENV} mode on port ${PORT}`);
  console.log(`[EVE Healthcare API] Health check: http://localhost:${PORT}/api/health`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});
