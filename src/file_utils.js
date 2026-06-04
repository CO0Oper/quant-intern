import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export async function readText(path) {
  return readFile(path, "utf8");
}

export async function writeText(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, value, "utf8");
}

export function stripMarkdownFence(value) {
  const trimmed = value.trim();
  const match = trimmed.match(/^```(?:\w+)?\s*([\s\S]*?)\s*```$/);
  return match ? match[1].trim() : trimmed;
}
