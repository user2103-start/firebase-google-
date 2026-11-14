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

    // Batches
    if ("batches" in q) {
      url = UPSTREAMS.batches;
    }

    // Overview
    else if ("overview" in q) {
      const params = new URLSearchParams({
        overview: String(q.overview)
      });

      url = `${UPSTREAMS.api}?${params}`;
    }

    // Content list
    else if ("content" in q) {
      const params = new URLSearchParams({
        content: String(q.content),
        folder: String(q.folder || "0")
      });

      url = `${UPSTREAMS.api}?${params}`;
    }

    // Video
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

    // PDF
    else if ("pdf" in q) {
      const params = new URLSearchParams({
        course_id: String(q.course_id || "176"),
        content_id: String(q.pdf)
      });

      url = `${UPSTREAMS.pdf}?${params}`;
    }

    // Live PHP
    else if ("live" in q) {
      const params = new URLSearchParams({
        id: String(q.live)
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

    // Forward Range for video/PDF seeking
    const headers = { ...HEADERS };

    if (req.headers.range && ("video" in q || "pdf" in q)) {
      headers.Range = req.headers.range;
    }

    const response = await fetch(url, {
      method: "GET",
      headers,
      redirect: "follow",
      cache: "no-store"
    });

    res.status(response.status);

    // IMPORTANT:
    // Do not forward content-length or content-encoding.
    // Fetch may automatically decompress upstream responses.

    const contentType = response.headers.get("content-type");

    if (contentType) {
      res.setHeader("Content-Type", contentType);
    }

    const contentRange = response.headers.get("content-range");

    if (contentRange) {
      res.setHeader("Content-Range", contentRange);
    }

    const cacheControl = response.headers.get("cache-control");

    res.setHeader(
      "Cache-Control",
      cacheControl || "no-store"
    );

    if ("video" in q || "pdf" in q) {
      const acceptRanges = response.headers.get("accept-ranges");

      if (acceptRanges) {
        res.setHeader("Accept-Ranges", acceptRanges);
      }
    }

    res.setHeader("Access-Control-Allow-Origin", "*");

    if (!response.body) {
      return res.end();
    }

    // Stream the complete response
    const { Readable } = await import("node:stream");

    Readable.fromWeb(response.body).pipe(res);

  } catch (error) {
    console.error("NT Proxy Error:", error);

    if (!res.headersSent) {
      return res.status(502).json({
        success: false,
        error: "Upstream request failed",
        message: error.message
      });
    }

    res.end();
  }
}
