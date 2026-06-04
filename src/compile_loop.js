import { readText } from "./file_utils.js";
import { callAnthropic } from "./llm_client.js";

export async function compileAndFix({ adapter, source, maxIterations = 5 }) {
  const errorsSeen = [];
  let currentSource = source;

  for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
    await adapter.pineSetSource({ source: currentSource });
    await adapter.pineSmartCompile();
    const errors = await adapter.pineGetErrors();

    if (!errors || (Array.isArray(errors) && errors.length === 0)) {
      return {
        compiled: true,
        source: currentSource,
        iterations: iteration,
        errors: []
      };
    }

    errorsSeen.push(errors);
    const system = await readText("prompts/compile_fix.md");
    currentSource = await callAnthropic({
      system,
      user: JSON.stringify({ source: currentSource, errors }, null, 2),
      maxTokens: 6000
    });
  }

  const fallback = await readText("fallback/known_good.pine");
  await adapter.pineSetSource({ source: fallback });
  await adapter.pineSmartCompile();
  return {
    compiled: true,
    fallback: true,
    source: fallback,
    iterations: maxIterations,
    errors: errorsSeen
  };
}
