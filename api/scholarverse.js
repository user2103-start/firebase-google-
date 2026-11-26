const BASE = "https://missionjeet.site";

module.exports = async (req, res) => {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const {
    action,
    course_id,
    tab_id,
    folder_id = "0",
    limit = "100",
    content_id,
    test_id,
    attempt_mode = "practice"
  } = req.query;

  try {
    let url;
    let method = "GET";
    let body = undefined;

    switch (action) {

      // Batches
      case "batches":
        url = `${BASE}/batches.json`;
        break;

      // Course Overview
      case "overview":
        url = `${BASE}/api.php?action=overview&course_id=${encodeURIComponent(course_id)}`;
        break;

      // Course Content
      case "content":
        url = `${BASE}/api.php?action=content&course_id=${encodeURIComponent(course_id)}&tab_id=${encodeURIComponent(tab_id)}&folder_id=${encodeURIComponent(folder_id)}&limit=${encodeURIComponent(limit)}`;
        break;

      // Video / PDF
      case "media":
        url = `${BASE}/mj.php?content_id=${encodeURIComponent(content_id)}&course_id=${encodeURIComponent(course_id)}`;
        break;

      // Test Instructions
      case "test_instructions":
        url = `${BASE}/api.php?action=test_instructions&test_id=${encodeURIComponent(test_id)}&attempt_mode=${encodeURIComponent(attempt_mode)}`;
        break;

      // Test Questions / Data
      case "test_data":
        url = `${BASE}/api.php?action=test_data&test_id=${encodeURIComponent(test_id)}&attempt_mode=${encodeURIComponent(attempt_mode)}`;
        break;

      // Submit Test Answers
      case "test_submit":
        if (req.method !== "POST") {
          return res.status(405).json({
            success: false,
            message: "Test submit requires POST"
          });
        }

        url = `${BASE}/api.php?action=test_submit`;
        method = "POST";

        body = typeof req.body === "string"
          ? req.body
          : JSON.stringify(req.body || {});

        break;

      // Test Result
      case "test_result":
        url = `${BASE}/api.php?action=test_result&test_id=${encodeURIComponent(test_id)}`;
        break;

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

    res.status(response.status);

    const contentType = response.headers.get("content-type");

    if (contentType) {
      res.setHeader("Content-Type", contentType);
    }

    res.setHeader("Cache-Control", "no-store");

    // Forward response as-is
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
