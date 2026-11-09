const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

// Vercel: don't let the platform eat the body before we proxy it
app.use(express.raw({ type: '*/*', limit: '10mb' }));

const UPSTREAM = process.env.API_UPSTREAM || 'https://thescholarverse.site';

// Central mapping table — edit these lines when your API changes.
const ROUTES = {
  '/api/mj/batches':     '/api/mj/batches',
  '/api/mj/details':     '/api/mj/details',
  '/api/mj/all-content': '/api/mj/all-content',
  // '/api/v2/search':   '/api/mj/all-content',   // rename later, one line
};

Object.entries(ROUTES).forEach(([publicPath, targetPath]) => {
  app.use(
    publicPath,
    createProxyMiddleware({
      target: UPSTREAM,
      changeOrigin: true,
      secure: true,
      // Mounted at publicPath, so req.url is the remainder — rebuild the full path
      pathRewrite: (path) => targetPath + path,
      onProxyReq: (proxyReq, req) => {
        // Re-emit the raw body (Express.raw already buffered it)
        if (req.body && req.body.length) {
          proxyReq.setHeader('Content-Length', req.body.length);
          proxyReq.write(req.body);
        }
      },
      onProxyRes: (proxyRes, req) => {
        // log for debugging
        console.log('[proxy]', req.method, req.url, '->', proxyRes.statusCode);
      },
    })
  );
});

// Health check
app.get('/api/_health', (_req, res) =>
  res.json({ ok: true, upstream: UPSTREAM })
);

module.exports = app;
