import { readText } from "./file_utils.js";
import { callAnthropic, parseJsonObject } from "./llm_client.js";

export async function critique({ results, benchmarkBuyAndHold, currentSpec, rerunCount }) {
  const system = await readText("prompts/critic.md");
  const raw = await callAnthropic({
    system,
    user: JSON.stringify(
      {
        results,
        benchmark_buy_and_hold: benchmarkBuyAndHold,
        current_spec: currentSpec,
        rerun_count: rerunCount
      },
      null,
      2
    )
  });

  return parseJsonObject(raw);
}
