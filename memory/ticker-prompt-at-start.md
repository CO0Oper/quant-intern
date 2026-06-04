---
name: ticker-prompt-at-start
description: Quant Intern backtest should sweep a ticker x timeframe matrix; ask user for tickers at run start
metadata:
  type: project
---

In the Quant Intern pipeline, the backtest step should sweep a **ticker × timeframe matrix**, not a single symbol/TF:
- **Tickers** — a user prompt at the START of a run (alongside the video URL), not hardcoded to FX:XAUUSD. Default test set: NQ1!, ES1!, EURUSD, XAUUSD. Store exchange-qualified (e.g. CME_MINI:NQ1!, FX:EURUSD) for determinism.
- **Timeframes** — sweep 5m, 15m, 30m, 1h, 4h, 1d for each ticker.

**Why:** The user explicitly wants the back-half tested across multiple instruments (different volatility profiles) AND across timeframes to prove the strategy generalizes, configurable per-run.

**How to apply:** Add strategy to chart ONCE as a study; loop `chart_set_symbol` (outer) × `chart_set_timeframe` (inner) — both auto-recompute first-read, ~0 dead-ends (verified 2026-06-04 across all 4 tickers @60m + 5 TFs @XAUUSD). Compare each matrix cell ONLY to its own same-symbol/same-TF buyHoldReturnPercent — each cell backtests a different time window. See [[runtime-checklist]] fast-path.
