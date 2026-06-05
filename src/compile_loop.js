import { readText, stripMarkdownFence } from "./file_utils.js";
import { callAnthropic } from "./llm_client.js";
import { applyCanonicalTitle } from "./strategy_store.js";

// Link 4 (+ 4b persist). Push source onto the chart, compile, read errors, repair,
// repeat until clean (cap maxIterations) — then persist the clean candidate as its
// own saved script under the canonical name (TECHNICAL.md §8). On repeated failure,
// load the known-good fallback so the demo keeps moving (never saved under "QI · ").
export async function compileAndFix({
  adapter,
  source,
  savedName = null,
  maxIterations = 5,
  log = null
}) {
  const errorsSeen = [];
  let currentSource = savedName ? applyCanonicalTitle(source, savedName) : source;

  // Fresh slot first, so we never clobber an existing saved script.
  await adapter.pineNew({ kind: "strategy" });

  for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
    log?.step("Compile attempt", `${iteration}/${maxIterations}`);
    await adapter.pineSetSource({ source: currentSource });
    await adapter.pineSmartCompile();
    const errors = await adapter.pineGetErrors();

    if (isClean(errors)) {
      let saved_name = null;
      if (savedName) {
        await adapter.pineSave();
        saved_name = savedName;
        log?.step("Strategy saved", saved_name);
      }
      return {
        compiled: true,
        fallback: false,
        source: currentSource,
        iterations: iteration,
        errors: [],
        saved_name
      };
    }

    log?.step("Compile errors", summarizeErrors(errors));
    errorsSeen.push(errors);

    const system = await readText("prompts/compile_fix.md");
    const fixed = await callAnthropic({
      system,
      user: JSON.stringify({ source: currentSource, errors }, null, 2),
      maxTokens: 6000
    });
    currentSource = stripMarkdownFence(fixed);
    // Keep the canonical title even after an LLM repair pass.
    if (savedName) {
      currentSource = applyCanonicalTitle(currentSource, savedName);
    }
  }

  // Fallback: known-good script. Loaded via set_source only — never saved under
  // the "QI · " namespace (TECHNICAL.md §7/§8).
  log?.step("Compile fallback", "loading fallback/known_good.pine");
  const fallback = await readText("fallback/known_good.pine");
  await adapter.pineSetSource({ source: fallback });
  await adapter.pineSmartCompile();
  return {
    compiled: true,
    fallback: true,
    source: fallback,
    iterations: maxIterations,
    errors: errorsSeen,
    saved_name: null
  };
}

function isClean(errors) {
  return !errors || (Array.isArray(errors) && errors.length === 0);
}

function summarizeErrors(errors) {
  if (Array.isArray(errors)) {
    return `${errors.length} error(s)`;
  }
  return typeof errors === "string" ? errors.slice(0, 120) : "compile errors";
}
