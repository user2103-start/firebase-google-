const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

const UPSTREAM = 'https://thescholarverse.site';

// Route table: change these lines when your API changes.
// key   = path your websites call
// value = { target: real upstream path, method: optional forced method }
const ROUTES = {
  '/api/mj/batches':      { target: '/api/mj/batches' },
  '/api/mj/details':      { target: '/api/mj/details' },
  '/api/mj/all-content':  { target: '/api/mj/all-content' },
  // Example: force GET on upstream even if caller POSTs
  // '/api/v2/search':    { target: '/api/mj/all-content', method: 'GET' },
};

Object.entries(ROUTES).forEach(([publicPath, cfg]) => {
  app.use(
    publicPath,
    createProxyMiddleware({
      target: UPSTREAM,
      changeOrigin: true,
      secure: true,
      pathRewrite: (path, req) => {
        // strip the public prefix and append the upstream target
        const rest = path.slice(publicPath.length);
        return cfg.target + rest;
      },
      onProxyReq: (proxyReq, req) => {
        if (cfg.method) proxyReq.method = cfg.method;   // your explicit override
      },
      onProxyRes: (proxyRes) => {
        // optional: log upstream status for debugging
        // console.log('upstream', proxyRes.statusCode, proxyRes.req.path);
      },
    })
  );
});

app.listen(3001, () => console.log('proxy on :3001'));
