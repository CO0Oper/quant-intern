---
name: quant-intern
description: Run or extend the Quant Intern local workflow agent that turns a YouTube trading-strategy video or cached transcript into a Strategy Spec, PineScript v5 strategy, TradingView MCP backtest, buy-and-hold comparison, chart annotation, and demo artifacts. Use when the user asks to run Quant Intern, package the workflow as a skill, process a YouTube trading strategy, generate PineScript from a transcript, validate TradingView MCP availability, or build this hackathon agent pipeline.
---

# Quant Intern

Use this skill as a local, user-triggered workflow agent. It is not a hosted VPS agent.

## Workflow

1. Check local TradingView Desktop CDP health:
   `npm run tv:health`
2. Fetch transcript from `cache/transcripts/<youtube-id>.txt` or use `--transcript <path>`.
3. Run the front-half agents:
   Extractor -> Ambiguity Resolver -> Pine Coder.
4. Use only `mcp__tradingview__*` tools for the back half:
   compile/fix -> set symbol/timeframe -> read backtest -> read trades/OHLCV -> annotate -> screenshot.
5. Compare strategy results with buy-and-hold before giving a verdict.

## Commands

Run the local harness:

```bash
npm start -- --video <youtube-url> --transcript <path> --symbol FX:XAUUSD --timeframe 60
```

Set these environment variables before running front-half agents:

```bash
ANTHROPIC_API_KEY=<key>
ANTHROPIC_MODEL=<available-claude-model>
```

## Guardrails

- Do not hand-roll TradingView chart control in CDP for compile, backtest, or annotation.
- Direct CDP access is allowed only for health checks and discovering whether TradingView Desktop is reachable.
- If `mcp__tradingview__*` tools are unavailable, stop after writing `cache/final_spec.json` and `cache/generated_strategy.pine`.
- Keep generated PineScript v5 only, with `strategy()`, not `indicator()`.
- Record every ambiguous strategy interpretation in `assumptions[]`.
