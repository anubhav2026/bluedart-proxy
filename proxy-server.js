const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

let ACCESS_TOKEN = process.env.ACCESS_TOKEN || "";
let REFRESH_TOKEN = process.env.REFRESH_TOKEN || "";

const refreshAccessToken = async () => {
  try {
    const res = await fetch("https://api.hunar.ai/v1/auth/refresh", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": `refresh=${REFRESH_TOKEN}`,
        "origin": "https://bluedart.hunar.ai",
        "referer": "https://bluedart.hunar.ai/",
      },
    });
    const text = await res.text();
    // token may come back as a Set-Cookie header
    const setCookie = res.headers.get("set-cookie") || "";
    const match = setCookie.match(/access=([^;]+)/);
    if (match) {
      ACCESS_TOKEN = match[1];
      console.log("Token refreshed via cookie:", new Date().toISOString());
      return true;
    }
    // or in JSON body
    try {
      const data = JSON.parse(text);
      if (data.access_token || data.access) {
        ACCESS_TOKEN = data.access_token || data.access;
        console.log("Token refreshed via body:", new Date().toISOString());
        return true;
      }
    } catch {}
    console.log("Refresh failed, response:", text.slice(0, 200));
    return false;
  } catch (e) {
    console.error("Refresh error:", e.message);
    return false;
  }
};

app.post("/api/bluedart", async (req, res) => {
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await fetch("https://api.hunar.ai/v1/company/bluedart/search-job-query", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "accept": "application/json, text/plain, */*",
        "Cookie": `access=${ACCESS_TOKEN}; refresh=${REFRESH_TOKEN}`,
        "origin": "https://bluedart.hunar.ai",
        "referer": "https://bluedart.hunar.ai/",
        "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/146.0.0.0 Safari/537.36",
      },
      body: JSON.stringify(req.body),
    });

    if (response.status === 401 && attempt === 0) {
      console.log("401 received, attempting token refresh...");
      const refreshed = await refreshAccessToken();
      if (!refreshed) break;
      continue;
    }

    const data = await response.json();
    return res.json(data);
  }
  res.status(401).json({ error: "Authentication failed. Please update tokens via /set-tokens." });
});

// Update tokens without redeploying
app.post("/set-tokens", (req, res) => {
  const { access, refresh, secret } = req.body;
  if (secret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: "Invalid secret" });
  }
  if (access) { ACCESS_TOKEN = access; console.log("Access token updated manually"); }
  if (refresh) { REFRESH_TOKEN = refresh; console.log("Refresh token updated manually"); }
  res.json({ ok: true, message: "Tokens updated" });
});

app.get("/health", (_, res) => res.json({ ok: true, time: new Date().toISOString() }));

const PORT = process.env.PORT || 3131;
app.listen(PORT, () => console.log(`Blue Dart proxy running on port ${PORT}`));
