import { stripMarkdownFence } from "./file_utils.js";

export async function callAnthropic({ system, user, maxTokens = 4096 }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL;

  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is required for agent reasoning.");
  }
  if (!model) {
    throw new Error("ANTHROPIC_MODEL is required. Set it to the Claude model available in your account.");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }]
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Anthropic API failed ${response.status}: ${body}`);
  }

  const payload = await response.json();
  return payload.content.map((part) => part.text || "").join("").trim();
}

export function parseJsonObject(raw) {
  const text = stripMarkdownFence(raw);
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Expected a JSON object from agent output.");
  }
  return JSON.parse(text.slice(start, end + 1));
}
