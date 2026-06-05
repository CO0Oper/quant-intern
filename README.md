# Quant Intern

**Turn a YouTube trading-strategy video into a backtested verdict — automatically.**

Paste a YouTube URL; Quant Intern fetches the transcript, extracts the trading rules
into a structured spec, resolves the vague parts into concrete code, generates a
PineScript v5 `strategy()`, compiles it on a live TradingView chart, backtests it
across a ticker × timeframe matrix, and renders an honest verdict **versus
buy‑and‑hold** — then annotates the chart with the conclusion.

It is built to give a *truthful* answer, not a flattering one. Most "amazing" YouTube
strategies lose to simply holding the asset, and the pipeline is designed to say so.

> **Status:** Hackathon project. The full pipeline is **proven end-to-end on two
> distinct strategy types** (mechanical price-action and indicator mean-reversion).
> It is a strong demo, not a production trading system — see
> [Caveats](#caveats--honest-limits).

---

## What it produces

For the demo video [`pCmJ8wsAS_w`](https://www.youtube.com/watch?v=pCmJ8wsAS_w)
("Bollinger Bands + RSI" mean reversion), run cold end-to-end:

| Symbol | TF | net % | Buy & Hold % | verdict |
|--------|----|------:|-------------:|:-------:|
| XAUUSD | 5m | −0.19 | −14.19 | **beats** |
| XAUUSD | 60m | −12.22 | +143.50 | loses |
| XAUUSD | 1D | −65.42 | +2540.5 | loses |
| EURUSD | 60m | +7.82 | +10.43 | loses (best cell, Sharpe +0.03) |
| NQ1! | 60m | +10.98 | +150.49 | loses |
| … | | | | |

**Verdict: 1 / 9 cells beat their own buy‑and‑hold → SKIP.** The strategy's
mean‑reversion shorts get run over in trending markets; it is least‑bad on ranging FX.
Every cell is compared **only to its own same‑cell buy‑and‑hold** because each
timeframe loads a different historical window.

The canonical results are stored in `cache/results_log.json` (source of truth) and
auto‑rendered to `cache/results_log.md`, plus a watchable web dashboard (below).

---

## How it works

```
YouTube URL
   │  1. transcript_fetch        (code)   yt-dlp → cached text
   ▼
Transcript text
   │  2. rule_extract            (agent)  → draft Strategy Spec (JSON)
   │  3. ambiguity_resolve       (agent)  → final Spec: every rule codeable, each
   │                                        guess recorded in assumptions[]
   ▼
Strategy Spec (JSON)
   │  4. pine_generate           (agent)  → PineScript v5 strategy()
   │  5. compile_loop            (MCP)    pine_new → set_source → smart_compile →
   │                                        get_errors → repair (≤5) → save
   │                                        └ fallback/known_good.pine on repeated failure
   ▼
Compiled strategy on the chart
   │  6. backtest matrix         (MCP)    add once → sweep symbol × timeframe →
   │                                        data_get_strategy_results (incl. B&H benchmark)
   │  7. results_log             (code)   record every cell; verdict vs same-cell B&H
   │  8. chart_annotate          (MCP)    draw verdict + levels → capture_screenshot
   ▼
Verdict + annotated chart + results log + live UI stream
```

The **front half (links 1–4)** is code + LLM reasoning. The **back half (links 5–8)**
is entirely [TradingView MCP](#requirements) tool calls — Quant Intern does **not**
hand-roll chart control. See [`TECHNICAL.md`](TECHNICAL.md) for the full 7-link design
and [`AGENTS.md`](AGENTS.md) for each agent's system prompt.

### Two execution modes

- **CLI-agent mode (supported).** Run inside [Claude Code](https://claude.com/claude-code)
  or Codex. The agent *is* the LLM (no API key needed) and calls the `mcp__tradingview__*`
  tools directly. This is how the demo runs.
- **Plain Node mode (parked).** `npm start` runs the front half via the Anthropic API
  directly. It needs `ANTHROPIC_API_KEY` and cannot reach the MCP back half on its own,
  so it is kept only as a structured reference. The `src/*` modules it uses are unit-
  tested (`npm run check`).

---

## Requirements

- **Node.js ≥ 18** (ESM; developed on Node 24).
- **TradingView Desktop** with remote debugging on CDP port 9222, and a chart open.
- The **`tradingview` MCP server** registered in your CLI-agent session, exposing
  `mcp__tradingview__*` tools. (This repo does not vendor the MCP server.)
- **yt-dlp** + a browser logged into YouTube (Firefox cookies work; see notes) for
  transcript fetch.

---

## Quick start (CLI-agent mode)

1. **Launch TradingView in debug mode** (kills any running instance first, because the
   single-instance lock otherwise drops the debug flag):
   ```powershell
   # Windows — via the bundled skill tradingview-debug-launch, or manually:
   Get-Process TradingView -ErrorAction SilentlyContinue | Stop-Process -Force
   Start-Process "<TradingView.exe>" -ArgumentList "--remote-debugging-port=9222"
   ```
2. **Confirm the back half is reachable:** the agent calls
   `mcp__tradingview__tv_health_check` → must return `api_available: true`. If not, stop
   and relaunch.
3. **Run the pipeline** — in your CLI agent, ask:
   ```
   Use Quant Intern on https://www.youtube.com/watch?v=<id>
   with symbol FX:XAUUSD and timeframe 60.
   ```
   The agent fetches the transcript → extracts/resolves the spec → generates Pine →
   compiles/fixes → sweeps the backtest matrix → records results → annotates the chart.

### Watch it run (web dashboard)

```bash
npm run ui     # → http://127.0.0.1:4321
```
Left pane streams every step (`cache/run_log.jsonl`); right pane shows the results
matrix (`cache/results_log.json`) with click-to-sort columns and a net‑vs‑B&H summary.

### Verify the code (no chart / no API needed)

```bash
npm run check  # node --check on every src module + the strategy_store unit test
```

---

## Repository layout

```
src/
  transcript_fetch.js   pine_generate.js     results_log.js     ui_log.js
  rule_extract.js       compile_loop.js      record_result.js   ui_server.js
  spec_schema.js        strategy_store.js    backtest_run.js    harness.js
  chart_annotate.js     critic.js            tradingview_mcp_adapter.js
  strategy_store.test.js   llm_client.js     file_utils.js      args.js  logger.js
prompts/        extractor · resolver · pine_coder · compile_fix · critic  (system prompts)
fallback/       known_good.pine   (always-compiles EMA-cross safety net)
web/            index.html        (zero-dep dashboard)
cache/          transcripts/ + results_log.{json,md} + run_log.jsonl   (gitignored)
tasks/          todo.md · lessons.md   (phased plan + correction log)
TECHNICAL.md  AGENTS.md  README.md
```

Each `src/*` file is one link in the chain, single-responsibility. Prompts live in
`prompts/` so they're editable without touching logic.

---

## De-risking (why it survives a live demo)

The pipeline has ~7 fragile links, so the design front-loads the risky ones:

- **Back half proven first** — chart control, compile, and results-read were validated
  before any front-end was built.
- **Cached transcripts** — a network hiccup can't kill a rehearsed run.
- **Known-good fallback Pine** — if generation/compile ever fails, `fallback/known_good.pine`
  loads and the demo keeps moving (proven live).
- **Always vs buy-and-hold** — every result is shown against its same-window benchmark,
  so the verdict is objective rather than cherry-picked.
- **Health check before every run** — `tv_health_check` gates the whole pipeline.

---

## Caveats — honest limits

1. **The compile-fix loop hasn't met a *real* failure.** Both demo videos compiled on
   the first attempt; the repair loop and fallback have only been *force-triggered*,
   never tripped by a genuinely messy generation. That's the likeliest surprise on a
   harder video.
2. **"Works well" = on clean, mechanical, indicator-based strategies.** Discretionary
   strategies lean heavily on the Resolver's substitutions (all surfaced in
   `assumptions[]`, never silent), and truly non-mechanizable parts are omitted by
   design.
3. **A few manual touchpoints remain** — debug-mode launch, Firefox-cookie transcript
   fetch, agent-driven matrix sweep. Great demo, not yet one-command.
4. **Backtest verdict ≠ investment advice.** No commission/slippage modeling;
   `100% equity` sizing is a baseline. Compare a cell only to its own buy-and-hold.

---

## License

Not yet specified. Treat as all-rights-reserved until a license file is added.
