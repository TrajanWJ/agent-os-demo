#!/usr/bin/env node
// Local server: serves frontend + proxies /api to bridge (same origin, no CORS)
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || '8090', 10);
const BRIDGE = process.env.BRIDGE_URL || 'http://127.0.0.1:18790';

const app = express();

// Proxy /api/* to bridge
app.use('/api', createProxyMiddleware({
  target: BRIDGE,
  changeOrigin: true,
  ws: true,
}));

// Serve static frontend
app.use(express.static(__dirname));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Agent OS frontend: http://localhost:${PORT}`);
  console.log(`Bridge proxy: ${BRIDGE}`);
});
