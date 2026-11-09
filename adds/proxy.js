const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
app.use(express.raw({ type: '*/*', limit: '10mb' }));

const UPSTREAM = process.env.API_UPSTREAM || 'https://thescholarverse.site';

const ROUTES = {
  '/api/mj/batches':     '/api/mj/batches',
  '/api/mj/details':     '/api/mj/details',
  '/api/mj/all-content': '/api/mj/all-content',
};

Object.entries(ROUTES).forEach(([publicPath, targetPath]) => {
  app.use(
    publicPath,
    createProxyMiddleware({
      target: UPSTREAM,
      changeOrigin: true,
      secure: true,
      pathRewrite: (path) => targetPath + path,
      onProxyReq: (proxyReq, req) => {
        if (req.body && req.body.length) {
          proxyReq.setHeader('Content-Length', req.body.length);
          proxyReq.write(req.body);
        }
      },
      onProxyRes: (proxyRes, req) => {
        console.log('[proxy]', req.method, req.url, '->', proxyRes.statusCode);
      },
    })
  );
});

app.get('/api/_health', (_req, res) =>
  res.json({ ok: true, upstream: UPSTREAM })
);

// NO app.listen() on Vercel
module.exports = app;
