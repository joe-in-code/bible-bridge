import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadData } from "../lib/data.js";
import { buildPrompt, PASSAGE_CHAR_CAP } from "../lib/prompt.js";
import { sanitizeMetadata } from "../lib/validate.js";

const dataDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "data");
const data = loadData(dataDir);

const base = {
  story: "genesis-abel",
  themes: ["justice", "bogus"],
  setting: "field",
  characterRoles: [],
  symbols: [],
  metaphorDensity: 3,
  emotionalIntensity: 5,
  spiritualFocus: 2,
  literaryForm: "poem",
  persona: "poet",
  anchor: "anglican",
  era: 20,
  imperativeAlignment: 4,
  userPrompt: "Keep it short.",
};

test("sanitizeMetadata rejects bad input", () => {
  assert.equal(sanitizeMetadata(null, data).ok, false);
  assert.equal(sanitizeMetadata({}, data).ok, false);
  assert.equal(sanitizeMetadata({ story: "nope" }, data).ok, false);
});

test("sanitizeMetadata clamps and filters", () => {
  const r = sanitizeMetadata({ ...base, emotionalIntensity: 99, era: -5, metaphorDensity: "x", themes: ["justice", "bogus"], userPrompt: "a".repeat(5000), persona: "nope" }, data);
  assert.equal(r.ok, true);
  assert.equal(r.value.emotionalIntensity, 5);
  assert.equal(r.value.era, 0);
  assert.equal(r.value.metaphorDensity, 2);
  assert.deepEqual(r.value.themes, ["justice"]);
  assert.equal(r.value.userPrompt.length, 2000);
  assert.equal(r.value.persona, null);
});

test("buildPrompt includes every field and the source passage", () => {
  const { value } = sanitizeMetadata(base, data);
  const p = buildPrompt(value, data);
  for (const needle of ["Cain and Abel", "Source Passage", "Justice", "Field", "1900s", "Dramatic", "Poem", "Poet", "Anglican", "Symbolic Expansion", "Keep it short."]) {
    assert.ok(p.includes(needle), `prompt should include "${needle}"`);
  }
  assert.ok(!p.includes("Faful"));
  assert.ok(!p.includes("null"));
});

test("buildPrompt falls back gracefully when fields are missing", () => {
  const { value } = sanitizeMetadata({ story: "ruth" }, data);
  const p = buildPrompt(value, data);
  assert.ok(p.includes("Produce the retelling now"));
  assert.ok(p.includes("Ancient"));
});

test("buildPrompt caps long passages", () => {
  const fake = { ...data, passages: { translation: "WEB", passages: { ruth: { reference: "Ruth 1", text: "word ".repeat(5000) } } } };
  const { value } = sanitizeMetadata({ story: "ruth" }, fake);
  const p = buildPrompt(value, fake);
  assert.ok(p.length < PASSAGE_CHAR_CAP + 4000);
  assert.ok(p.includes("[...]"));
});

test("every story has passage text", () => {
  for (const s of data.stories.stories) {
    assert.ok(data.passages.passages[s.id]?.text?.length > 100, `missing passage for ${s.id}`);
  }
});
