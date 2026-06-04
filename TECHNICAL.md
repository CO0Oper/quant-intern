# Quant Intern — TECHNICAL.md

Concrete implementation instructions for the MVP. Read `quant_intern.md` (product
design, source of truth) and `../instructions.txt` (workflow conventions) first.

## 0. The single most important technical fact

**TradingView is NOT controlled by hand-rolled CDP/HTTP code.** It is controlled
through an **MCP server already connected in this environment**, exposing tools
named `mcp__tradingview__*` (e.g. `pine_set_source`, `pine_smart_compile`,
`pine_get_errors`, `pine_get_console`, `chart_set_symbol`, `chart_set_timeframe`,
`data_get_strategy_results`, `data_get_trades`, `draw_shape`, `capture_screenshot`,
`tv_health_check`).

Therefore the primary orchestration is a **CLI agent workflow**: run Claude Code or
Codex, invoke the Quant Intern skill, and let the agent call the available
`mcp__tradingview__*` tools. The optional Node harness is only a structured fallback
for direct API mode and artifact handling. It is **NOT** a standalone program that
reimplements chart control. Pine compilation, backtesting, and reading results are
**MCP tool calls**, not code we write.

So the "code" we actually write is only:
1. **YouTube transcript front-end** — fetch transcript, extract structured rules.
2. **Agent harness / prompts** — drive the MCP tools through the loop.
3. **A thin UI/log layer** — make the loop watchable for the demo.

## 1. Architecture split

```
┌─────────────────────────────────────────────────────────────────────┐
│ FRONT-END (code we write)                                            │
│   YouTube URL → transcript → structured Strategy Spec (JSON)         │
└─────────────────────────────────────────────────────────────────────┘
                              │ Strategy Spec
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ AGENT HARNESS (Claude Agent SDK + prompts, driving MCP tools)        │
│   spec → PineScript v5                                                │
│       → mcp__tradingview__pine_set_source                            │
│       → mcp__tradingview__pine_smart_compile                        │
│       → mcp__tradingview__pine_get_errors  ──┐ (loop: fix & retry)  │
│           ▲────────── autofix ───────────────┘                       │
│       → run backtest (set symbol/timeframe, compile applies strategy)│
│       → mcp__tradingview__data_get_strategy_results                 │
│       → mcp__tradingview__data_get_trades                           │
│       → mcp__tradingview__draw_shape  (annotate verdict on chart)   │
└─────────────────────────────────────────────────────────────────────┘
                              │ events/logs
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ WATCHABLE UI / LOG (code we write)                                   │
│   streams each step (rules, code, compile status, results, verdict)  │
│   so judges see the agent operate a real terminal                    │
└─────────────────────────────────────────────────────────────────────┘
```

## 2. The full chain — 7 links (CODE vs MCP)

| # | Link | Who does it | Tooling |
|---|------|-------------|---------|
| 1 | YouTube transcript fetch | **CODE** (lib) | youtube transcript library |
| 2 | Rule extraction | **Claude** (agent) | LLM reasoning → Strategy Spec JSON |
| 3 | PineScript generation | **Claude** (agent) | LLM → PineScript v5 `strategy()` |
| 4 | Compile + autofix (looped) | **MCP** | `pine_set_source` → `pine_smart_compile` → `pine_get_errors` → repair → repeat |
| 5 | Backtest run | **MCP** | `chart_set_symbol`, `chart_set_timeframe`, compile applies the strategy to the chart |
| 6 | Read results | **MCP** | `data_get_strategy_results`, `data_get_trades` |
| 7 | Annotate chart | **MCP** | `draw_shape` (levels, text verdict), `capture_screenshot` |

Links 1–3 are the front-end + LLM reasoning. Links 4–7 are **all MCP tool calls** —
the back half of the pipeline. The Critic loop (optional) re-enters at link 3/4 with
a revised spec when the backtest underperforms.

## 3. Structured Strategy-Spec schema

Output of rule extraction (link 2). Single canonical JSON contract between
front-end and harness.

```jsonc
{
  "source_video": "https://youtube.com/watch?v=...",
  "title": "EMA cross + RSI filter",
  "symbol": "FX:XAUUSD",          // default to current chart symbol if unstated
  "timeframe": "60",               // minutes (or "D", "W"); default if unstated
  "indicators": [
    { "name": "EMA", "params": { "length": 20 }, "alias": "fastEma" },
    { "name": "EMA", "params": { "length": 50 }, "alias": "slowEma" },
    { "name": "RSI", "params": { "length": 14 }, "alias": "rsi" }
  ],
  "entry_rules": [
    { "side": "long",  "condition": "crossover(fastEma, slowEma) and rsi > 50" },
    { "side": "short", "condition": "crossunder(fastEma, slowEma) and rsi < 50" }
  ],
  "exit_rules": [
    { "type": "opposite_signal" },
    { "type": "take_profit", "value": 3.0, "unit": "percent" }
  ],
  "stop": { "type": "stop_loss", "value": 2.0, "unit": "percent" },
  "sizing": { "type": "percent_of_equity", "value": 100 },
  "assumptions": [
    "Video said 'buy the dip' — interpreted as RSI>50 confirmation on EMA cross.",
    "No explicit timeframe — defaulted to 1h."
  ]
}
```

Rules for vague strategies: every guess goes in `assumptions` (shown in the UI).
Never silently invent — surface the default. This is the Ambiguity Resolver's job.

## 4. Recommended stack

- **Transcript:** a YouTube transcript library
  (`youtube-transcript-api` in Python, or `youtube-transcript` in TS). Cache to disk
  keyed by video ID so demo runs are offline-safe.
- **Orchestration:** Primary path is **CLI-agent mode** through Claude Code or Codex
  using the repo-local Quant Intern skill in `.codex/skills/quant-intern/`. The
  optional Node harness can run the front half directly when API credentials are set,
  but the back half still requires TradingView MCP tool calls.
- **UI / log:** keep it simple — a streaming terminal log is enough for MVP; a
  minimal web view (one page that tails the event stream) is the nice-to-have.

### Prerequisite before any run
1. Launch TradingView Desktop in debug mode (CDP, port 9222) via the skill
   **`tradingview-debug-launch`**, with a chart open.
2. Confirm `mcp__tradingview__tv_health_check` returns `api_available: true`
   **before** the harness does anything. If health fails, stop and relaunch — do
   not attempt the pipeline.

## 5. File / module layout (many small files, <200 lines, single-responsibility)

```
quant_intern/
  src/
    transcript_fetch.*     # link 1: video URL → transcript text (+ disk cache)
    rule_extract.*         # link 2: transcript → Strategy Spec (Claude prompt I/O)
    pine_generate.*        # link 3: Strategy Spec → PineScript v5 source string
    compile_loop.*         # link 4: pine_set_source/smart_compile/get_errors retry loop
    strategy_store.*       # link 4b: canonical naming + pine_new/pine_save of each candidate (§8)
    backtest_run.*         # link 5: chart_set_symbol/timeframe, apply strategy
    results_read.*         # link 6: data_get_strategy_results/data_get_trades → verdict
    chart_annotate.*       # link 7: draw_shape levels + verdict text, screenshot
    harness.*              # orchestrator: wires links 1→7, owns the Critic rerun loop
    ui_log.*               # event stream → terminal/web log
    spec_schema.*          # the Strategy Spec type/validator (section 3)
  prompts/                 # system prompts per agent (see AGENTS.md)
  cache/transcripts/       # cached transcripts (demo safety)
  fallback/known_good.pine # tested PineScript that always compiles (demo safety net)
  tasks/                   # todo.md, lessons.md
  TECHNICAL.md  AGENTS.md
```

Each `src/*` file = one link = one responsibility. The harness imports them; nothing
else cross-imports. Keep prompts out of code (in `prompts/`) so they're editable
without touching logic.

## 6. Setup, prerequisites, how to run

**Setup**
1. Start Claude Code or Codex from this repo.
2. Ensure the `tradingview` MCP server is registered in that CLI agent session.
3. Optional direct Node mode: set `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL`.

**Prerequisites (every session)**
1. Run skill `tradingview-debug-launch` → TradingView up on CDP port 9222, chart open.
2. `mcp__tradingview__tv_health_check` → must be `api_available: true`.

**Run (MVP happy path)**
```
Use Quant Intern on <youtube-url> with symbol FX:XAUUSD and timeframe 60.
```
The CLI agent: fetch transcript → extract spec → generate Pine → compile/fix loop →
set symbol/timeframe → read results → annotate → emit verdict to the UI log. Optional
Node front-half mode:

```
npm start -- --video <youtube-url> --transcript <path> --symbol FX:XAUUSD --timeframe 60
```

## 7. DE-RISKING (heavy emphasis — per design doc + Codex audit)

This pipeline has **~7 fragile links**; any one can break the live demo. Mitigations
are not optional:

- **Prove end-to-end FIRST.** Before building *any* front-end, run **one full back
  half**: take a simple known strategy (e.g. EMA cross), `pine_set_source` →
  `pine_smart_compile` → `pine_get_errors` (clean) → read `data_get_strategy_results`.
  If the back half doesn't work today, **stop** — per the audit, the project will
  otherwise consume the hackathon. This is Phase 0 in `tasks/todo.md`.
- **Preselect 1–2 deterministic-rule videos.** No arbitrary URLs on stage. Pick
  videos with clean, codeable rules (EMA cross, RSI threshold) — avoid "buy the dip"
  vibes for the demo.
- **Cache transcripts** to disk so a network hiccup can't kill the run.
- **Keep a known-good fallback PineScript** (`fallback/known_good.pine`) that always
  compiles. If generation/compile fails live, fall back to it and keep the demo moving.
- **Rehearse the exact sequence** end-to-end before presenting.
- **Always show vs buy-and-hold benchmark.** A backtest in isolation looks like
  cherry-picking; the benchmark makes the verdict objective. Compute buy-and-hold
  return over the same range and display side by side.
- **Confirm `tv_health_check` before every run.** If it fails, relaunch via the
  debug skill rather than pushing forward.

Order of operations is deliberately back-to-front: trust the fragile MCP links by
proving them first, then build the front-end that feeds them.

## 8. Strategy persistence & naming convention

**Problem.** `pine_set_source` overwrites a *single* editor buffer — last-write-wins.
Every generated candidate and every Critic rerun clobbers the previous one, so nothing
persists unless we explicitly save. There are two storage layers:

- **Editor buffer** — one active slot; `pine_set_source` replaces its contents.
- **Saved library** — per-account; each script is its own object
  (`USER;<id>`, `name`, `title`, `version`, `modified`). This is the "own storage"
  per strategy. The account already holds ~19 unrelated user scripts — do not collide.

**Lever.** A brand-new script (`pine_new`) saved with `pine_save` (Ctrl+S) takes its
library name from the `strategy("<title>")` **title argument in the source**. So the
canonical name lives in the Pine title: the Pine Coder sets it, the save inherits it —
no rename dialog needed.

**Canonical name** (deterministic — pure function of symbol × video × rerun):

```
QI · {SYMBOL} · {video_slug} · r{rerun}
```

- `QI · ` prefix — namespaces all our scripts; makes them filterable and safe to
  clean up without touching the ~19 pre-existing user scripts.
- `{SYMBOL}` — bare symbol, exchange stripped (e.g. `XAUUSD`, not `FX:XAUUSD`).
- `{video_slug}` — kebab slug of `spec.title`, ≤24 chars (e.g. `ema-rsi-scalp`).
- `r{rerun}` — Critic rerun index; `r0` = first pass, `r1`/`r2` = revisions.

Example: `QI · XAUUSD · ema-rsi-scalp · r0`

**Persist flow** (link 4b — runs inside link 4 after a clean compile):

1. `pine_new("strategy")` — fresh slot; never clobber an existing saved script.
2. `pine_set_source(<generated source whose strategy() title = canonical name>)`.
3. compile/fix loop → clean (`pine_get_errors` empty).
4. `pine_save` — persists the new slot under the title-derived canonical name.
5. Record `{ name, rerun }` in the run log / spec so the UI can list candidates.

**Reruns are NEW slots, not version bumps.** Each Critic iteration (`r0`, `r1`, `r2`)
saves as its own slot, so before/after candidates stay independently openable and
comparable side by side. (If you instead reuse one name, TradingView version-bumps a
single slot and the earlier candidate is no longer separately backtestable — we
deliberately avoid that.)

**Lookup / cleanup:**

- `pine_list_scripts` → filter `name.startswith("QI · ")` to enumerate only our
  generated strategies (ignore the pre-existing user library).
- `pine_open "<canonical name>"` to reload any candidate for a re-backtest.
- Demo hygiene: optionally remove stale `QI · …` slots before a run so the library
  stays clean.

The fallback (`fallback/known_good.pine`, §7) is exempt — it is loaded via
`pine_set_source` only and never saved under the `QI · ` namespace.
