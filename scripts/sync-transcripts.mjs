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

// Break a long unbroken transcript into readable paragraphs of a few
// sentences each, since source transcripts have no paragraph breaks at all.
function toParagraphs(text, sentencesPerParagraph = 5) {
  const sentences = text.match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g) || [text];
  const paragraphs = [];
  for (let i = 0; i < sentences.length; i += sentencesPerParagraph) {
    paragraphs.push(sentences.slice(i, i + sentencesPerParagraph).join(" ").trim());
  }
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
