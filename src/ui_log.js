import { appendFile, mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

// Append-only event stream for the watchable UI (web/index.html tails it) and the
// terminal. Each pipeline step (rules → code → compile → backtest → results → verdict)
// calls uiLog() so judges can watch the agent operate. Plain JSONL, one event per line.
export const RUN_LOG = "cache/run_log.jsonl";

const LEVELS = new Set(["info", "ok", "warn", "error"]);

/**
 * Record one pipeline event. `extra` may carry { level, symbol, timeframe, ... }.
 * Returns the event object (also echoed to the terminal).
 */
export async function uiLog(step, detail = "", extra = {}) {
  const level = LEVELS.has(extra.level) ? extra.level : "info";
  const event = { ts: new Date().toISOString(), step, detail, ...extra, level };
  await mkdir(dirname(RUN_LOG), { recursive: true });
  await appendFile(RUN_LOG, JSON.stringify(event) + "\n", "utf8");
  const tag = level === "info" ? "" : `[${level}] `;
  console.log(`[ui] ${tag}${step}${detail ? ` — ${detail}` : ""}`);
  return event;
}

/** Start a fresh run stream (truncates the log). Call once at the top of a run. */
export async function startRun(label = "run") {
  await mkdir(dirname(RUN_LOG), { recursive: true });
  await writeFile(RUN_LOG, "", "utf8");
  return uiLog("run started", label, { level: "ok" });
}
