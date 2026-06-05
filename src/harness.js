import { parseArgs, requireArg } from "./args.js";
import { createLogger } from "./logger.js";
import { fetchTranscript } from "./transcript_fetch.js";
import { extractStrategySpec, resolveAmbiguity } from "./rule_extract.js";
import { generatePine } from "./pine_generate.js";
import { writeText } from "./file_utils.js";
import { createTradingViewMcpAdapter } from "./tradingview_mcp_adapter.js";
import { compileAndFix } from "./compile_loop.js";
import { runBacktest } from "./backtest_run.js";
import { critique } from "./critic.js";
import { annotateChart } from "./chart_annotate.js";
import { checkTradingViewCdp } from "./tv_cdp_health.js";
import { summarizeResults as toResultRecord, recordResult } from "./results_log.js";
import { canonicalName } from "./strategy_store.js";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const log = createLogger();

  const videoUrl = requireArg(args, "video");
  const symbol = args.symbol;
  const timeframe = args.timeframe;

  log.step("TradingView CDP health");
  const cdp = await checkTradingViewCdp();
  log.json("tv_cdp", cdp);

  log.step("Fetch transcript");
  const transcript = await fetchTranscript({
    videoUrl,
    transcriptPath: args.transcript
  });
  log.step("Transcript ready", transcript.source);

  log.step("Extractor agent");
  const draftSpec = await extractStrategySpec({
    transcript: transcript.text,
    videoUrl,
    symbol,
    timeframe
  });
  await writeText("cache/draft_spec.json", JSON.stringify(draftSpec, null, 2));

  log.step("Resolver agent");
  const spec = await resolveAmbiguity({ draftSpec });
  await writeText("cache/final_spec.json", JSON.stringify(spec, null, 2));

  const savedName = canonicalName({ symbol: spec.symbol, title: spec.title, rerun: 0 });
  log.step("Canonical name", savedName);

  log.step("Pine Coder agent");
  const pine = await generatePine({ spec, canonicalName: savedName });
  await writeText("cache/generated_strategy.pine", pine);

  const adapter = createTradingViewMcpAdapter();
  if (!adapter.available) {
    log.step("MCP handoff required", adapter.reason);
    log.step("Artifacts written", "cache/final_spec.json and cache/generated_strategy.pine");
    return;
  }

  log.step("Compile/Fix agent");
  const compileStatus = await compileAndFix({ adapter, source: pine, savedName, log });
  await writeText("cache/compile_status.json", JSON.stringify(compileStatus, null, 2));

  log.step("Backtest Runner");
  const backtest = await runBacktest({ adapter, spec });
  await writeText("cache/backtest.json", JSON.stringify(backtest, null, 2));

  log.step("Critic agent");
  const verdict = await critique({
    results: backtest.results,
    benchmarkBuyAndHold: backtest.benchmark_buy_and_hold,
    currentSpec: spec,
    rerunCount: 0
  });
  await writeText("cache/verdict.json", JSON.stringify(verdict, null, 2));

  log.step("Record results");
  const recorded = await recordResult({
    source: videoUrl,
    run: "r0",
    symbol: spec.symbol,
    timeframe: spec.timeframe,
    verdict: verdict?.verdict ?? null,
    ...toResultRecord(backtest.results, {
      benchmarkPercentOverride: backtest.benchmark_buy_and_hold?.return_percent ?? null
    })
  });
  log.step("Results logged", `net ${recorded.net_pct}% vs B&H ${recorded.buyhold_pct}% (${recorded.net_vs_benchmark}) -> cache/results_log.md`);

  log.step("Annotator agent");
  const screenshot = await annotateChart({
    adapter,
    verdict,
    resultsSummary: summarizeResults(backtest)
  });
  await writeText("cache/screenshot.json", JSON.stringify(screenshot, null, 2));
}

function summarizeResults(backtest) {
  const net = backtest.results?.net_profit ?? backtest.results?.netProfit ?? "n/a";
  const dd = backtest.results?.max_drawdown ?? backtest.results?.maxDrawdown ?? "n/a";
  const win = backtest.results?.win_rate ?? backtest.results?.winRate ?? "n/a";
  return `Net ${net} | Win ${win} | DD ${dd}`;
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
