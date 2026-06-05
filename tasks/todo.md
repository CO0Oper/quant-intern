# Quant Intern — Task List

Ordered, phased plan. Per the Codex audit, the fragile links are the TradingView MCP
ones — so we **prove the back half first**, then build the front-end that feeds it.
Legend: **[MUST]** = must-have, **[NICE]** = nice-to-have, **[CUT]** = out of scope.

---

## 📍 RESUME HERE (last updated 2026-06-04, session 4)

**Session-4 progress (Phase 2 closed):**
- Implemented the missing **`src/strategy_store.js`** (TECHNICAL.md §8 naming: `bareSymbol`,
  `slugify`≤24, `canonicalName` → `QI · {SYMBOL} · {slug} · r{rerun}`, `applyCanonicalTitle`,
  `isQiScriptName`).
- **`compile_loop.js`** now does the full persist flow: `pine_new` (fresh slot) → stamp title →
  set/compile/get-errors loop (cap 5, fences stripped on each repair) → `pine_save` on clean
  → returns `saved_name`. Fallback path unchanged but explicitly never saved under `QI · `.
- **`pine_generate.js`** stamps the canonical title deterministically; **`harness.js`** computes
  `canonicalName` from the spec and threads it + the logger through. Compile attempts now stream
  to the UI log.
- Adapter gained `pineNew`/`pineSave`/`pineListScripts`/`pineOpen` stubs.
- Added **`src/strategy_store.test.js`** (run by `npm run check`) — naming contract + §8 persist
  sequence vs a mock adapter. `npm run check` passes.
**⏸ DECISION (session 4): plain Node mode is PARKED.** `npm start` (the front-half Node
runner) depends on a paid Anthropic API key (`ANTHROPIC_API_KEY`/`ANTHROPIC_MODEL` → direct
`api.anthropic.com` calls in `src/llm_client.js`) AND can't reach the MCP back half anyway
(adapter stubs throw). We have no spare API credit/time to test it. **CLI-agent mode via
Claude Code + Codex is the ONLY supported path** — the agent supplies both the reasoning
(no API key) and the `mcp__tradingview__*` tools. The Node `src/*` modules stay as a
reference/structured fallback (and the Phase-2 logic is covered by `strategy_store.test.js`),
but we will NOT spend time exercising `npm start` end-to-end. `npm run check` (syntax + unit
test) is still the only Node thing we keep green.

**Session-4 (cont.) — Phase 3 MUSTs DONE (live 24-cell matrix):** Launched TV debug, added the
r0 strategy to the agent-playground chart ONCE, swept {XAUUSD, EURUSD, ES1!, NQ1!} × {5m,15m,30m,1h,4h,1d}
= 24 cells, recorded all to `cache/results_log.{json,md}`. **3/24 beat same-cell B&H** (only in falling-market
windows) → strategy does not generalize; honest SKIP. Each cell compared ONLY to its own same-cell
buyHoldReturnPercent (windows differ by TF).

- **NEXT:** Phase 4 — **`ui_log` (MUST)**: streaming terminal log of the whole run (rules→code→compile→
  results→verdict) so judges can watch the agent operate. Then Phase 5 demo rehearsal. (Optional NICE:
  `chart_annotate` the verdict on-chart; Critic per-cell rerun loop.)

---

## 📍 session 5 (2026-06-04) — Phase 5 rehearsal DONE + caveats

Ran the **full pipeline live, cold, on a brand-new video** `pCmJ8wsAS_w`
("Bollinger Bands + RSI" mean reversion) — all 6 stages succeeded on the first pass
(clean compile on attempt 1). 9-cell matrix recorded; **1/9 beat same-cell B&H**
(honest SKIP). Two strategy *types* now proven end-to-end (mechanical price-action +
indicator mean-reversion). See the Phase 5 entry below for the full trace.

### ⚠ Known caveats — before calling the pipeline "production-ready"

These are the honest limits of what "the pipeline works" currently covers. Keep them
visible; do not let the two clean demo runs imply more than they prove.

1. **The compile-fix loop has never been exercised by a *real* generation failure.**
   Both demo videos compiled on the **first attempt**, so the 5-iteration repair loop
   and the fallback path have only ever been *force-triggered* (the deliberate
   broken-Pine test in session 4), never tripped by a genuinely messy LLM generation.
   This is the part most likely to surprise us on a harder/longer/odder video. ACTION
   to close: run on one deliberately *hard* video and watch the repair loop actually
   repair.
2. **"Works well" = works well on clean, mechanical, indicator-based strategies.**
   BB+RSI and the 3-step price-action video both reduce to rules. Discretionary
   strategies (e.g. the ICT killzone video) lean heavily on Resolver substitutions and
   we *omitted* the discretionary parts (RSI-divergence here) because they aren't
   mechanizable. Output quality is bounded by how codeable the source strategy is, and
   by the Resolver's guesses (all surfaced in `assumptions[]`, never silent).
3. **A few manual touchpoints remain — it's a great demo, not yet one-command.**
   TradingView must be launched in debug mode (skill `tradingview-debug-launch`),
   transcript fetch needs Firefox cookies (yt-dlp app-bound-cookie limitation), and the
   ticker×TF matrix sweep is agent-driven rather than a single command.
4. **Verdict is a backtest verdict, not investment advice.** Each cell is compared only
   to its own same-cell buy-and-hold (windows differ per TF). No commissions/slippage
   modeled; `default_qty=100% equity` is a baseline, not a realistic sizing model.

Framing for the demo/README: *"proven end-to-end on two strategy types"*, NOT
*"production-ready"* — mainly because error-recovery hasn't met a real-world failure yet.

---

## 📍 (prior) session 3

**Session-3 progress (results recording + security audit + first commit):**
- Added **results recording as a first-class pipeline step** (the key deliverable):
  `src/results_log.js` (canonical JSON source-of-truth + auto-regenerated MD table,
  fraction→%, epoch→ISO, net-vs-B&H verdict), `src/record_result.js` CLI for CLI-agent
  mode, wired into `src/harness.js`, `npm run record` + `npm run check` added.
  Verified: `npm run check` passes; r0/r1/r2 of the XAUUSD strategy logged to
  `cache/results_log.{json,md}`.
- **Security audit for public release — PASSED.** No hardcoded secrets (all keys via
  `process.env`; `.env.example` empty). `.gitignore` confirmed (via `git check-ignore`)
  to exclude `.env`, `.claude/settings.local.json`, `cache/`. Fixed: removed Windows
  username from absolute paths in todo/lessons; made SessionStart hook portable via
  `$env:CLAUDE_PROJECT_DIR` (was hardcoded `C:\Users\...`).
- **Initial git commit** `92511bf` on `master` (35 files). Repo not yet pushed public.
- ⚠ Open before publishing: confirm GitHub default branch; decide whether to keep
  `memory/` (Claude persistent notes — currently clean & committed) public.

---

**Status:** Phase 0 PASSED. Phase 1 PROVEN end-to-end. **Phase 2 (Pine generation +
compile loop + §8 strategy_store persistence) COMPLETE** (code + self-test; `npm run check`
green). **Phase 3 MUSTs COMPLETE** — 24-cell ticker×TF matrix run live, all recorded (3/24 beat
B&H → honest skip). **Supported path = CLI-agent mode (Claude Code + Codex); plain Node `npm start`
is PARKED** (see RESUME-HERE decision). Next: Phase 4 `ui_log` (MUST) + Phase 5 demo rehearsal.

**Session-2 progress:**
- Re-ran back-half clean (~6 calls, 0 dead-ends, ~56s) — confirms the hook/fast-path works.
- Proved symbol generalization: known-good EMA swept across NQ1!/ES1!/EURUSD/XAUUSD @60m.
- Phase 1 done on demo video `IgfJI34XcqU` (ICT London Killzone): transcript fetched +
  cached (`cache/transcripts/IgfJI34XcqU.txt`), Extractor → `cache/draft_spec.json`,
  Resolver → `cache/final_spec.json` (both validate). Transcript-fetch method recorded in
  lessons.md (yt-dlp + Firefox cookies + `--ignore-no-formats-error`).

**Next steps:**
1. (DONE) Cached + extracted a 2nd, mechanical demo video `e-QmGJU1XYc`.
2. **Phase 2 (IN PROGRESS — started session 2):** Pine Coder → generate `strategy()` from
   `cache/final_spec_e-QmGJU1XYc.json`; compile/fix loop (cap 5); fallback to
   `fallback/known_good.pine` on repeated failure.
   ⚑ CHECKPOINT: doing Phase 2 on a dedicated clean layout **"agent playground"**
   (URL Fq15xPyE, FX:XAUUSD 60m, only a Volume study — nothing to hide). Main layout
   (JOaU45wt) left untouched (its unsaved session sweeps were discarded, saved state intact).
   ⚠ LESSON: MCP `layout_switch`/`tab_switch` report success but DO NOT change the connected
   chart — must load layouts MANUALLY in the TradingView UI. MCP re-pins to the sole tab when
   others are closed.
3. Then Phase 3 backtest using the ticker×TF matrix.

---

### (prior) Phase 0 resume notes
**Status:** Phase 0 is **PASSED** — the TradingView back half is proven end-to-end across
5 timeframes. Safe to start Phase 1 (front-end).

**What shipped this session:**
- MCP results-read bug **fixed + loaded** in `<tradingview-mcp>/src/core/data.js`
  (`__findStrategy()` detection by `isTVScriptStrategy`; compact `summary` output, array-skip).
  The `tradingview` MCP server was reconnected, so the fix is live.
- Lessons captured in `tasks/lessons.md` (incl. ⏱ FAST-PATH CHECKLIST at top) and
  `tasks/runtime-checklist.md`. Backtest Runner prompt in `AGENTS.md` updated with the fast-paths.
- SessionStart hook added in `.claude/settings.json` to auto-load the checklist.

**FIRST STEPS AFTER RESTART (do these before Phase 1):**
1. Confirm the hook loaded: `/hooks` should list **1 SessionStart hook** (it auto-injects the
   fast-path checklist; if missing, the restart didn't pick up `.claude/settings.json`).
2. `mcp__tradingview__tv_health_check` → must be `api_available: true`. If it fails, relaunch
   via skill `tradingview-debug-launch` (see lessons.md: kill-all-first, confirm via 127.0.0.1
   not the localhost poll, allow 60–90s).
3. Then begin **Phase 1** below (transcript fetch → rule extraction). Pick ONE preselected
   deterministic-rule demo video first.

---

## Phase 0 — Prove the TradingView back-half works end-to-end (DO THIS FIRST)

- [x] **[MUST]** Launch TradingView Desktop in debug mode via skill `tradingview-debug-launch` (CDP port 9222, chart open). — already up; `tv_health_check` confirmed CDP connected.
- [x] **[MUST]** Confirm `mcp__tradingview__tv_health_check` → `api_available: true`. — PASS (FX:XAUUSD, 5m).
- [x] **[MUST]** Write a known-good EMA-cross strategy to `fallback/known_good.pine`. — pre-existing long-only EMA 20/50 w/ 2% stop / 3% target.
- [x] **[MUST]** `pine_set_source` the known-good script onto the chart. — PASS (had to `ui_open_panel pine-editor` first; editor must be open).
- [x] **[MUST]** `pine_smart_compile` it; confirm `pine_get_errors` is clean. — PASS (`has_errors:false`; only a severity-4 "v5 outdated, use v6" notice). NOTE: must then `pine_compile` to "Add to chart".
- [x] **[MUST]** Run `draw_shape` (a line + a text label) and `capture_screenshot` — confirm annotation works. — PASS (line + verdict text rendered; screenshot saved).
- [x] **[MUST]** Read `data_get_strategy_results` and `data_get_trades` — confirm real numbers come back. — **FIXED**: scraper detected strategies by `is_price_study===false`, but overlay strategies are price studies; corrected to `isTVScriptStrategy===true` + prefer non-empty `reportData()` (shared `__findStrategy()` in `tradingview-mcp/src/core/data.js`). Verified via `ui_evaluate`: picks our strategy, returns 8 metrics incl. buyHold benchmark (real: +82.9% net, 182 trades, 37.9% win; buy-and-hold +141%). Needs MCP server reconnect to load the patched module.
- [x] **[GATE]** Resolve the results-read break before building the front-end. — DONE (fix applied in local MCP server `data.js`). **Action required: reconnect the `tradingview` MCP server** so the running process loads the patched module, then re-run `data_get_strategy_results` to confirm `metric_count > 0`.
- [x] **[MUST]** Prove the chain across MULTIPLE timeframes, not just 5m. — DONE. Added strategy once, swept `chart_set_timeframe` 5/15/30/60/240, read compact results each. All 5 returned real numbers + buy-and-hold benchmark. Results (FX:XAUUSD EMA20/50, net% vs B&H%): 5m −1.5% vs −13.2% (beats); 15m +43.0% vs +33.8% (beats); 30m +82.5% vs +117.6% (loses); 1h +82.9% vs +140.0% (loses); 4h +38.5% vs +166.5% (loses). KEY CAVEAT: each TF backtests a different time window (5m≈3.5mo … 4h≈13yr) — compare only vs same-TF benchmark, never net% across TFs. See lessons.md.
- [x] **[GATE]** Phase 0 PASSED — full back half proven end-to-end (health → set_source → compile → add-to-chart → compact results + benchmark → annotate), across all 5 timeframes, with the results-read MCP bug fixed. Cleared to build the front-end (Phase 1).

---

## Phase 1 — Front-end: transcript + rule extraction

- [x] **[MUST]** `transcript_fetch`: YouTube URL → transcript text, with disk cache under `cache/transcripts/`. — DONE via yt-dlp manual-cache path (anon + Chrome cookies are blocked; Firefox cookies + `--ignore-no-formats-error` works). VTT→clean dedup .txt. See lessons.md "Transcript fetch".
- [x] **[MUST]** Preselect 1–2 deterministic-rule demo videos; cache their transcripts now. — Cached TWO: `IgfJI34XcqU` ("15-min London killzone", ICT — *discretionary* SMC, Resolver stress-test) and `e-QmGJU1XYc` ("3-step price-action formula" — *mechanical*: market-structure BOS + supply/demand zones + 2.5R filter, the clean demo). Both extracted+resolved: specs in cache/ (`*_e-QmGJU1XYc.json` for video 2). Extract→resolve→validate for video 2 took ~66s.
- [x] **[MUST]** `spec_schema`: define + validate the Strategy Spec (TECHNICAL.md §3). — pre-existing `src/spec_schema.js`; validated both draft + final specs.
- [x] **[MUST]** `rule_extract`: Strategy Extractor agent → Strategy Spec JSON. — DONE (CLI-agent mode); `cache/draft_spec.json`, validates.
- [x] **[MUST]** Ambiguity Resolver pass: concretize vague rules, populate `assumptions[]`. — DONE; `cache/final_spec.json` (4 indicators, 2 entries, 3 exits, 13 assumptions w/ each SMC substitution documented), validates.
- [ ] **[NICE]** Show extracted rules + assumptions in the UI as they appear.

---

## Phase 2 — Pine generation + compile loop  ✅ COMPLETE (session 4)

- [x] **[MUST]** `pine_generate`: Pine Coder agent → PineScript v5 `strategy()` source. — `src/pine_generate.js`; validates `//@version=5` + `strategy(`, then deterministically stamps the canonical title via `applyCanonicalTitle`.
- [x] **[MUST]** `compile_loop`: Compile/Fix agent loop (`pine_set_source` → `pine_smart_compile` → `pine_get_errors` → repair), cap 5 iterations. — `src/compile_loop.js`; now strips markdown fences off each LLM repair and re-stamps the title after a fix.
- [x] **[MUST]** Fallback path: on repeated failure, load `fallback/known_good.pine` and continue. — in `compile_loop.js`; fallback is set-source-only, **never** saved under `QI · ` (§7/§8).
- [x] **[MUST]** `strategy_store`: persist each clean candidate as its own saved script — `pine_new` → canonical `strategy()` title `QI · {SYMBOL} · {slug} · r{rerun}` → on clean compile `pine_save` (TECHNICAL.md §8). Each Critic rerun = a new slot, not a version bump. — `src/strategy_store.js` (pure helpers: `bareSymbol`/`slugify`≤24/`canonicalName`/`applyCanonicalTitle`/`isQiScriptName`); persist sequence (new→set→compile→check→save, returns `saved_name`) implemented in `compile_loop.js`; adapter gained `pineNew`/`pineSave`/`pineListScripts`/`pineOpen` stubs.
- [x] **[NICE]** Stream compile attempts + error messages to the UI log. — `compileAndFix({…, log})` emits per-iteration "Compile attempt n/5", "Compile errors", "Strategy saved", "Compile fallback" steps.

**Verification:** `src/strategy_store.test.js` (run by `npm run check`) asserts the naming
contract (bareSymbol/slugify cap+trailing-dash/canonicalName/isQiScriptName), title
stamping (positional + `title=` named forms, idempotent, throws when absent), and the §8
persist sequence against a mock adapter (exact call order `pineNew→set→compile→getErrors→save`,
`saved_name` returned, title injected). `npm run check` passes. NOTE: live MCP back-half
still runs in CLI-agent mode — the Node `harness.js` hits the MCP handoff (adapter.available
false) and stops after writing artifacts; the compile/persist code is exercised by the
mock-adapter test and is ready for the agent to drive against real `mcp__tradingview__*` tools.

---

## Phase 3 — Backtest + results  ✅ MUSTs COMPLETE (session 4 — full 24-cell matrix run live)

- [x] **[MUST]** `backtest_run`: `chart_set_symbol` + `chart_set_timeframe` from spec. — DONE live: added the r0 strategy to the agent-playground chart ONCE, then swept symbol (outer) × TF (inner); both auto-recompute, 0 dead-ends.
- [x] **[MUST]** Sweep a **ticker × timeframe matrix**: tickers from a start-of-run user prompt (default NQ1!, ES1!, EURUSD, XAUUSD; store exchange-qualified) × timeframes 5m/15m/30m/1h/4h/1d. Add strategy ONCE, loop symbol (outer) × TF (inner) — both auto-recompute. Compare each cell only to its own same-symbol/same-TF buy-and-hold. — DONE: full **4×6 = 24 cells** swept live 2026-06-04 (user picked default-4 × full-6). Strategy = `QI · XAUUSD · 3step-priceaction · r0` (video e-QmGJU1XYc). **Result: 3/24 cells beat their same-cell B&H** — XAUUSD@5m (−1.08% vs −13.64%), EURUSD@5m (+0.03% vs −0.78%), EURUSD@4h (+1.58% vs −16.2%); all 3 "wins" are cases where the market itself fell and the strategy stayed flatter. In every trending/up window it badly trails B&H. Honest verdict: the strategy does NOT generalize — it's a low-activity, small-net mean-reversion-ish system that loses to buy-and-hold across instruments/TFs.
- [x] **[MUST]** `results_read`: `data_get_strategy_results` + `data_get_trades` → verdict numbers. — DONE via `data_get_strategy_results` per cell (compact summary + embedded buyHold benchmark). Per-cell `data_get_trades` not pulled (24 cells; net/PF/win/DD/trades/window sufficed for the verdict).
- [x] **[MUST]** `results_log`: record EVERY backtest run to a canonical store — `src/results_log.js`
  (append-only `cache/results_log.json` = source of truth; auto-regenerates `cache/results_log.md`).
  `summarizeResults()` extracts net%/B&H%/PF/win%/maxDD/sharpe/trades/window from a raw
  `data_get_strategy_results` payload (fractions→%, epoch→ISO) + net-vs-B&H verdict. Wired into
  `harness.js` (after backtest+critic); CLI `node src/record_result.js --results <raw.json> --source
  --run --symbol --timeframe --verdict` for CLI-agent mode. `npm run check` covers all three files.
  Verified: recorded this session's r0/r1/r2. RESULTS RECORDING IS THE KEY DELIVERABLE OF THE PROCESS.
  **Session 4: all 24 matrix cells recorded** via `cache/record_matrix.mjs` (one-off, gitignored; feeds each
  captured cell through the tested `summarizeResults`/`recordResult` path). `cache/results_log.{json,md}` now
  holds 3 (session-3 r0/r1/r2) + 24 (matrix) = 27 rows.
- [x] **[MUST]** Compute buy-and-hold benchmark over the same range (`data_get_ohlcv`) and show side by side. — DONE: each cell uses the strategy report's embedded `buyHoldReturnPercent` (same exact backtest window as the strategy) — no separate OHLCV math needed; shown in the `B&H %` + `net vs B&H` columns of results_log.md.
- [ ] **[NICE]** Critic self-improvement loop: revise spec + rerun up to 2× if it loses to benchmark.
- [ ] **[CUT]** Live trading / paper accounts / portfolio.

---

## Phase 4 — Annotate + UI  ✅ MUST + web-view NICE DONE (session 4)

- [ ] **[NICE]** `chart_annotate`: `draw_shape` key levels + verdict text; `capture_screenshot`. — still open (only NICE left in Phase 4).
- [x] **[MUST]** `ui_log`: streaming log of every step (rules → code → compile → results → verdict). — `src/ui_log.js`: `uiLog(step, detail, {level})` appends a JSONL event to `cache/run_log.jsonl` AND echoes to the terminal; `startRun()` truncates for a fresh run. Satisfied via the watchable web view below (user chose web view over a plain terminal logger; the agent's own session narration already covers live terminal output).
- [x] **[NICE]** Minimal web view tailing the event stream. — `web/index.html` (self-contained, zero-dep) + `src/ui_server.js` (zero-dep static server, `npm run ui` → http://127.0.0.1:4321). Polls every 2s: left pane = live run stream (colored by level, auto-scroll), right pane = color-coded results matrix (net vs same-cell B&H) + beats/loses summary. **Columns are click-to-sort** (▲/▼ indicator; numeric/TF start high→low, text A→Z; TF sorts by real minutes incl. D/W/M; nulls always sink; sort persists across the 2s poll). Verified live: page/results/stream all HTTP 200. Stream seeded from the real 24-cell run via `cache/seed_run_log.mjs`.
- [ ] **[CUT]** Multi-symbol batch backtests.

**How to run the UI:** `npm run ui`, then open http://127.0.0.1:4321. It reads `cache/results_log.json`
(canonical results) and `cache/run_log.jsonl` (live step stream). Future runs: call `startRun()` once then
`uiLog(...)` per step (or regenerate the stream from the results log via `cache/seed_run_log.mjs`).

---

## Phase 5 — Demo polish

- [x] **[MUST]** Rehearse the exact end-to-end sequence on the preselected video(s). — **DONE (session 5, live full pipeline on a NEW video `pCmJ8wsAS_w`, "Bollinger Bands + RSI" mean reversion).** Ran all 6 stages cold: transcript fetch (yt-dlp+Firefox, 1292 words) → Extractor `draft_spec_pCmJ8wsAS_w.json` → Resolver `final_spec_pCmJ8wsAS_w.json` (basis-exit + Bollinger-bandwidth squeeze filter + 2*ATR stop; RSI-divergence intentionally omitted as discretionary) → Pine Coder `generated_strategy_pCmJ8wsAS_w.pine` → **clean compile on the FIRST attempt** (only severity-4 v5 notice) → pine_save as `QI · XAUUSD · bollinger-bands-rsi-mean · r0` → add-to-chart once → swept 9 cells (XAUUSD×{5,15,30,60,240,D} + EURUSD/NQ1!/ES1!@60) → recorded all to `cache/results_log.{json,md}` (via `cache/record_phase5.mjs`) + streamed to `cache/run_log.jsonl` → annotated verdict line+text on XAUUSD 60m → screenshot `phase5_pCmJ8wsAS_w_verdict.png`. **Result: 1/9 beat same-cell B&H** (only XAUUSD@5m, a falling window). Honest verdict: the strategy loses to buy-and-hold on trending instruments; it's least-bad on ranging FX (EURUSD@60: +7.82% vs +10.43%, the only positive-Sharpe cell) — shorting a trend is the killer → SKIP. Pipeline itself works flawlessly end-to-end.
- [x] **[MUST]** Verify `tv_health_check` is part of the pre-run checklist. — confirmed: it's the SessionStart fast-path + step 1 of every run; `api_available:true` verified live this session before the matrix + fallback tests.
- [x] **[MUST]** Confirm fallback PineScript triggers cleanly if live generation fails. — **PROVEN LIVE (session 4).** Forced a failure: injected broken Pine (`ta.emaa`, bad syntax) → `pine_get_errors` returned 2 real severity-8 errors (the loop's failure trigger). Then loaded `fallback/known_good.pine` → compiled clean (only severity-4 v5 notice) → auto-applied to chart → produced a real backtest: **net +43.15% vs B&H +33.09%, 213 trades, PF 1.55, Sharpe 0.70** (XAUUSD 15m). Fallback recovers the demo with working numbers. (Side note: the fallback is named "Quant Intern Known Good EMA Cross" — NOT under `QI ·`, so it never collides with generated candidates per §8.)
- [x] **[MUST]** Confirm benchmark always renders next to results. — confirmed: every cell uses the report's embedded `buyHoldReturnPercent` (same exact window); shown in `results_log.md` (`B&H %` + `net vs B&H` cols) AND the web view (B&H column + beats/loses pill + summary).
- [ ] **[NICE]** Tighten ~2 min demo script (paste URL → rules → compile → backtest → verdict → annotation).

---

## Review

- 2026-06-04: Added option-1 local workflow-agent scaffold: Node CLI harness,
  prompt files, Strategy Spec validation, transcript-cache lookup, Pine generation,
  fallback EMA-cross Pine, repo-local Quant Intern skill instructions, and a CDP
  health probe. TradingView Desktop CDP is reachable on port 9222. The intended
  `mcp__tradingview__*` tools are still not exposed to this Codex runtime, so the
  back half remains a handoff point until MCP is wired.
