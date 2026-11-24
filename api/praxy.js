// api/proxy.js : Vercel serverless proxy for missionjeet.site
//
// Usage (GET):
//   /api/proxy?action=batches
//   /api/proxy?action=overview&course_id=185
//   /api/proxy?action=content&course_id=185&tab_id=226&folder_id=0&limit=100
//   /api/proxy?action=media&content_id=18989&course_id=185      (video / pdf)

const BASE = 'https://missionjeet.site';
const TIMEOUT_MS = 15000;

const num = (v, d) => (/^\d+$/.test(String(v ?? '')) ? String(v) : d);

// Only these upstream URLs can ever be called (no open proxy)
const ROUTES = {
  batches: () => `${BASE}/batches.json`,
  overview: (q) => {
    const id = num(q.course_id);
    return id && `${BASE}/api.php?action=overview&course_id=${id}`;
  },
  content: (q) => {
    const c = num(q.course_id), t = num(q.tab_id);
    if (!c || !t) return null;
    const f = num(q.folder_id, '0');
    const l = Math.min(Number(num(q.limit, '100')), 500);
    return `${BASE}/api.php?action=content&course_id=${c}&tab_id=${t}&folder_id=${f}&limit=${l}`;
  },
  media: (q) => {
    const c = num(q.course_id), i = num(q.content_id);
    return c && i && `${BASE}/mj.php?content_id=${i}&course_id=${c}`;
  },
};
// aliases so old/hyphenated names also work
ROUTES.video = ROUTES.pdf = ROUTES.mj = ROUTES.media;
ROUTES['get-content'] = ROUTES.content;
ROUTES['get-overview'] = ROUTES.overview;

const CACHE = { batches: 300, overview: 120, content: 60, media: 0 };

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const q = req.query || {};
  const action = String(q.action || '').toLowerCase();
  const build = ROUTES[action];
  if (!build) {
    return res.status(400).json({
      error: 'Unknown action',
      actions: ['batches', 'overview', 'content', 'media'],
    });
  }
  const url = build(q);
  if (!url) {
    return res.status(400).json({ error: 'Missing or invalid parameters for ' + action });
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const up = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36',
        Accept: 'application/json, text/plain, */*',
        Referer: BASE + '/',
      },
    });
    const body = await up.text();
    const ct = up.headers.get('content-type') || 'application/json; charset=utf-8';
    const ttl = CACHE[ROUTES[action] === ROUTES.media ? 'media' : action] || 0;
    res.setHeader('Content-Type', ct);
    res.setHeader(
      'Cache-Control',
      ttl ? `public, s-maxage=${ttl}, stale-while-revalidate=${ttl * 2}` : 'no-store'
    );
    return res.status(up.status).send(body);
  } catch (e) {
    const timeout = e && e.name === 'AbortError';
    return res.status(timeout ? 504 : 502).json({
      error: timeout ? 'Upstream timeout' : 'Upstream fetch failed',
      detail: String((e && e.message) || e),
    });
  } finally {
    clearTimeout(timer);
  }
};
