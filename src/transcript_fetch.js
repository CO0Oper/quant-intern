import { existsSync } from "node:fs";
import { basename, join } from "node:path";
import { readText } from "./file_utils.js";

export async function fetchTranscript({ videoUrl, transcriptPath }) {
  if (transcriptPath) {
    return {
      source: transcriptPath,
      text: await readText(transcriptPath)
    };
  }

  const videoId = extractYouTubeId(videoUrl);
  const cachePath = join("cache", "transcripts", `${videoId}.txt`);
  if (existsSync(cachePath)) {
    return {
      source: cachePath,
      text: await readText(cachePath)
    };
  }

  throw new Error(
    `Transcript is not cached. Save it to ${cachePath} or pass --transcript <path>.`
  );
}

export function extractYouTubeId(value) {
  if (!value) {
    throw new Error("A YouTube URL or video id is required.");
  }

  if (/^[a-zA-Z0-9_-]{11}$/.test(value)) {
    return value;
  }

  const url = new URL(value);
  if (url.hostname.includes("youtu.be")) {
    return basename(url.pathname);
  }
  const id = url.searchParams.get("v");
  if (id) {
    return id;
  }
  throw new Error(`Could not parse YouTube video id from ${value}`);
}
