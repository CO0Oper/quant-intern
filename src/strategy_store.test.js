// Self-test for the Phase 2 naming + persist contract. Pure/mock only — no MCP,
// no network — so `npm run check` can prove §8 without a live chart.
import assert from "node:assert/strict";
import {
  bareSymbol,
  slugify,
  canonicalName,
  isQiScriptName,
  applyCanonicalTitle
} from "./strategy_store.js";
import { compileAndFix } from "./compile_loop.js";

// --- naming -----------------------------------------------------------------
assert.equal(bareSymbol("FX:XAUUSD"), "XAUUSD");
assert.equal(bareSymbol("xauusd"), "XAUUSD");
assert.equal(bareSymbol(""), "UNKNOWN");

assert.equal(slugify("EMA cross + RSI filter"), "ema-cross-rsi-filter");
assert.equal(slugify("  --weird__Title!!  "), "weird-title");
assert.equal(slugify("x".repeat(40)).length <= 24, true);
assert.equal(/-$/.test(slugify("a ".repeat(20))), false, "no trailing dash after cap");
assert.equal(slugify(""), "strategy");

assert.equal(
  canonicalName({ symbol: "FX:XAUUSD", title: "ema rsi scalp", rerun: 0 }),
  "QI · XAUUSD · ema-rsi-scalp · r0"
);

assert.equal(isQiScriptName("QI · XAUUSD · x · r0"), true);
assert.equal(isQiScriptName("Some User Script"), false);

// --- title stamping ---------------------------------------------------------
const NAME = "QI · XAUUSD · demo · r1";

const positional = '//@version=5\nstrategy("Old Title", overlay=true)\nplot(close)';
assert.match(applyCanonicalTitle(positional, NAME), /strategy\("QI · XAUUSD · demo · r1", overlay=true\)/);

const named = '//@version=5\nstrategy(overlay=true, title="Old Title")\nplot(close)';
assert.match(applyCanonicalTitle(named, NAME), /title="QI · XAUUSD · demo · r1"/);

// idempotent: re-stamping yields the same name
const once = applyCanonicalTitle(positional, NAME);
assert.equal(applyCanonicalTitle(once, NAME), once);

assert.throws(() => applyCanonicalTitle("//@version=5\nplot(close)", NAME), /strategy\(\) title/);

// --- §8 persist sequence (mock adapter, clean first compile = no LLM call) ---
const calls = [];
let injected = null;
const mockAdapter = {
  async pineNew(arg) { calls.push(["pineNew", arg?.kind]); },
  async pineSetSource({ source }) { calls.push(["pineSetSource"]); injected = source; },
  async pineSmartCompile() { calls.push(["pineSmartCompile"]); },
  async pineGetErrors() { calls.push(["pineGetErrors"]); return []; }, // clean
  async pineSave() { calls.push(["pineSave"]); }
};

const status = await compileAndFix({
  adapter: mockAdapter,
  source: '//@version=5\nstrategy("placeholder", overlay=true)\nstrategy.entry("L", strategy.long)',
  savedName: NAME
});

assert.equal(status.compiled, true);
assert.equal(status.fallback, false);
assert.equal(status.saved_name, NAME);
assert.equal(status.iterations, 1);
assert.match(injected, new RegExp(`strategy\\("${NAME.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
assert.deepEqual(
  calls.map((c) => c[0]),
  ["pineNew", "pineSetSource", "pineSmartCompile", "pineGetErrors", "pineSave"],
  "must be: new slot -> set -> compile -> check -> save"
);
assert.equal(calls[0][1], "strategy", "pineNew opens a strategy slot");

console.log("strategy_store.test.js: all assertions passed");
