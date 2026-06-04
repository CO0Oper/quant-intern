# TradingView back-half FAST-PATH (auto-loaded each session) -- detail in tasks/lessons.md

1. ADD-TO-CHART: click button[title="Add to chart"] via ui_evaluate (.click()).
   Do NOT rely on pine_compile / ui_click -- they hit "Save" (button has only a title attr).
2. DON'T SPAM data_get_strategy_results. Empty has 3 causes: (a) no strategy in
   chart_get_state.studies[]; (b) a blocking "Save script" modal (dismiss it);
   (c) async recompute after add / timeframe change. Diagnose, then retry ONCE.
3. ADD THE STRATEGY ONCE, then sweep timeframes -- chart_set_timeframe auto-recomputes.
   Never re-inject / re-compile / re-add per TF.
4. NEVER dump raw reportData (~600KB -> context overflow). Use the compact summary;
   keep the array-skip in getStrategyResults if editing the MCP server.
5. BATCH all data.js edits, then ONE /mcp reconnect (ES modules are cached). Verify
   logic via ui_evaluate against the live page BEFORE asking for the reconnect.
6. POST-UPDATE TradingView relaunch: don't trust the skill's localhost:9222 poll
   (IPv6 ::1 vs DevTools' IPv4 127.0.0.1). Confirm with tv_health_check / 127.0.0.1,
   allow 60-90s on first post-update launch, kill ALL instances first (single-instance
   lock drops the debug flag).

CAVEAT: each timeframe backtests a different time window -- compare a strategy ONLY to
its same-TF buyHoldReturnPercent, never net% across timeframes.
