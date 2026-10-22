import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadData } from "../lib/data.js";
import { parseReference, matchStory, detectSubject } from "../public/storyMatch.js";

const dataDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "data");
const data = loadData(dataDir);

test("parseReference recognizes common formats", () => {
  assert.deepEqual(parseReference("John 3:16"), { book: "John", reference: "3:16", display: "John 3:16" });
  assert.deepEqual(parseReference("tell me about John 3:16-18 please"), { book: "John", reference: "3:16-18", display: "John 3:16-18" });
  assert.deepEqual(parseReference("Gen 4"), { book: "Genesis", reference: "4", display: "Genesis 4" });
  assert.deepEqual(parseReference("Genesis 1-2"), { book: "Genesis", reference: "1-2", display: "Genesis 1-2" });
  assert.deepEqual(parseReference("1 Corinthians 13:4"), { book: "1 Corinthians", reference: "13:4", display: "1 Corinthians 13:4" });
  assert.deepEqual(parseReference("Philippians 4:13"), { book: "Philippians", reference: "4:13", display: "Philippians 4:13" });
  assert.deepEqual(parseReference("john chapter 3 verse 16"), { book: "John", reference: "3:16", display: "John 3:16" });
  assert.deepEqual(parseReference("psalm 23"), { book: "Psalms", reference: "23", display: "Psalms 23" });
});

test("parseReference skips an invalid 'book' and keeps scanning", () => {
  assert.equal(parseReference("keep it under 300 words"), null);
  assert.equal(parseReference("run 1 and go"), null);
});

test("parseReference returns null for plain conversation", () => {
  for (const text of [
    "Close with a short prayer.",
    "Retell it from a minor character's point of view.",
    "Emphasize what the characters feel in the quiet moments.",
    "",
    "   ",
  ]) {
    assert.equal(parseReference(text), null, `should not match "${text}"`);
  }
});

test("matchStory finds a curated story by name", () => {
  assert.equal(matchStory("tell me the story of Cain and Abel", data)?.id, "genesis-abel");
  assert.equal(matchStory("I want Noah and the flood", data)?.id, "genesis-noah");
  assert.equal(matchStory("the good samaritan parable", data)?.id, "jesus-good-samaritan");
  assert.equal(matchStory("David and Goliath please", data)?.id, "david-goliath");
});

test("matchStory doesn't fire on weak/ambiguous overlap", () => {
  assert.equal(matchStory("tell me a story", data), null);
  assert.equal(matchStory("write something about love", data), null);
});

test("detectSubject prefers an explicit reference over a title match", () => {
  const d = detectSubject("Genesis 4:1-16 please", data);
  assert.equal(d.kind, "reference");
  assert.equal(d.display, "Genesis 4:1-16");
});

test("detectSubject falls back to a curated story by name", () => {
  const d = detectSubject("Cain and Abel", data);
  assert.deepEqual(d, { kind: "story", id: "genesis-abel", title: "Cain and Abel" });
});

test("detectSubject finds a reference outside the curated list", () => {
  const d = detectSubject("What about John 11:1-44?", data);
  assert.deepEqual(d, { kind: "reference", book: "John", reference: "11:1-44", display: "John 11:1-44" });
});

test("detectSubject returns null for ordinary chat instructions", () => {
  assert.equal(detectSubject("Keep it under 300 words.", data), null);
  assert.equal(detectSubject("Close with a short prayer.", data), null);
});
