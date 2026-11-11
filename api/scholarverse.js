const UPSTREAM = (
  process.env.UPSTREAM_URL || "https://thescholarverse.in"
).replace(/\/+$/, "");

const ROUTES = {
  batches: "/api/mj/batches",
  batch: "/api/mj/batches",
  overview: "/api/mj/details",
  content: "/api/mj/all-content",
  "single-content": "/api/mj/details"
};

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Only GET requests are allowed"
    });
  }

  const route = req.query.route;
  const endpoint = ROUTES[route];

  if (!endpoint) {
    return res.status(400).json({
      success: false,
      error: "Invalid route",
      available_routes: Object.keys(ROUTES)
    });
  }

  const p = req.query;
  const params = new URLSearchParams();

  let method = "GET";
  let body;

  if (route === "batch") {
    if (!p.id) {
      return res.status(400).json({
        success: false,
        error: "Missing id"
      });
    }
    params.set("id", p.id);
  }

  if (route === "overview") {
    if (!p.course_id) {
      return res.status(400).json({
        success: false,
        error: "Missing course_id"
      });
    }
    params.set("course_id", p.course_id);
    params.set("type", "overview");
  }

  if (route === "content") {
    if (!p.course_id) {
      return res.status(400).json({
        success: false,
        error: "Missing course_id"
      });
    }

    const limit = Number(p.limit || 100);

    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        error: "Limit must be between 1 and 100"
      });
    }

    method = "POST";

    body = {
      course_id: p.course_id,
      folder_id: p.folder_id || "0",
      tab_id: p.tab_id || "226",
      tab_type: p.tab_type || "content",
      page: p.page || "1",
      limit: String(limit),
      keyword: p.keyword || "",
      parent_course_id: p.parent_course_id || "0"
    };
  }

  if (route === "single-content") {
    if (!p.course_id || !p.content_id) {
      return res.status(400).json({
        success: false,
        error: "Missing course_id or content_id"
      });
    }

    params.set("type", "single_content");
    params.set("course_id", p.course_id);
    params.set("folder_id", p.folder_id || "0");
    params.set("content_id", p.content_id);
  }

  const url = UPSTREAM + endpoint +
    (params.size ? "?" + params.toString() : "");

  try {
    const response = await fetch(url, {
      method,
      headers: {
        Accept: "application/json",
        ...(method === "POST"
          ? { "Content-Type": "application/json" }
          : {})
      },
      ...(method === "POST"
        ? { body: JSON.stringify(body) }
        : {}),
      signal: AbortSignal.timeout(20000)
    });

    const data = await response.text();

    res.setHeader(
      "Content-Type",
      response.headers.get("content-type") ||
      "application/json; charset=utf-8"
    );

    res.setHeader("Cache-Control", "no-store");

    return res.status(response.status).send(data);

  } catch (error) {
    console.error("Scholarverse proxy:", error);

    return res.status(502).json({
      success: false,
      error: "Upstream request failed"
    });
  }
        }
