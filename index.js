// index.js - Hostinger Node.js Web App Entry Point Wrapper
const path = require('path');
const fs = require('fs');

process.env.PORT = process.env.PORT || 3000;
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

const standaloneServer = path.join(__dirname, '.next', 'standalone', 'server.js');
const rootServer = path.join(__dirname, 'server.js');

if (fs.existsSync(standaloneServer)) {
  require(standaloneServer);
} else if (fs.existsSync(rootServer)) {
  require(rootServer);
} else {
  const next = require('next');
  const http = require('http');
  const app = next({ dev: false, dir: __dirname, hostname: '0.0.0.0', port: parseInt(process.env.PORT, 10) });
  const handle = app.getRequestHandler();

  app.prepare().then(() => {
    http.createServer((req, res) => {
      handle(req, res);
    }).listen(process.env.PORT, () => {
      console.log(`> App ready on port ${process.env.PORT}`);
    });
  }).catch((err) => {
    console.error('Error starting server:', err);
    process.exit(1);
  });
}
