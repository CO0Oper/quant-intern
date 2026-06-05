// Link 4b — strategy persistence & naming (TECHNICAL.md §8).
// A saved Pine script inherits its library name from the strategy("<title>")
// argument in the source. So the canonical name lives in the Pine title: the Coder
// sets it, pine_save inherits it. These helpers compute that name deterministically
// and stamp it into generated source. Pure functions — no MCP, no I/O — so the
// naming contract is testable without a live chart.

// Strip the exchange prefix: "FX:XAUUSD" -> "XAUUSD".
export function bareSymbol(symbol) {
  const s = String(symbol ?? "").trim();
  if (!s) return "UNKNOWN";
  const colon = s.indexOf(":");
  return (colon >= 0 ? s.slice(colon + 1) : s).toUpperCase();
}

// Kebab slug of a spec title, capped at maxLen chars (no trailing dash).
export function slugify(title, maxLen = 24) {
  const slug = String(title ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLen)
    .replace(/-+$/g, "");
  return slug || "strategy";
}

// Deterministic canonical name: QI · {SYMBOL} · {slug} · r{rerun}.
// Each Critic rerun is its own slot (r0/r1/r2), not a version bump.
export function canonicalName({ symbol, title, rerun = 0 }) {
  return `QI · ${bareSymbol(symbol)} · ${slugify(title)} · r${rerun}`;
}

// True for our generated scripts, so callers can filter the saved library safely
// without touching the ~19 pre-existing user scripts.
export function isQiScriptName(name) {
  return typeof name === "string" && name.startsWith("QI · ");
}

// Rewrite the strategy() title argument in the source to `name`, so pine_save
// persists under the canonical name. Handles the positional first-arg form
// (strategy("...")) and the named form (strategy(title="...")).
export function applyCanonicalTitle(source, name) {
  const safe = String(name).replace(/"/g, '\\"');

  const positional = /strategy\(\s*(["'])(?:\\.|(?!\1).)*\1/;
  if (positional.test(source)) {
    return source.replace(positional, `strategy("${safe}"`);
  }

  const named = /(strategy\([^)]*?\btitle\s*=\s*)(["'])(?:\\.|(?!\2).)*\2/;
  if (named.test(source)) {
    return source.replace(named, `$1"${safe}"`);
  }

  throw new Error("Could not locate a strategy() title argument to stamp the canonical name.");
}
