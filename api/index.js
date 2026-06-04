const express = require("express");
const path = require("path");
const fs = require("fs");
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
    const res = await fetch("https://api.hunar.ai/auth/token/refresh", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": "refresh=" + REFRESH_TOKEN,
        "origin": "https://bluedart.hunar.ai",
        "referer": "https://bluedart.hunar.ai/",
        "user-agent": "Mozilla/5.0",
      },
      body: JSON.stringify({})
    });
    const setCookie = res.headers.get("set-cookie") || "";
    const match = setCookie.match(/access=([^;]+)/);
    if (match) { ACCESS_TOKEN = match[1]; return true; }
    return false;
  } catch (e) { return false; }
};

const hunarFetch = async (url, body) => {
  if (!ACCESS_TOKEN) await refreshAccessToken();
  const r = await fetch("https://api.hunar.ai" + url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "accept": "application/json, text/plain, */*",
      "Cookie": "access=" + ACCESS_TOKEN + "; refresh=" + REFRESH_TOKEN,
      "origin": "https://bluedart.hunar.ai",
      "referer": "https://bluedart.hunar.ai/",
      "user-agent": "Mozilla/5.0",
    },
    body: JSON.stringify(body),
  });
  if (r.status === 401 || r.status === 403) {
    await refreshAccessToken();
    return fetch("https://api.hunar.ai" + url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "accept": "application/json, text/plain, */*",
        "Cookie": "access=" + ACCESS_TOKEN + "; refresh=" + REFRESH_TOKEN,
        "origin": "https://bluedart.hunar.ai",
        "referer": "https://bluedart.hunar.ai/",
        "user-agent": "Mozilla/5.0",
      },
      body: JSON.stringify(body),
    });
  }
  return r;
};

app.get("/", (req, res) => {
  const html = fs.readFileSync(path.join(__dirname, "../dashboard.html"), "utf8");
  res.setHeader("Content-Type", "text/html");
  res.send(html);
});

app.post("/v1/company/bluedart/search-job-query", async (req, res) => {
  try { res.json(await (await hunarFetch("/v1/company/bluedart/search-job-query", req.body)).json()); }
  catch(e) { res.status(500).json({error: e.message}); }
});

app.post("/v1/company/bluedart/qualified-workers/:jqId", async (req, res) => {
  try { res.json(await (await hunarFetch("/v1/company/bluedart/job-query/" + req.params.jqId + "/qualified-workers", req.body)).json()); }
  catch(e) { res.status(500).json({error: e.message}); }
});

app.post("/v1/company/bluedart/job-query/:jqId/interested-workers", async (req, res) => {
  try { res.json(await (await hunarFetch("/v1/company/bluedart/job-query/" + req.params.jqId + "/interested-workers", req.body)).json()); }
  catch(e) { res.status(500).json({error: e.message}); }
});

app.post("/v1/company/bluedart/job-query/:jqId/shortlisted-workers", async (req, res) => {
  try { res.json(await (await hunarFetch("/v1/company/bluedart/job-query/" + req.params.jqId + "/shortlisted-workers", req.body)).json()); }
  catch(e) { res.status(500).json({error: e.message}); }
});

app.get("/health", (_, res) => res.json({ok: true, hasToken: !!ACCESS_TOKEN}));

module.exports = app;
