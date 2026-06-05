import { readText, stripMarkdownFence } from "./file_utils.js";
import { callAnthropic } from "./llm_client.js";
import { applyCanonicalTitle } from "./strategy_store.js";

export async function generatePine({ spec, canonicalName = null }) {
  const system = await readText("prompts/pine_coder.md");
  const raw = await callAnthropic({
    system,
    user: JSON.stringify(spec, null, 2),
    maxTokens: 6000
  });

  let source = stripMarkdownFence(raw);
  if (!source.startsWith("//@version=5")) {
    throw new Error("Generated Pine source must start with //@version=5.");
  }
  if (!source.includes("strategy(")) {
    throw new Error("Generated Pine source must declare strategy().");
  }
  // Stamp the canonical persistence name into the strategy() title so pine_save
  // inherits it (TECHNICAL.md §8). Done deterministically rather than trusting the LLM.
  if (canonicalName) {
    source = applyCanonicalTitle(source, canonicalName);
  }
  return source;
}
