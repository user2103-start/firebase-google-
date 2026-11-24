
const { Readable } = require("stream");

const BASE = "https://missionjeet.site";

module.exports = async (req, res) => {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed"
    });
  }

  try {
    const {
      action,
      course_id,
      tab_id,
      folder_id = "0",
      limit = "100",
      content_id
    } = req.query;

    let url;

    switch (action) {

      // Batches
      case "batches":
        url = `${BASE}/batches.json`;
        break;

      // Course Overview
      case "overview":
        if (!course_id) {
          return res.status(400).json({
            success: false,
            message: "course_id required"
          });
        }

        url = `${BASE}/api.php?action=overview&course_id=${encodeURIComponent(course_id)}`;
        break;

      // Content by Tab ID
      case "content":
        if (!course_id || !tab_id) {
          return res.status(400).json({
            success: false,
            message: "course_id and tab_id required"
          });
        }

        url = `${BASE}/api.php?action=content&course_id=${encodeURIComponent(course_id)}&tab_id=${encodeURIComponent(tab_id)}&folder_id=${encodeURIComponent(folder_id)}&limit=${encodeURIComponent(limit)}`;
        break;

      // Video / PDF
      case "media":
        if (!course_id || !content_id) {
          return res.status(400).json({
            success: false,
            message: "course_id and content_id required"
          });
        }

        url = `${BASE}/mj.php?content_id=${encodeURIComponent(content_id)}&course_id=${encodeURIComponent(course_id)}`;
        break;

      default:
        return res.status(400).json({
          success: false,
          message: "Invalid action",
          available: ["batches", "overview", "content", "media"]
        });
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "*/*",
        "User-Agent": "Mozilla/5.0"
      },
      redirect: "follow"
    });

    // Forward upstream status
    res.status(response.status);

    // Forward useful response headers
    const contentType = response.headers.get("content-type");
    const contentLength = response.headers.get("content-length");

    if (contentType) {
      res.setHeader("Content-Type", contentType);
    }

    if (contentLength) {
      res.setHeader("Content-Length", contentLength);
    }

    res.setHeader("Cache-Control", "no-store");

    // Stream response (JSON / PDF / other media)
    if (response.body) {
      return Readable.fromWeb(response.body).pipe(res);
    }

    return res.end();

  } catch (error) {
    console.error("Proxy Error:", error);

    return res.status(500).json({
      success: false,
      message: "Proxy request failed",
      error: error.message
    });
  }
};
