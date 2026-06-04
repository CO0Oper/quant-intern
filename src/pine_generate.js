import { readText, stripMarkdownFence } from "./file_utils.js";
import { callAnthropic } from "./llm_client.js";

export async function generatePine({ spec }) {
  const system = await readText("prompts/pine_coder.md");
  const raw = await callAnthropic({
    system,
    user: JSON.stringify(spec, null, 2),
    maxTokens: 6000
  });

  const source = stripMarkdownFence(raw);
  if (!source.startsWith("//@version=5")) {
    throw new Error("Generated Pine source must start with //@version=5.");
  }
  if (!source.includes("strategy(")) {
    throw new Error("Generated Pine source must declare strategy().");
  }
  return source;
}
