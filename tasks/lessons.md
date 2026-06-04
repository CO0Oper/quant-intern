# Quant Intern — Lessons

This file captures correction patterns per the self-improvement-loop convention
(`../../instructions.txt` §3). After ANY correction from the user or a mistake we
catch ourselves, add a short, actionable lesson here so we don't repeat it. Review
this file at the start of each session.

## ⏱ FAST-PATH CHECKLIST — read FIRST (these cost the most wall-clock last run)

These are the time-sinks observed in the first end-to-end run, with the fast path to
avoid them. Follow them on every back-half run — do not rediscover them.

1. **Add-to-chart: click the title button directly.** `pine_compile`/`ui_click` keep
   clicking "Save" because the editor's add button has ONLY `title="Add to chart"`
   (no text/aria/data-name). Skip the guesswork: `ui_evaluate` →
   `document.querySelector('button[title="Add to chart"]').click()`. (Last run this
   cost ~7 tool calls + 2 screenshots before we found it.)

2. **Don't spam `data_get_strategy_results`.** Empty results have THREE causes, in order:
   (a) no strategy on the chart → check `chart_get_state.studies[]` first;
   (b) a blocking "Save script" modal → dismiss it (`ui_click text "Save"`);
   (c) async recompute after add/timeframe-change → read EXACTLY ONCE more.
   Diagnose the cause; do not retry the same call 4+ times.

3. **Add the strategy ONCE, then sweep timeframes.** `chart_set_timeframe` auto-
   recomputes the strategy — never re-inject/re-compile/re-add per TF. (1st read after
   each TF change is usually empty → one retry.)

4. **Never dump raw `reportData` (~600KB → context overflow).** Use the patched compact
   `summary`. If editing the server, keep the array-skip in `getStrategyResults`.

5. **Batch ALL `data.js` edits, then ONE `/mcp` reconnect.** ES modules are cached;
   the running server won't see edits until reconnect. Verify logic against the live
   page with `ui_evaluate` BEFORE asking the user to reconnect, so one reconnect suffices.

6. **Post-update TradingView relaunch is slow & the poll lies.** The skill's readiness
   poll hits `http://localhost:9222` (→ IPv6 `::1`) but DevTools binds IPv4 `127.0.0.1`,
   so it can time out while CDP is actually UP. First launch after an update also takes
   ~60–90s (finishing the update). Don't trust the poll — confirm with `tv_health_check`
   or `Get-NetTCPConnection -LocalPort 9222`, and fully kill all instances before
   relaunch (single-instance lock drops the debug flag otherwise).

## Lessons

- **Verify `tv_health_check` and a full compile → backtest → read cycle before
  building anything else** — the TradingView MCP links are the fragile ones. Per the
  Codex audit, if the back half isn't proven working today, the project can consume
  the whole hackathon. Prove the back half first, then build the front-end.

- **The Pine editor must be OPEN before `pine_set_source`/`pine_new`** — otherwise
  they error "Could not open Pine Editor." Call `ui_open_panel pine-editor open` first.

- **Compiling ≠ applying.** `pine_smart_compile` only Saves; you must then call
  `pine_compile` to "Add to chart" so the strategy actually backtests. Confirm via
  `chart_get_state` that the strategy appears in `studies[]`.

- **`pine_get_errors` reports a severity-4 "v5 outdated, use v6" notice as an "error".**
  It is informational, not a compile failure — trust `pine_smart_compile`'s
  `has_errors:false`. (Consider generating //@version=6 to silence it.)

- **A "Save script" modal can block the chart after add-to-chart** — dismiss it
  (`ui_click text Save`) or data tools stall. Watch for blocking modals generally.

- **FIXED (2026-06-04): `data_get_strategy_results` / `data_get_trades` / `data_get_equity`
  returned empty / "No strategy found on chart" even though the Strategy Tester UI
  showed numbers.** ROOT CAUSE (not the relocated menu): the scraper detected strategies
  by `metaInfo().is_price_study === false`, but a Pine `strategy(overlay=true)` IS a
  price study (`is_price_study === true`), so it was never matched. The correct signal
  is `metaInfo().isTVScriptStrategy === true`. Also, multiple strategies can be on the
  chart and only the one selected in the Strategy Tester has a computed (non-empty)
  `reportData()`. FIX: added a shared `__findStrategy()` in
  `<tradingview-mcp>/src/core/data.js` that selects
  `isTVScriptStrategy === true` AND prefers the one with non-empty `reportData()`
  (falls back to the first strategy). Verified against the live page via `ui_evaluate`:
  correctly picks our strategy, returns 8 metrics incl. `buyHold`/`buyHoldPercent`
  (benchmark comes free). **The running MCP server caches the old module — reconnect
  the `tradingview` MCP server (e.g. `/mcp` → reconnect) for the tool to use the fix.**
  LESSON: detect strategies by `isTVScriptStrategy`, never by `is_price_study`.

- **`data_get_strategy_results` raw `reportData()` is HUGE (~600KB) — it embeds full
  equity-curve arrays (`buyHold`, `buyHoldPercent`, `filledOrders`, `trades`, hundreds
  to thousands of bars each), which overflows the context window.** FIX (2nd patch in
  `data.js`): skip array-valued fields when copying, and add a flattened `summary`
  (netProfit, netProfitPercent, profitFactor, percentProfitable, totalTrades, win/loss
  counts, maxDrawDownPercent, sharpe/sortino, and `buyHoldReturnPercent` = the benchmark
  as a scalar) plus `strategy_name`. Output drops ~603KB → ~3.8KB. The buy-and-hold
  benchmark is available as a scalar from `performance.buyHoldReturnPercent` — no need
  to compute it separately from OHLCV. (For the full equity curve, use `data_get_equity`,
  which is opt-in.) Both fixes require an MCP server reconnect to load.

- **TradingView desktop updates change the WindowsApps path** (version-stamped, e.g.
  `..._3.1.0.7818_...` → `..._3.2.0.7916_...`) AND relaunch the app WITHOUT the CDP
  debug flag, so `tv_health_check` fails after an update. Re-launch via the
  `tradingview-debug-launch` skill (resolves the path with `Get-AppxPackage`, never
  hardcoded; kills all instances first because of the single-instance lock). NOTE: the
  skill's readiness poll hits `http://localhost:9222` which can resolve to IPv6 `::1`
  while DevTools binds IPv4 `127.0.0.1` only — the poll may time out even though CDP is
  up. Confirm with `tv_health_check` (or curl `http://127.0.0.1:9222/json/version`)
  rather than trusting the poll. First launch after an update is also slow (finishing
  the update), so allow extra time.

- **Each timeframe backtests a WILDLY different time window** (TradingView caps how many
  intraday bars it loads), so net % is NOT comparable across timeframes. Observed for the
  known-good EMA strategy on FX:XAUUSD: 5m ≈ 3.5 months, 15m ≈ 11 months, 30m ≈ 2.4 yr,
  1h ≈ 3.4 yr, 4h ≈ 13 yr. CONSEQUENCE: only ever compare the strategy to the
  buy-and-hold benchmark **within the same timeframe** (the `buyHoldReturnPercent` the
  tool returns IS over that TF's exact window, so it is a fair comparison). Do NOT rank a
  strategy's quality by comparing its 5m net% to its 4h net% — they cover different eras.
  The harness/Critic must read `metrics.settings.dateRange` and state the window alongside
  every result.

- **The strategy auto-recomputes when you change timeframe** — add the strategy to the
  chart ONCE, then loop `chart_set_timeframe` → `data_get_strategy_results`. No need to
  re-add/re-compile per TF. Recompute is async: the first read after a TF change often
  returns empty `summary` — read again once and it populates.

- **The Pine editor "Add to chart" button has only a `title` attribute** (no text, no
  aria-label, no data-name), so `ui_click`/`pine_compile` button detection misses it and
  clicks "Save" instead (study never gets added). Reliable add-to-chart:
  `ui_evaluate` → find `button[title="Add to chart"]` → `.click()`. (TODO: teach the MCP
  server's `pine_compile` to match by `title="Add to chart"`.)

- **TEST ACROSS MULTIPLE TIMEFRAMES, not just one.** Phase 0 was proven only on 5m.
  The harness sets the timeframe from the spec, and a strategy's compile-validity,
  trade count, and results all change per interval (low TFs can hit TradingView's
  bar-count/trade limits; high TFs may produce too few trades to be meaningful).
  Before trusting the back half, run the same compile → apply → read cycle on the
  full demo set: **5m, 15m, 30m, 1h, 4h** (via `chart_set_timeframe` "5"/"15"/"30"/
  "60"/"240"). Confirm each: clean compile, strategy appears in `studies[]`, results
  populate, and benchmark buy-and-hold is computed over that interval's visible range.
  (Blocked until the results-read break above is fixed — multi-TF results can't be
  read programmatically yet.)

- **The strategy also auto-recomputes when you change SYMBOL** (verified 2026-06-04):
  add once, then loop `chart_set_symbol` (outer) × `chart_set_timeframe` (inner) to
  sweep a ticker×TF matrix. First read after a symbol switch is reliable (no empty-retry
  needed in practice). Cross-ticker @60m for the known-good EMA20/50: XAU +82.9% / NQ1!
  +36.4% / ES1! +16.6% / EURUSD +3.0% — all LOSE to same-symbol buy-and-hold in the
  2023→25 bull run (expected for a long-only trend follower; degrades as vol drops:
  gold>indices>FX, Sharpe 0.42→−0.06). Store symbols exchange-qualified in the spec
  (CME_MINI:NQ1!, FX:EURUSD) so a run is deterministic. Restore the chart to its
  original symbol when done.

- **Transcript fetch (Phase 1) — YouTube blocks anonymous + Chrome-cookie access; use
  yt-dlp with Firefox cookies (2026-06-04).** What FAILS: WebFetch on transcript sites
  (youtubetotranscript/ytscribe/pickscribe) → 403 or JS-only "Loading..." shells;
  `youtube-transcript-api` → `RequestBlocked` (IP block); yt-dlp anonymous → "Sign in to
  confirm you're not a bot"; yt-dlp `--cookies-from-browser chrome` → "Failed to decrypt
  with DPAPI" (Chrome v127+ app-bound cookie encryption, yt-dlp issue 10927); edge →
  "Could not copy Chrome cookie database". What WORKS:
  `python -m yt_dlp --cookies-from-browser firefox --ignore-no-formats-error
   --skip-download --write-subs --write-auto-subs --sub-langs "en.*" --sub-format vtt
   -o "cache/transcripts/%(id)s.%(ext)s" "<watch-url>"`.
  Firefox cookies aren't app-bound so they decrypt; `--ignore-no-formats-error` is REQUIRED
  (no JS runtime installed → "Requested format is not available" aborts before subs write).
  Then convert VTT→clean text: drop WEBVTT/Kind/Language headers, `-->` lines, blank lines,
  and any line containing `<` (the inline-timestamp duplicate rows), then dedup consecutive
  repeats and collapse whitespace. (Prereqs: `pip install yt-dlp`; user must be logged into
  YouTube in Firefox. The claude-in-chrome browser extension was NOT connected this session.)
