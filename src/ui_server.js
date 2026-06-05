import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join } from "node:path";

// Zero-dependency static server for the Quant Intern watchable UI. Serves the
// single-page dashboard plus the two runtime artifacts it tails. Run: `npm run ui`.
const PORT = Number(process.env.UI_PORT) || 4321;
const ROOT = process.cwd();

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

// Whitelisted routes only — no arbitrary filesystem access.
const ROUTES = {
  "/": "web/index.html",
  "/index.html": "web/index.html",
  "/results_log.json": "cache/results_log.json",
  "/run_log.jsonl": "cache/run_log.jsonl"
};

const server = createServer(async (req, res) => {
  const url = (req.url || "/").split("?")[0];
  const file = ROUTES[url];

  if (!file) {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("Not found");
    return;
  }

  const path = join(ROOT, file);

  // Runtime artifacts may not exist yet — serve an empty stream instead of 404.
  if (!existsSync(path)) {
    if (url.endsWith(".json")) {
      res.writeHead(200, { "content-type": TYPES[".json"], "cache-control": "no-store" });
      res.end("[]");
      return;
    }
    if (url.endsWith(".jsonl")) {
      res.writeHead(200, { "content-type": "text/plain", "cache-control": "no-store" });
      res.end("");
      return;
    }
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("Not found");
    return;
  }

  try {
    const body = await readFile(path);
    res.writeHead(200, {
      "content-type": TYPES[extname(file)] || "application/octet-stream",
      "cache-control": "no-store"
    });
    res.end(body);
  } catch (err) {
    res.writeHead(500, { "content-type": "text/plain" });
    res.end(String(err.message || err));
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Quant Intern UI → http://127.0.0.1:${PORT}`);
});
