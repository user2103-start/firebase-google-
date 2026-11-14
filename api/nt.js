
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
  "User-Agent":
    "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/131.0.0.0 Mobile Safari/537.36",
  Accept: "*/*"
};

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed"
    });
  }

  try {
    const q = req.query;
    let url;

    // Batches API
    if ("batches" in q) {
      url = UPSTREAMS.batches;
    }

    // Overview API
    else if ("overview" in q) {
      const params = new URLSearchParams();
      params.set("overview", q.overview);
      url = `${UPSTREAMS.api}?${params}`;
    }

    // Content List API
    else if ("content" in q) {
      const params = new URLSearchParams();
      params.set("content", q.content);
      params.set("folder", q.folder || "0");
      url = `${UPSTREAMS.api}?${params}`;
    }

    // Video API
    else if ("video" in q) {
      const id = String(q.video);

      if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
        return res.status(400).json({
          success: false,
          error: "Invalid video ID"
        });
      }

      url = UPSTREAMS.video + id;
    }

    // PDF API
    else if ("pdf" in q) {
      const params = new URLSearchParams({
        course_id: q.course_id || "176",
        content_id: q.pdf
      });

      url = `${UPSTREAMS.pdf}?${params}`;
    }

    // Live API (.php)
    else if ("live" in q) {
      const params = new URLSearchParams({
        id: q.live
      });

      url = `${UPSTREAMS.live}?${params}`;
    }

    else {
      return res.status(400).json({
        success: false,
        error: "Unknown API endpoint",
        available: [
          "batches",
          "overview",
          "content",
          "video",
          "pdf",
          "live"
        ]
      });
    }

    const response = await fetch(url, {
      method: "GET",
      headers: HEADERS,
      redirect: "follow",
      cache: "no-store"
    });

    // Forward upstream status
    res.status(response.status);

    // Forward important response headers
    const forwardHeaders = [
      "content-type",
      "content-length",
      "content-range",
      "accept-ranges",
      "cache-control",
      "last-modified",
      "etag"
    ];

    for (const header of forwardHeaders) {
      const value = response.headers.get(header);
      if (value) {
        res.setHeader(header, value);
      }
    }

    res.setHeader("Access-Control-Allow-Origin", "*");

    // Raw response forwarding
    if (!response.body) {
      return res.end();
    }

    const { Readable } = await import("node:stream");

    return Readable.fromWeb(response.body).pipe(res);

  } catch (error) {
    console.error("NT Proxy Error:", error);

    if (!res.headersSent) {
      return res.status(502).json({
        success: false,
        error: "Upstream request failed",
        message: error.message
      });
    }

    return res.end();
  }
}
