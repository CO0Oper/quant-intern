# Quant Intern — Task List

Ordered, phased plan. Per the Codex audit, the fragile links are the TradingView MCP
ones — so we **prove the back half first**, then build the front-end that feeds it.
Legend: **[MUST]** = must-have, **[NICE]** = nice-to-have, **[CUT]** = out of scope.

---

## 📍 RESUME HERE (last updated 2026-06-04, session 2)

**Status:** Phase 0 PASSED. **Phase 1 (transcript → extract → resolve) now also PROVEN
end-to-end on a real video.** Next: Phase 2 (Pine generation + compile loop) using
`cache/final_spec.json`.

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

## Phase 2 — Pine generation + compile loop

- [ ] **[MUST]** `pine_generate`: Pine Coder agent → PineScript v5 `strategy()` source.
- [ ] **[MUST]** `compile_loop`: Compile/Fix agent loop (`pine_set_source` → `pine_smart_compile` → `pine_get_errors` → repair), cap 5 iterations.
- [ ] **[MUST]** Fallback path: on repeated failure, load `fallback/known_good.pine` and continue.
- [ ] **[MUST]** `strategy_store`: persist each clean candidate as its own saved script — `pine_new` → canonical `strategy()` title `QI · {SYMBOL} · {slug} · r{rerun}` → on clean compile `pine_save` (TECHNICAL.md §8). Each Critic rerun = a new slot, not a version bump.
- [ ] **[NICE]** Stream compile attempts + error messages to the UI log.

---

## Phase 3 — Backtest + results

- [ ] **[MUST]** `backtest_run`: `chart_set_symbol` + `chart_set_timeframe` from spec.
- [ ] **[MUST]** Sweep a **ticker × timeframe matrix**: tickers from a start-of-run user prompt (default NQ1!, ES1!, EURUSD, XAUUSD; store exchange-qualified) × timeframes 5m/15m/30m/1h/4h/1d. Add strategy ONCE, loop symbol (outer) × TF (inner) — both auto-recompute. Compare each cell only to its own same-symbol/same-TF buy-and-hold. (Cross-ticker @60m verified 2026-06-04: XAU +82.9% / NQ +36.4% / ES +16.6% / EUR +3.0% — all lose to B&H in the 2023→25 bull run.)
- [ ] **[MUST]** `results_read`: `data_get_strategy_results` + `data_get_trades` → verdict numbers.
- [x] **[MUST]** `results_log`: record EVERY backtest run to a canonical store — `src/results_log.js`
  (append-only `cache/results_log.json` = source of truth; auto-regenerates `cache/results_log.md`).
  `summarizeResults()` extracts net%/B&H%/PF/win%/maxDD/sharpe/trades/window from a raw
  `data_get_strategy_results` payload (fractions→%, epoch→ISO) + net-vs-B&H verdict. Wired into
  `harness.js` (after backtest+critic); CLI `node src/record_result.js --results <raw.json> --source
  --run --symbol --timeframe --verdict` for CLI-agent mode. `npm run check` covers all three files.
  Verified: recorded this session's r0/r1/r2. RESULTS RECORDING IS THE KEY DELIVERABLE OF THE PROCESS.
- [ ] **[MUST]** Compute buy-and-hold benchmark over the same range (`data_get_ohlcv`) and show side by side.
- [ ] **[NICE]** Critic self-improvement loop: revise spec + rerun up to 2× if it loses to benchmark.
- [ ] **[CUT]** Live trading / paper accounts / portfolio.

---

## Phase 4 — Annotate + UI

- [ ] **[NICE]** `chart_annotate`: `draw_shape` key levels + verdict text; `capture_screenshot`.
- [ ] **[MUST]** `ui_log`: streaming terminal log of every step (rules → code → compile → results → verdict).
- [ ] **[NICE]** Minimal web view tailing the event stream.
- [ ] **[CUT]** Multi-symbol batch backtests.

---

## Phase 5 — Demo polish

- [ ] **[MUST]** Rehearse the exact end-to-end sequence on the preselected video(s).
- [ ] **[MUST]** Verify `tv_health_check` is part of the pre-run checklist.
- [ ] **[MUST]** Confirm fallback PineScript triggers cleanly if live generation fails.
- [ ] **[MUST]** Confirm benchmark always renders next to results.
- [ ] **[NICE]** Tighten ~2 min demo script (paste URL → rules → compile → backtest → verdict → annotation).

---

## Review

- 2026-06-04: Added option-1 local workflow-agent scaffold: Node CLI harness,
  prompt files, Strategy Spec validation, transcript-cache lookup, Pine generation,
  fallback EMA-cross Pine, repo-local Quant Intern skill instructions, and a CDP
  health probe. TradingView Desktop CDP is reachable on port 9222. The intended
  `mcp__tradingview__*` tools are still not exposed to this Codex runtime, so the
  back half remains a handoff point until MCP is wired.
