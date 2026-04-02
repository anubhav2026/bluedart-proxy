const express = require("express");
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
let REFRESH_TOKEN = process.env.REFRESH_TOKEN || "";

app.post("/api/bluedart", async (req, res) => {
  try {
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
    const data = await response.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/set-tokens", (req, res) => {
  const { access, refresh, secret } = req.body;
  if (secret !== process.env.ADMIN_SECRET) return res.status(403).json({ error: "Invalid secret" });
  if (access) ACCESS_TOKEN = access;
  if (refresh) REFRESH_TOKEN = refresh;
  res.json({ ok: true });
});

app.get("/health", (_, res) => res.json({ ok: true, time: new Date().toISOString() }));

const PORT = process.env.PORT || 3131;
app.listen(PORT, () => console.log(`Blue Dart proxy running on port ${PORT}`));
