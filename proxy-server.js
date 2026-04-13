const express = require("express");
const path = require("path");
const app = express();

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "*");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.use(express.json());

let ACCESS_TOKEN = process.env.ACCESS_TOKEN || "";
const REFRESH_TOKEN = process.env.REFRESH_TOKEN || "";

const refreshAccessToken = async () => {
  try {
    console.log("Refreshing access token...");
    const res = await fetch("https://api.hunar.ai/v1/auth/refresh", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": "refresh=" + REFRESH_TOKEN,
        "origin": "https://bluedart.hunar.ai",
        "referer": "https://bluedart.hunar.ai/",
        "user-agent": "Mozilla/5.0",
      },
    });
    const setCookie = res.headers.get("set-cookie") || "";
    const match = setCookie.match(/access=([^;]+)/);
    if (match) {
      ACCESS_TOKEN = match[1];
      console.log("Token refreshed successfully at " + new Date().toISOString());
      return true;
    }
    const body = await res.text();
    console.log("Refresh response:", res.status, body.slice(0, 200));
    return false;
  } catch (e) {
    console.error("Refresh error:", e.message);
    return false;
  }
};

const callHunarAPI = async (body) => {
  const response = await fetch("https://api.hunar.ai/v1/company/bluedart/search-job-query", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "accept": "application/json, text/plain, */*",
      "Cookie": "access=" + ACCESS_TOKEN + "; refresh=" + REFRESH_TOKEN,
      "origin": "https://bluedart.hunar.ai",
      "referer": "https://bluedart.hunar.ai/",
      "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/146.0.0.0 Safari/537.36",
    },
    body: JSON.stringify(body),
  });
  return response;
};

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "dashboard.html"));
});

app.post("/v1/company/bluedart/search-job-query", async (req, res) => {
  try {
    let response = await callHunarAPI(req.body);
    if (response.status === 401 || response.status === 403) {
      console.log("Got " + response.status + ", refreshing token...");
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        response = await callHunarAPI(req.body);
      }
    }
    const data = await response.json();
    return res.json(data);
  } catch (e) {
    console.error("API error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

app.post("/set-tokens", (req, res) => {
  const { access, secret } = req.body;
  if (secret !== process.env.ADMIN_SECRET) return res.status(403).json({ error: "Invalid secret" });
  if (access) { ACCESS_TOKEN = access; console.log("Access token manually updated"); }
  res.json({ ok: true });
});

app.get("/health", (_, res) => res.json({ ok: true, time: new Date().toISOString(), hasToken: !!ACCESS_TOKEN }));


app.post("/v1/company/bluedart/qualified-workers/:jqId", async (req, res) => {
  try {
    const response = await fetch("https://api.hunar.ai/v1/company/bluedart/job-query/" + req.params.jqId + "/qualified-workers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "accept": "application/json, text/plain, */*",
        "Cookie": "access=" + ACCESS_TOKEN + "; refresh=" + REFRESH_TOKEN,
        "origin": "https://bluedart.hunar.ai",
        "referer": "https://bluedart.hunar.ai/",
        "user-agent": "Mozilla/5.0",
      },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    return res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3131;
app.listen(PORT, async () => {
  console.log("Blue Dart proxy running on port " + PORT);
  if (!ACCESS_TOKEN && REFRESH_TOKEN) {
    console.log("No access token, attempting refresh on startup...");
    await refreshAccessToken();
  }
});

setInterval(async () => {
  console.log("Auto-refreshing token...");
  await refreshAccessToken();
}, 25 * 60 * 1000);

