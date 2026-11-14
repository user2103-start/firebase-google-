const UPSTREAMS = {
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
  try {
    const path = (req.query.path || []).join("/");
    const params = new URLSearchParams(req.query);

    let target;

    if (path === "batches") {
      target = UPSTREAMS.batches;
    } else if (path === "overview") {
      target = `${UPSTREAMS.worker}?overview=${params.get("id") || "176"}`;
    } else if (path === "content") {
      const id = params.get("id") || "176";
      const folder = params.get("folder") || "0";
      target = `${UPSTREAMS.worker}?content=${id}&folder=${folder}`;
    } else if (path.startsWith("video/")) {
      const videoId = path.slice(6);

      if (!/^[a-zA-Z0-9_-]+$/.test(videoId)) {
        return res.status(400).json({ error: "Invalid video ID" });
      }

      target = `${UPSTREAMS.media}/vc/${videoId}`;
    } else if (path === "pdf") {
      const courseId = params.get("course_id");
      const contentId = params.get("content_id");

      if (!courseId || !contentId) {
        return res.status(400).json({
          error: "course_id and content_id required"
        });
      }

      target = `${UPSTREAMS.media}/vc/media?${new URLSearchParams({
        course_id: courseId,
        content_id: contentId
      })}`;
    } else {
      return res.status(404).json({ error: "Route not found" });
    }

    const upstream = await fetch(target, {
      method: "GET",
      headers: HEADERS,
      redirect: "follow"
    });

    const contentType = upstream.headers.get("content-type");
    const data = Buffer.from(await upstream.arrayBuffer());

    res.status(upstream.status);

    if (contentType) {
      res.setHeader("Content-Type", contentType);
    }

    res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300");

    return res.send(data);

  } catch (error) {
    return res.status(502).json({
      error: "Upstream request failed",
      message: error.message
    });
  }
}
