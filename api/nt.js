export default async function handler(req, res) {
  // Extract path or target query parameter sent to your proxy
  const urlParam = req.query.path || "";
  let destinationUrl = "";

  // Route requests based on incoming paths or query parameters
  if (req.url.includes("livex.php") || urlParam.includes("livex.php")) {
    const id = req.query.id || "249";
    destinationUrl = `https://selectionway.studybeepro.site/livex.php?id=${id}`;
  } else if (req.url.includes("overview") || req.url.includes("content") || req.url.includes("fk.khatikgaurav38")) {
    // Forward to the Cloudflare Worker API
    const subPath = req.url.replace('/api/proxy', '');
    destinationUrl = `https://fk.khatikgaurav38.workers.dev${subPath}`; } else { // Default fallback to Studybeepro base API const subPath = req.url.replace('/api/proxy', ''); destinationUrl = `https://nt.studybeepro.site${subPath}`;
  }

  try {
    const response = await fetch(destinationUrl, {
      method: req.method,
      headers: {
        "User-Agent": req.headers["user-agent"] || "Mozilla/5.0",
        "Referer": "https://studybeepro.site",
        "Origin": "https://studybeepro.site",
        "Accept": req.headers["accept"] || "*/*",
      },
    });

    const data = await response.text();

    // Set CORS headers so your client-side app can fetch this freely
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }

    res.status(response.status).send(data);
  } catch (error) {
    res.status(500).json({ error: "Proxy failed", details: error.message });
  }
}
