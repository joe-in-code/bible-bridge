// One-time data build: fetch WEB (public domain) passage text for each story
// from bible-api.com and write public/data/passages.json.
// Usage: npm run fetch-passages

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const dataDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "data");
const stories = JSON.parse(readFileSync(join(dataDir, "stories.json"), "utf8")).stories;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const bookName = (b) => (b === "Psalms" ? "Psalm" : b);

async function fetchSegment(book, ref, attempt = 1) {
  const url = `https://bible-api.com/${encodeURIComponent(`${bookName(book)} ${ref}`)}?translation=web`;
  const res = await fetch(url);
  if (res.status === 429 && attempt < 4) {
    await sleep(3000 * attempt);
    return fetchSegment(book, ref, attempt + 1);
  }
  if (!res.ok) throw new Error(`${book} ${ref}: HTTP ${res.status}`);
  const json = await res.json();
  if (!json.text) throw new Error(`${book} ${ref}: empty response`);
  return json.text.trim();
}

const passages = {};
for (const story of stories) {
  const refs = (story.excerpt || story.reference).split(";").map((s) => s.trim()).filter(Boolean);
  const parts = [];
  for (const ref of refs) {
    parts.push(await fetchSegment(story.book, ref));
    await sleep(1000);
  }
  passages[story.id] = {
    reference: `${story.book} ${story.excerpt || story.reference}`,
    excerpted: Boolean(story.excerpt),
    text: parts.join("\n\n[...]\n\n"),
  };
  console.log(`ok  ${story.id} (${passages[story.id].text.length} chars)`);
}

writeFileSync(
  join(dataDir, "passages.json"),
  JSON.stringify({ translation: "WEB", license: "Public Domain", passages }, null, 2) + "\n",
);
console.log(`Wrote ${Object.keys(passages).length} passages.`);
