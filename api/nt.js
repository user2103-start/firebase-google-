
const BASE = {
  batches: "https://nt.studybeepro.site/batches.json",
  worker: "https://fk.khatikgaurav38.workers.dev/api/nt",
  media: "https://nt.studybeepro.site"
};

const HEADERS = {
  Origin: "https://studybeepro.site",
  Referer: "https://studybeepro.site/",
  Accept: "*/*"
};

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { action, id, folder, course_id, content_id } = req.query;

    let target;

    switch (action) {
      case "batches":
        target = BASE.batches;
        break;

      case "overview":
        target = `${BASE.worker}?overview=${encodeURIComponent(id || "176")}`;
        break;

      case "content":
        target = `${BASE.worker}?content=${encodeURIComponent(id || "176")}&folder=${encodeURIComponent(folder || "0")}`;
        break;

      case "video":
        if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
          return res.status(400).json({ error: "Invalid video ID" });
        }
        target = `${BASE.media}/vc/${id}`;
        break;

      case "pdf":
        if (!course_id || !content_id) {
          return res.status(400).json({
            error: "course_id and content_id required"
          });
        }

        target = `${BASE.media}/vc/media?${new URLSearchParams({
          course_id,
          content_id
        })}`;
        break;

      default:
        return res.status(400).json({
          error: "Invalid action",
          available: ["batches", "overview", "content", "video", "pdf"]
        });
    }

    const response = await fetch(target, {
      method: req.method,
      headers: HEADERS,
      redirect: "follow"
    });

    res.status(response.status);

    for (const h of [
      "content-type",
      "content-length",
      "content-disposition",
      "accept-ranges",
      "content-range"
    ]) {
      const value = response.headers.get(h);
      if (value) res.setHeader(h, value);
    }

    res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300");

    if (req.method === "HEAD") return res.end();

    return res.send(Buffer.from(await response.arrayBuffer()));

  } catch (error) {
    return res.status(502).json({
      error: "NT proxy failed",
      message: error.message
    });
  }
}
