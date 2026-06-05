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

// A YouTube video id is exactly 11 chars of [A-Za-z0-9_-]. Enforcing this on every
// path (not just the bare-id branch) keeps the id safe to splice into a filename —
// a crafted URL like ?v=../../etc/passwd can never escape cache/transcripts/.
const YOUTUBE_ID = /^[a-zA-Z0-9_-]{11}$/;

export function extractYouTubeId(value) {
  if (!value) {
    throw new Error("A YouTube URL or video id is required.");
  }

  if (YOUTUBE_ID.test(value)) {
    return value;
  }

  const url = new URL(value);
  const candidate = url.hostname.includes("youtu.be")
    ? basename(url.pathname)
    : url.searchParams.get("v");

  if (candidate && YOUTUBE_ID.test(candidate)) {
    return candidate;
  }
  throw new Error(`Could not parse a valid YouTube video id from ${value}`);
}
