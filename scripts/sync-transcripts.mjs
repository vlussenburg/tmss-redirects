#!/usr/bin/env node
// Pulls episode transcripts from the sibling `podcast` repo, cleans them up, and
// writes one plain-text file per episode into src/_data/transcripts/<n>.txt.
// Run manually with `npm run sync-transcripts` whenever the podcast repo has new
// or updated transcripts. Netlify does not have access to the sibling repo, so
// the generated files are committed and read at build time by transcripts.js.

import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const podcastDir = path.resolve(__dirname, "..", "..", "podcast", "slides", "episodes");
const outDir = path.resolve(__dirname, "..", "src", "_data", "transcripts");

function cleanWhitespace(text) {
  return text.replace(/\s+/g, " ").trim();
}

// Plain-prose transcript.txt files are already clean, just normalize whitespace.
function fromPlainText(raw) {
  return cleanWhitespace(raw);
}

// YouTube auto-caption .srt/.vtt files render as rolling captions: each cue
// repeats the previous cue's line plus one new line. Collapsing consecutive
// duplicate lines recovers the underlying prose.
function fromRollingCaptions(raw) {
  const lines = raw.split(/\r?\n/);
  const kept = [];
  let prev = null;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || /^\d+$/.test(trimmed) || /-->/.test(trimmed) || trimmed === "WEBVTT" || /^Kind:/.test(trimmed) || /^Language:/.test(trimmed)) {
      continue;
    }
    if (trimmed === prev) continue;
    kept.push(trimmed);
    prev = trimmed;
  }
  return cleanWhitespace(kept.join(" ").replace(/\[&nbsp;__&nbsp;\]/g, "[bleep]"));
}

// Apple .itt (TTML) caption files have one clean <p> per caption cue, wrapped
// mid-sentence at arbitrary points, so just join them with spaces.
function fromItt(raw) {
  const cues = [...raw.matchAll(/<p[^>]*>(.*?)<\/p>/gs)].map((m) => m[1].trim());
  return cleanWhitespace(cues.join(" "));
}

// Break a long unbroken transcript into readable paragraphs of roughly
// targetWords each, since source transcripts have no paragraph breaks at all.
//
// Uses String.split (not match/exec) so it is lossless by construction: split
// always partitions the whole string, so a stray mid-word period (e.g. in
// "mindtools.com", not followed by whitespace) just fails to act as a split
// point instead of derailing a greedy backtracking match across the rest of
// the text and silently dropping everything before the next "clean" period.
function toParagraphs(text, targetWords = 70) {
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  const paragraphs = [];
  let current = [];
  let currentWords = 0;

  const flush = () => {
    if (current.length) paragraphs.push(current.join(" "));
    current = [];
    currentWords = 0;
  };

  for (const sentence of sentences) {
    const wordCount = sentence.split(/\s+/).filter(Boolean).length;
    // Auto-captions have almost no punctuation, so a "sentence" here can be
    // the entire transcript. Hard-chunk oversized ones by word count so we
    // still get readable paragraphs instead of one giant wall of text.
    if (wordCount > targetWords * 2) {
      flush();
      const words = sentence.split(/\s+/).filter(Boolean);
      for (let i = 0; i < words.length; i += targetWords) {
        paragraphs.push(words.slice(i, i + targetWords).join(" "));
      }
      continue;
    }
    current.push(sentence);
    currentWords += wordCount;
    if (currentWords >= targetWords) flush();
  }
  flush();

  return paragraphs.filter(Boolean).join("\n\n");
}

if (!existsSync(podcastDir)) {
  console.error(`Podcast repo not found at ${podcastDir} — skipping sync.`);
  process.exit(1);
}

const episodeDirs = readdirSync(podcastDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

let written = 0;
for (const dirName of episodeDirs) {
  const match = dirName.match(/^ep0*(\d+)-/);
  if (!match) continue;
  const episodeNumber = match[1];
  const dirPath = path.join(podcastDir, dirName);
  const files = readdirSync(dirPath);

  let text = null;
  if (files.includes("transcript.txt")) {
    text = fromPlainText(readFileSync(path.join(dirPath, "transcript.txt"), "utf-8"));
  } else if (files.includes("transcript.en.srt")) {
    text = fromRollingCaptions(readFileSync(path.join(dirPath, "transcript.en.srt"), "utf-8"));
  } else {
    const ittFile = files.find((f) => f.endsWith(".itt"));
    if (ittFile) {
      text = fromItt(readFileSync(path.join(dirPath, ittFile), "utf-8"));
    }
  }

  if (!text || text.length < 100) continue;

  writeFileSync(path.join(outDir, `${episodeNumber}.txt`), toParagraphs(text), "utf-8");
  written += 1;
}

console.log(`Synced ${written} transcript(s) into ${path.relative(process.cwd(), outDir)}`);
