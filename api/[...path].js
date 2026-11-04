export const config = { runtime: "edge" };

const BASE = "https://thescholarverse.site";
const CDN_HOSTS = [
  "https://d1d34p8vz63oiq.cloudfront.net/",
  "https://d1s3qm7un6hgrg.cloudfront.net/",
];
const FILE_HOSTS = ["https://static.pw.live/"];

const allowedCdn = u => CDN_HOSTS.some(h => u.startsWith(h));

const API_ROUTES = {
  "video-url": ["/api/get-video-url", ["batchId", "subjectId", "childId", "videoType"]],
  "video-keys": ["/api/get-video-with-keys", ["batchId", "subjectId", "childId", "videoType"]],
  "batch-info": ["/api/BatchInfo", ["BatchId", "Type"]],
  "subject-info": ["/api/SubjectInfo", ["BatchId", "SubjectId", "page"]],
  "topic-info": ["/api/TopicInfo", ["BatchId", "SubjectId", "TopicId", "ContentType", "page"]],
  "pdf": ["/api/GetPdf", ["BatchId", "SubjectId", "PdfId", "AttachmentId"]],
};

// Optional. Set in Vercel → Settings → Environment Variables.
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "";

// Platform-issued credential, if they give one. Optional.
const UPSTREAM_HEADER_NAME = process.env.UPSTREAM_HEADER_NAME || "";
const UPSTREAM_HEADER_VALUE = process.env.UPSTREAM_HEADER_VALUE || "";

function corsHeaders() {
  const h = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Range, Content-Type",
    "Access-Control-Expose-Headers": "Content-Range, Content-Length, Accept-Ranges",
    Vary: "Origin",
  };
  if (ALLOWED_ORIGIN) h["Access-Control-Allow-Origin"] = ALLOWED_ORIGIN;
  return h;
}

function upstreamHeaders(extra = {}) {
  const h = { "User-Agent": "scholarverse-proxy", Accept: "*/*", ...extra };
  if (UPSTREAM_HEADER_NAME && UPSTREAM_HEADER_VALUE) {
    h[UPSTREAM_HEADER_NAME] = UPSTREAM_HEADER_VALUE;
  }
  return h;
}

function json(data, status, cors) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function passthrough(res, cors) {
  const h = {
    ...cors,
    "Content-Type": res.headers.get("Content-Type") || "application/octet-stream",
    "Cache-Control": "no-store",
    "Accept-Ranges": "bytes",
  };
  const cr = res.headers.get("Content-Range");
  if (cr) h["Content-Range"] = cr;
  return new Response(res.body, { status: res.status, headers: h });
}

export default async function handler(request) {
  const cors = corsHeaders();

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  const url = new URL(request.url);
  const sub = url.pathname.replace(/^\/api\//, "");
  const p = url.searchParams;

  try {
    // Today's schedule: POST { batchId }
    if (sub === "todays-schedule") {
      if (request.method !== "POST") return json({ error: "method not allowed" }, 405, cors);

      const body = await request.json().catch(() => null);
      if (!body?.batchId) return json({ error: "batchId missing" }, 400, cors);

      const res = await fetch(`${BASE}/api/todays-schedule`, {
        method: "POST",
        headers: upstreamHeaders({ "Content-Type": "application/json", Accept: "application/json" }),
        body: JSON.stringify({ batchId: body.batchId }),
      });
      return new Response(await res.text(), {
        status: res.status,
        headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
      });
    }

    if (request.method !== "GET") return json({ error: "method not allowed" }, 405, cors);

    // JSON API routes (GET)
    if (API_ROUTES[sub]) {
      const [upPath, names] = API_ROUTES[sub];
      const params = {};
      for (const n of names) {
        const v = p.get(n);
        if (v !== null) params[n] = v;
      }
      const res = await fetch(`${BASE}${upPath}?${new URLSearchParams(params)}`, {
        headers: upstreamHeaders({ Accept: "application/json" }),
      });
      return new Response(await res.text(), {
        status: res.status,
        headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
      });
    }

    // PDF file: allowed hosts only
    if (sub === "file") {
      const target = p.get("url");
      if (!target || !FILE_HOSTS.some(h => target.startsWith(h))) {
        return json({ error: "host not allowed" }, 403, cors);
      }
      const res = await fetch(target, { headers: upstreamHeaders() });
      return passthrough(res, cors);
    }

    // Manifest (DASH or HLS) with URIs rewritten through the proxy, or single-file passthrough
    if (sub === "play") {
      const target = p.get("url");
      if (!target || !allowedCdn(target)) return json({ error: "host not allowed" }, 403, cors);

      const res = await fetch(target, { headers: upstreamHeaders() });
      if (!res.ok) return json({ error: `upstream ${res.status}` }, res.status, cors);

      const t = new URL(target);
      const isMpd = t.pathname.endsWith(".mpd");
      const isHls = t.pathname.endsWith(".m3u8");
      if (!isMpd && !isHls) return passthrough(res, cors);

      const cdnDir = target.slice(0, target.lastIndexOf("/") + 1);
      const token = encodeURIComponent(cdnDir + t.search);
      const base = `${url.origin}/api/c/${token}/`;

      if (isMpd) {
        // Insert our BaseURL right after <MPD ...> and drop any BaseURL that directly follows it
        const mpd = (await res.text()).replace(
          /(<MPD[^>]*>)\s*(<BaseURL>[^<]*<\/BaseURL>)?/,
          `$1\n  <BaseURL>${base}</BaseURL>`
        );
        return new Response(mpd, {
          headers: { ...cors, "Content-Type": "application/dash+xml", "Cache-Control": "no-store" },
        });
      }

      // HLS playlist: route every URI through the proxy
      const toProxy = uri =>
        uri.startsWith("http")
          ? `${url.origin}/api/play?url=${encodeURIComponent(uri)}`
          : base + uri;

      const playlist = (await res.text())
        .split("\n")
        .map(line => {
          const l = line.trim();
          if (l === "") return line;
          if (l.startsWith("#")) {
            return l.replace(/URI="([^"]+)"/g, (_, u) => `URI="${toProxy(u)}"`);
          }
          return toProxy(l);
        })
        .join("\n");

      return new Response(playlist, {
        headers: { ...cors, "Content-Type": "application/vnd.apple.mpegurl", "Cache-Control": "no-store" },
      });
    }

    // Segments: /api/c/<token>/<relative path>
    if (sub.startsWith("c/")) {
      const m = sub.match(/^c\/([^/]+)\/(.+)$/);
      if (!m) return json({ error: "bad path" }, 400, cors);

      const payload = decodeURIComponent(m[1]);
      const qi = payload.indexOf("?");
      const cdnDir = qi === -1 ? payload : payload.slice(0, qi);
      const sig = qi === -1 ? "" : payload.slice(qi);
      if (!allowedCdn(cdnDir)) return json({ error: "host not allowed" }, 403, cors);

      const headers = upstreamHeaders();
      const range = request.headers.get("Range");
      if (range) headers.Range = range;

      const res = await fetch(cdnDir + m[2] + sig, { headers });
      return passthrough(res, cors);
    }

    return json({ error: "not found" }, 404, cors);
  } catch (e) {
    return json({ error: e.message }, 502, cors);
  }
}
