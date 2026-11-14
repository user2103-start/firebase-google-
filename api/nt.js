
const UPSTREAMS = {
  batches: "https://nt.studybeepro.site/batches.json",
  api: "https://fk.khatikgaurav38.workers.dev/api/nt",
  video: "https://nt.studybeepro.site/vc/",
  pdf: "https://nt.studybeepro.site/vc/media",
  live: "https://selectionway.studybeepro.site/livex.php"
};

const HEADERS = {
  Origin: "https://studybeepro.site",
  Referer: "https://studybeepro.site/",
  "User-Agent": "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/131.0.0.0 Mobile Safari/537.36",
  Accept: "*/*"
};

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const q = req.query;
    let url;

    if ("batches" in q) {
      url = UPSTREAMS.batches;
    }

    else if ("overview" in q || "content" in q) {
      const params = new URLSearchParams();

      if ("overview" in q) {
        params.set("overview", q.overview);
      }

      if ("content" in q) {
        params.set("content", q.content);
        params.set("folder", q.folder || "0");
      }

      url = `${UPSTREAMS.api}?${params}`;
    }

    else if ("video" in q) {
      const id = String(q.video);

      if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
        return res.status(400).json({ error: "Invalid video ID" });
      }

      url = UPSTREAMS.video + id;
    }

    else if ("pdf" in q) {
      const params = new URLSearchParams({
        course_id: q.course_id || "176",
        content_id: q.pdf
      });

      url = `${UPSTREAMS.pdf}?${params}`;
    }

    else if ("live" in q) {
      url = `${UPSTREAMS.live}?id=${encodeURIComponent(q.live)}`;
    }

    else {
      return res.status(400).json({
        error: "Missing endpoint",
        available: ["batches", "overview", "content", "video", "pdf", "live"]
      });
    }

    const response = await fetch(url, {
      method: "GET",
      headers: HEADERS,
      redirect: "follow"
    });

    res.status(response.status);

    for (const header of [
      "content-type",
      "content-length",
      "content-range",
      "accept-ranges",
      "cache-control"
    ]) {
      const value = response.headers.get(header);
      if (value) res.setHeader(header, value);
    }

    if (!response.body) return res.end();

    const { Readable } = await import("node:stream");
    Readable.fromWeb(response.body).pipe(res);

  } catch (error) {
    return res.status(500).json({
      error: "Proxy failed",
      message: error.message
    });
  }
}
