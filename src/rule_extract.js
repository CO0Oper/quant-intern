import { readText } from "./file_utils.js";
import { callAnthropic, parseJsonObject } from "./llm_client.js";
import { validateStrategySpec } from "./spec_schema.js";

export async function extractStrategySpec({ transcript, videoUrl, symbol, timeframe }) {
  const system = await readText("prompts/extractor.md");
  const raw = await callAnthropic({
    system,
    user: [
      `source_video: ${videoUrl}`,
      symbol ? `symbol_hint: ${symbol}` : "symbol_hint: none",
      timeframe ? `timeframe_hint: ${timeframe}` : "timeframe_hint: none",
      "",
      "Transcript:",
      transcript
    ].join("\n")
  });

  return validateStrategySpec(parseJsonObject(raw));
}

export async function resolveAmbiguity({ draftSpec }) {
  const system = await readText("prompts/resolver.md");
  const raw = await callAnthropic({
    system,
    user: JSON.stringify(draftSpec, null, 2)
  });

  return validateStrategySpec(parseJsonObject(raw));
}
