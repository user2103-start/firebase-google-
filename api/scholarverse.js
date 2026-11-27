const BASE = "https://missionjeet.site";

module.exports = async (req, res) => {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const q = req.query || {};

  const action = String(q.action || "");
  const course_id = String(q.course_id || "");
  const tab_id = String(q.tab_id || "");
  const folder_id = String(q.folder_id ?? "0");
  const limit = String(q.limit ?? "100");
  const content_id = String(q.content_id || "");
  const test_id = String(q.test_id || "");
  const attempt_mode = String(q.attempt_mode || "practice").trim();

  try {
    let url;
    let method = "GET";
    let body;

    switch (action) {

      // Batches
      case "batches":
        url = `${BASE}/batches.json`;
        break;

      // Course Overview
      case "overview": {
        if (!course_id) {
          return res.status(400).json({
            success: false,
            message: "course_id required"
          });
        }

        const params = new URLSearchParams({
          action: "overview",
          course_id
        });

        url = `${BASE}/api.php?${params}`;
        break;
      }

      // Course Content
      case "content": {
        if (!course_id || !tab_id) {
          return res.status(400).json({
            success: false,
            message: "course_id and tab_id required"
          });
        }

        const params = new URLSearchParams({
          action: "content",
          course_id,
          tab_id,
          folder_id,
          limit
        });

        url = `${BASE}/api.php?${params}`;
        break;
      }

      // Video / PDF
      case "media": {
        if (!course_id || !content_id) {
          return res.status(400).json({
            success: false,
            message: "course_id and content_id required"
          });
        }

        const params = new URLSearchParams({
          content_id,
          course_id
        });

        url = `${BASE}/mj.php?${params}`;
        break;
      }

      // Test Instructions
      case "test_instructions": {
        if (!test_id) {
          return res.status(400).json({
            success: false,
            message: "test_id required"
          });
        }

        if (!["live", "practice"].includes(attempt_mode)) {
          return res.status(400).json({
            success: false,
            message: "attempt_mode must be live or practice"
          });
        }

        const params = new URLSearchParams({
          action: "test_instructions",
          test_id,
          attempt_mode
        });

        url = `${BASE}/api.php?${params}`;
        break;
      }

      // Test Questions / Data
      case "test_data": {
        if (!test_id) {
          return res.status(400).json({
            success: false,
            message: "test_id required"
          });
        }

        if (!["live", "practice"].includes(attempt_mode)) {
          return res.status(400).json({
            success: false,
            message: "attempt_mode must be live or practice"
          });
        }

        const params = new URLSearchParams({
          action: "test_data",
          test_id,
          attempt_mode
        });

        url = `${BASE}/api.php?${params}`;
        break;
      }

      // Submit Test
      case "test_submit": {
        if (req.method !== "POST") {
          return res.status(405).json({
            success: false,
            message: "Send POST request for test_submit"
          });
        }

        url = `${BASE}/api.php?action=test_submit`;
        method = "POST";

        body = typeof req.body === "string"
          ? req.body
          : JSON.stringify(req.body || {});

        break;
      }

      // Test Result
      case "test_result": {
        if (!test_id) {
          return res.status(400).json({
            success: false,
            message: "test_id required"
          });
        }

        const params = new URLSearchParams({
          action: "test_result",
          test_id
        });

        url = `${BASE}/api.php?${params}`;
        break;
      }

      default:
        return res.status(400).json({
          success: false,
          message: "Invalid action",
          available: [
            "batches",
            "overview",
            "content",
            "media",
            "test_instructions",
            "test_data",
            "test_submit",
            "test_result"
          ]
        });
    }

    // Upstream request
    const headers = {
      "Accept": "*/*",
      "User-Agent": "Mozilla/5.0"
    };

    if (method === "POST") {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(url, {
      method,
      headers,
      body,
      redirect: "follow"
    });

    // Forward status and content type
    res.status(response.status);

    const contentType = response.headers.get("content-type");

    if (contentType) {
      res.setHeader("Content-Type", contentType);
    }

    res.setHeader("Cache-Control", "no-store");

    // Forward response body
    const data = Buffer.from(await response.arrayBuffer());

    return res.send(data);

  } catch (error) {
    console.error("Proxy Error:", error);

    return res.status(500).json({
      success: false,
      message: "Proxy request failed",
      error: error.message
    });
  }
};
