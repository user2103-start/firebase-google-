const BASE = {
  batches: "https://nt.studybeepro.site/batches.json",
  worker: "https://fk.khatikgaurav38.workers.dev/api/nt",
  media: "https://nt.studybeepro.site"
};

const HEADERS = {
  "Origin": "https://studybeepro.site",
  "Referer": "https://studybeepro.site/",
  "Accept": "*/*"
};

export default async function handler(req, res) {
  try {
    if (req.method !== "GET" && req.method !== "HEAD") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const path = req.query.path;
    const route = Array.isArray(path) ? path.join("/") : path || "";

    const params = new URLSearchParams(req.query);
    params.delete("path");

    let target;

    switch (route) {
      case "batches":
        target = BASE.batches;
        break;

      case "overview":
        target = `${BASE.worker}?overview=${encodeURIComponent(params.get("id") || "176")}`;
        break;

      case "content":
        target = `${BASE.worker}?content=${encodeURIComponent(params.get("id") || "176")}&folder=${encodeURIComponent(params.get("folder") || "0")}`;
        break;

      case "video": {
        const id = params.get("id");

        if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
          return res.status(400).json({ error: "Invalid video ID" });
        }

        target = `${BASE.media}/vc/${id}`;
        break;
      }

      case "pdf": {
        const courseId = params.get("course_id");
        const contentId = params.get("content_id");

        if (!courseId || !contentId) {
          return res.status(400).json({
            error: "course_id and content_id required"
          });
        }

        target = `${BASE.media}/vc/media?${new URLSearchParams({
          course_id: courseId,
          content_id: contentId
        })}`;
        break;
      }

      default:
        return res.status(404).json({ error: "Invalid NT route" });
    }

    const response = await fetch(target, {
      method: req.method,
      headers: HEADERS,
      redirect: "follow"
    });

    res.status(response.status);

    for (const header of [
      "content-type",
      "content-length",
      "content-disposition",
      "accept-ranges",
      "content-range"
    ]) {
      const value = response.headers.get(header);
      if (value) res.setHeader(header, value);
    }

    res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300");

    if (req.method === "HEAD") return res.end();

    const data = Buffer.from(await response.arrayBuffer());
    return res.send(data);

  } catch (error) {
    return res.status(502).json({
      error: "NT upstream error",
      message: error.message
    });
  }
}
