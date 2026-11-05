
const BASE_URL = "https://thescholarverse.site";

const ROUTES = {
  subject: {
    method: "GET",
    path: "/api/SubjectInfo",
    required: ["BatchId", "SubjectId"]
  },

  topic: {
    method: "GET",
    path: "/api/TopicInfo",
    required: ["BatchId", "SubjectId", "TopicId", "ContentType"]
  },

  pdf: {
    method: "GET",
    path: "/api/GetPdf",
    required: ["BatchId", "SubjectId", "PdfId", "AttachmentId"]
  },

  schedule: {
    method: "POST",
    path: "/api/todays-schedule"
  }
};

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  const routeName = req.query.path;
  const config = ROUTES[routeName];

  if (!config) {
    return res.status(404).json({
      success: false,
      error: "Unknown API endpoint"
    });
  }

  if (req.method !== config.method) {
    return res.status(405).json({
      success: false,
      error: "Method not allowed"
    });
  }

  try {
    let upstreamURL = BASE_URL + config.path;

    if (config.method === "GET") {
      const params = new URLSearchParams();

      for (const key of config.required) {
        const value = req.query[key];

        if (!value) {
          return res.status(400).json({
            success: false,
            error: `Missing parameter: ${key}`
          });
        }

        params.set(key, value);
      }

      if (routeName === "subject") {
        params.set("page", req.query.page || "1");
      }

      if (routeName === "topic") {
        params.set("page", req.query.page || "1");
      }

      upstreamURL += "?" + params.toString();
    }

    const options = {
      method: config.method,
      headers: {
        Accept: "application/json"
      },
      redirect: "manual",
      signal: AbortSignal.timeout(20000)
    };

    if (config.method === "POST") {
      const batchId = req.body?.batchId;

      if (!batchId) {
        return res.status(400).json({
          success: false,
          error: "batchId is required"
        });
      }

      options.headers["Content-Type"] = "application/json";
      options.body = JSON.stringify({ batchId });
    }

    const upstream = await fetch(upstreamURL, options);
    const responseText = await upstream.text();

    res.setHeader(
      "Content-Type",
      upstream.headers.get("content-type") ||
      "application/json"
    );

    return res.status(upstream.status).send(responseText);

  } catch (error) {
    console.error("Proxy error:", error.message);

    return res.status(502).json({
      success: false,
      error: "Upstream connection failed",
      message: error.name === "TimeoutError"
        ? "Upstream timeout"
        : "Unable to connect to upstream"
    });
  }
};
