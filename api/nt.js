export const config = { maxDuration: 30 };

const H = 'https://nt.studybeepro.site';
const W = 'https://fk.khatikgaurav38.workers.dev/api/nt';
const L = 'https://selectionway.studybeepro.site/livex.php';

const ROUTES = {
  batches: () => `${H}/batches.json`,
  overview: () => W,
  content: () => W,
  video: (id) => `${H}/vc/${encodeURIComponent(id || '')}`,
  pdf: () => `${H}/vc/media`,
  live: () => L,
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const sp = new URL(req.url, 'http://x').searchParams;
  const type = sp.get('type');
  const id = sp.get('vid');
  if (!ROUTES[type]) return res.status(400).json({ error: 'invalid type', types: Object.keys(ROUTES) });

  sp.delete('type');
  sp.delete('vid');
  const qs = sp.toString();
  const url = ROUTES[type](id) + (qs ? '?' + qs : '');

  try {
    const headers = {
      Referer: 'https://studybeepro.site/',
      Origin: 'https://studybeepro.site',
      'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0',
      Accept: '*/*',
      'Accept-Encoding': 'identity',
    };
    if (req.headers.range) headers.Range = req.headers.range;

    const r = await fetch(url, {
      method: req.method === 'POST' ? 'POST' : 'GET',
      headers,
      redirect: 'follow',
      signal: AbortSignal.timeout(25000),
    });

    res.status(r.status);
    for (const h of ['content-type', 'content-range', 'accept-ranges', 'content-disposition']) {
      const v = r.headers.get(h);
      if (v) res.setHeader(h, v);
    }
    res.setHeader('Cache-Control', 'no-store');

    if (!r.body) return res.end();
    const { Readable } = await import('node:stream');
    Readable.fromWeb(r.body).pipe(res);
  } catch (e) {
    const timeout = e.name === 'TimeoutError' || e.name === 'AbortError';
    res.status(timeout ? 504 : 502).json({
      error: timeout ? 'upstream timeout' : 'upstream failed',
      detail: String(e),
      url,
    });
  }
}
