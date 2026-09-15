// index.js - Hostinger Node.js Web App Entry Point Wrapper
const path = require('path');
process.env.PORT = process.env.PORT || 3000;
require('./server.js');
