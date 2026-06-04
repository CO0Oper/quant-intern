import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { writeText } from "./file_utils.js";

// Canonical results store. JSON is the source of truth (append-only); the .md is
// regenerated from it on every write so there is always a human-readable log.
export const RESULTS_JSON = "cache/results_log.json";
export const RESULTS_MD = "cache/results_log.md";

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);
const round = (v, d = 2) => (v === null ? null : Number(v.toFixed(d)));
// MCP summary returns fractions (0.0089 = 0.89%); expose as percentages.
const pct = (v) => (num(v) === null ? null : round(num(v) * 100));
const isoDay = (ms) => (num(ms) === null ? null : new Date(num(ms)).toISOString().slice(0, 10));

/**
 * Reduce a raw `data_get_strategy_results` payload to the canonical metric set.
 * Prefers the embedded buyHoldReturnPercent benchmark; falls back to an override.
 */
export function summarizeResults(raw, { benchmarkPercentOverride = null } = {}) {
  const s = raw?.summary ?? {};
  const dr = raw?.metrics?.settings?.dateRange?.backtest ?? {};
  const buyhold = pct(s.buyHoldReturnPercent);
  return {
    strategy_name: raw?.strategy_name ?? null,
    net_pct: pct(s.netProfitPercent),
    buyhold_pct: buyhold ?? round(num(benchmarkPercentOverride)),
    profit_factor: round(num(s.profitFactor)),
    win_pct: pct(s.percentProfitable),
    max_dd_pct: pct(s.maxDrawDownPercent),
    sharpe: round(num(s.sharpeRatio), 3),
    trades: num(s.totalTrades),
    window_from: isoDay(dr.from),
    window_to: isoDay(dr.to)
  };
}

/** Derive a quick beats/loses verdict vs same-row buy-and-hold. */
export function netVerdict(entry) {
  if (entry.net_pct === null || entry.buyhold_pct === null) return "n/a";
  return entry.net_pct >= entry.buyhold_pct ? "beats" : "loses";
}

async function loadEntries() {
  if (!existsSync(RESULTS_JSON)) return [];
  try {
    const parsed = JSON.parse(await readFile(RESULTS_JSON, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Append one backtest run to the canonical log and regenerate the markdown table.
 * `entry` should carry: source, run, symbol, timeframe, the summarizeResults() fields,
 * and optionally verdict/notes. recorded_at is stamped here.
 */
export async function recordResult(entry) {
  const entries = await loadEntries();
  const full = {
    recorded_at: new Date().toISOString(),
    net_vs_benchmark: netVerdict(entry),
    ...entry
  };
  entries.push(full);
  await writeText(RESULTS_JSON, JSON.stringify(entries, null, 2) + "\n");
  await writeText(RESULTS_MD, buildMarkdown(entries));
  return full;
}

const cell = (v, suffix = "") => (v === null || v === undefined ? "—" : `${v}${suffix}`);

export function buildMarkdown(entries) {
  const header = [
    "# Quant Intern — Backtest Results Log (auto-generated)",
    "",
    "Source of truth: `cache/results_log.json`. Regenerated on every recorded run.",
    "Compare net% ONLY to its own row's buy-and-hold (each row's window differs).",
    "",
    "| recorded | source | run | symbol | TF | net % | B&H % | net vs B&H | PF | win % | maxDD % | sharpe | trades | window | verdict |",
    "|----------|--------|-----|--------|----|------:|------:|:----------:|---:|------:|--------:|------:|------:|--------|---------|"
  ];
  const rows = entries.map((e) => {
    const win = e.window_from && e.window_to ? `${e.window_from}→${e.window_to}` : "—";
    return `| ${cell(e.recorded_at ? e.recorded_at.slice(0, 16).replace("T", " ") : null)} | ${cell(e.source)} | ${cell(e.run)} | ${cell(e.symbol)} | ${cell(e.timeframe)} | ${cell(e.net_pct)} | ${cell(e.buyhold_pct)} | ${cell(e.net_vs_benchmark)} | ${cell(e.profit_factor)} | ${cell(e.win_pct)} | ${cell(e.max_dd_pct)} | ${cell(e.sharpe)} | ${cell(e.trades)} | ${win} | ${cell(e.verdict)} |`;
  });
  return header.concat(rows).join("\n") + "\n";
}
