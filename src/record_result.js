import { readFile } from "node:fs/promises";
import { parseArgs, requireArg } from "./args.js";
import { summarizeResults, recordResult } from "./results_log.js";

// CLI: record one backtest run into the canonical results log.
//
//   node src/record_result.js --results <raw_results.json> --source <id> --run r0 \
//        --symbol FX:XAUUSD --timeframe 15 --verdict revise [--benchmark <pct>] [--notes "..."]
//
// <raw_results.json> is a saved `data_get_strategy_results` payload. In CLI-agent mode,
// dump the MCP tool output to a file, then call this so every run is logged the same way.
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const resultsPath = requireArg(args, "results");
  const raw = JSON.parse(await readFile(resultsPath, "utf8"));

  const summary = summarizeResults(raw, {
    benchmarkPercentOverride: args.benchmark ? Number(args.benchmark) : null
  });

  const entry = await recordResult({
    source: args.source ?? null,
    run: args.run ?? "r0",
    symbol: args.symbol ?? raw?.metrics?.symbol ?? null,
    timeframe: args.timeframe ?? null,
    verdict: args.verdict ?? null,
    notes: args.notes ?? null,
    ...summary
  });

  console.log(`recorded: ${entry.source ?? "?"} ${entry.run} ${entry.symbol}@${entry.timeframe} ` +
    `net ${entry.net_pct}% vs B&H ${entry.buyhold_pct}% (${entry.net_vs_benchmark}) -> results_log.md`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
