const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const express = require('express');

const app = express();

// Comprehensive CORS headers for Private Network Access
app.use((req, res, next) => {
  // Set CORS headers
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Critical for Private Network Access
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
    return res.status(204).end();
  }
  next();
});

// Serve static files from aa_animation/cdn
app.use(express.static(path.join(__dirname, 'aa_animation/cdn')));

// Load SSL certificates
const options = {
  key: fs.readFileSync(path.join(__dirname, 'local.artaurea.dev-key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'local.artaurea.dev.pem'))
};

// Create HTTPS server
const httpsServer = https.createServer(options, app);

// Create HTTP server (for ngrok)
const httpServer = http.createServer(app);

const HTTPS_PORT = 5500;
const HTTP_PORT = 5501;

httpsServer.listen(HTTPS_PORT, () => {
  console.log(`🚀 HTTPS Server running at https://127.0.0.1:${HTTPS_PORT}/`);
  console.log(`🔗 HTTPS: https://local.artaurea.dev:${HTTPS_PORT}/js/animations.js`);
});

httpServer.listen(HTTP_PORT, () => {
  console.log(`🌐 HTTP Server running at http://127.0.0.1:${HTTP_PORT}/`);
  console.log(`🔗 HTTP: http://127.0.0.1:${HTTP_PORT}/js/animations.js`);
  console.log(`📁 Serving files from: aa_animation/cdn/`);
  console.log(`\n✅ CORS and Private Network Access enabled for Webflow\n`);
});

