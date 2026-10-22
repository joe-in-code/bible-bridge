import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadData } from "../lib/data.js";
import { buildPrompt, PASSAGE_CHAR_CAP } from "../lib/prompt.js";
import { sanitizeMetadata } from "../lib/validate.js";
import { resolveCuratedSubject } from "../lib/subject.js";

const dataDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "data");
const data = loadData(dataDir);

const storyById = (id, d = data) => d.stories.stories.find((s) => s.id === id);
const curatedSubject = (id, d = data) => resolveCuratedSubject(storyById(id, d), d);

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

test("sanitizeMetadata requires a story OR a valid customReference", () => {
  assert.equal(sanitizeMetadata({ customReference: { book: "Nope", reference: "3:16" } }, data).ok, false);
  assert.equal(sanitizeMetadata({ customReference: { book: "John", reference: "not-a-ref" } }, data).ok, false);
  const r = sanitizeMetadata({ customReference: { book: "John", reference: "11:1-44" } }, data);
  assert.equal(r.ok, true);
  assert.equal(r.value.story, null);
  assert.deepEqual(r.value.customReference, { book: "John", reference: "11:1-44" });
});

test("sanitizeMetadata: story wins over customReference if both are sent", () => {
  const r = sanitizeMetadata({ story: "ruth", customReference: { book: "John", reference: "3:16" } }, data);
  assert.equal(r.ok, true);
  assert.equal(r.value.story, "ruth");
  assert.equal(r.value.customReference, null);
});

test("sanitizeMetadata clamps and filters, and preserves null for unset/invalid fields", () => {
  const r = sanitizeMetadata({ ...base, emotionalIntensity: 99, era: -5, metaphorDensity: "x", themes: ["justice", "bogus"], userPrompt: "a".repeat(5000), persona: "nope" }, data);
  assert.equal(r.ok, true);
  assert.equal(r.value.emotionalIntensity, 5); // clamps in-range, doesn't null out a real number
  assert.equal(r.value.era, 0); // clamps in-range
  assert.equal(r.value.metaphorDensity, null); // not a number at all -> null, not a fallback default
  assert.deepEqual(r.value.themes, ["justice"]);
  assert.equal(r.value.userPrompt.length, 2000);
  assert.equal(r.value.persona, null); // invalid id -> null, never a silent substitute
});

test("sanitizeMetadata leaves every optional field null when omitted (opt-in by default)", () => {
  const r = sanitizeMetadata({ story: "ruth" }, data);
  assert.equal(r.ok, true);
  for (const key of ["setting", "literaryForm", "persona", "anchor", "metaphorDensity", "emotionalIntensity", "spiritualFocus", "era", "imperativeAlignment"]) {
    assert.equal(r.value[key], null, `${key} should be null when not provided`);
  }
  assert.deepEqual(r.value.themes, []);
  assert.deepEqual(r.value.characterRoles, []);
  assert.deepEqual(r.value.symbols, []);
});

test("buildPrompt includes every field when everything is set, and never falls back silently", () => {
  const { value } = sanitizeMetadata(base, data);
  const p = buildPrompt(value, data, curatedSubject("genesis-abel"));
  for (const needle of ["Cain and Abel", "Source Passage", "Justice", "Field", "1900s", "Dramatic", "Poem", "Poet", "Anglican", "Symbolic Expansion", "Keep it short."]) {
    assert.ok(p.includes(needle), `prompt should include "${needle}"`);
  }
  assert.ok(!p.includes("Faful"));
  assert.ok(!p.includes("null"));
  assert.ok(!p.includes("Not specified"));
});

test("buildPrompt omits every unset section entirely — no defaults, no filler text", () => {
  const { value } = sanitizeMetadata({ story: "ruth" }, data);
  const p = buildPrompt(value, data, curatedSubject("ruth"));
  for (const heading of ["## Era", "## Setting", "## Themes", "## Character Roles", "## Symbols", "## Symbolic Layer Density", "## Tone Matrix", "## Literary Form", "## Voice Persona", "## Theological Anchor", "## Biblical Imperative Alignment"]) {
    assert.ok(!p.includes(heading), `prompt should omit "${heading}" when unset`);
  }
  assert.ok(!p.includes("Ancient")); // era section omitted entirely, not defaulted to Ancient
  assert.ok(!p.includes("Not specified"));
  assert.ok(!p.includes("None specified"));
  assert.ok(!p.includes("null"));
  assert.ok(p.includes("Source Passage")); // the text itself is always present
  assert.ok(p.includes("Retell this passage plainly and faithfully."));
});

test("buildPrompt with no subject at all falls back to generic wording (should not happen via the route, but must not crash)", () => {
  const { value } = sanitizeMetadata({ story: "ruth" }, data);
  const p = buildPrompt(value, data, null);
  assert.ok(p.includes("A biblical passage chosen by the reader."));
  assert.ok(!p.includes("Source Passage"));
});

test("buildPrompt renders only the tone axis that is actually set", () => {
  const { value } = sanitizeMetadata({ story: "ruth", emotionalIntensity: 5 }, data);
  const p = buildPrompt(value, data, curatedSubject("ruth"));
  assert.ok(p.includes("## Tone Matrix"));
  assert.ok(p.includes("Emotional Intensity:"));
  assert.ok(!p.includes("Spiritual Focus:"));
});

test("buildPrompt treats a live/custom-reference subject the same as a curated one", () => {
  const { value } = sanitizeMetadata({ customReference: { book: "John", reference: "11:1-44" } }, data);
  const subject = { title: "John 11:1-44", book: "John", reference: "11:1-44", summary: null, passageText: "Jesus wept.", excerpted: false, translation: "WEB", custom: true };
  const p = buildPrompt(value, data, subject);
  assert.ok(p.includes("John 11:1-44"));
  assert.ok(p.includes("Source Passage"));
  assert.ok(p.includes("Jesus wept."));
});

test("buildPrompt caps long passages", () => {
  const fake = { ...data, passages: { translation: "WEB", passages: { ruth: { reference: "Ruth 1", text: "word ".repeat(5000) } } } };
  const { value } = sanitizeMetadata({ story: "ruth" }, fake);
  const p = buildPrompt(value, fake, curatedSubject("ruth", fake));
  assert.ok(p.length < PASSAGE_CHAR_CAP + 4000);
  assert.ok(p.includes("[...]"));
});

test("every story has passage text", () => {
  for (const s of data.stories.stories) {
    assert.ok(data.passages.passages[s.id]?.text?.length > 100, `missing passage for ${s.id}`);
  }
});
