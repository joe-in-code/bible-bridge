// Chat-based story/reference detection: lets the reader type a story name
// ("Cain and Abel") or a scripture reference ("John 3:16", "Gen 4") instead of
// using the selectors. Pure functions, no DOM, so this is unit-testable and
// shared between the chat UI and its test suite.

import { BIBLE_BOOKS } from "./constants.js";

const STOPWORDS = new Set([
  "the", "and", "of", "a", "an", "in", "on", "at", "to", "for", "with", "from",
  "story", "stories", "tale", "parable", "chapter", "about", "tell", "retell",
  "me", "us", "write", "narrate", "do", "please",
]);

const BOOK_LOOKUP = new Map();
for (const b of BIBLE_BOOKS) {
  BOOK_LOOKUP.set(b.name.toLowerCase(), b.name);
  for (const a of b.aliases) BOOK_LOOKUP.set(a.toLowerCase(), b.name);
}

function normalize(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s:.-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Validate a candidate word/phrase as an exact canonical book name or alias. */
function canonicalBook(raw) {
  let q = raw.trim().toLowerCase().replace(/\.$/, "").replace(/\s+/g, " ");
  q = q.replace(/^iii\b/, "3").replace(/^ii\b/, "2").replace(/^i\b/, "1");
  return BOOK_LOOKUP.get(q) || null;
}

// Matches just the numeric chapter/verse part, e.g. "3:16", "chapter 3 verse 16-18",
// "1-2". The book name is resolved separately by looking at the words
// immediately before each match (see parseReference) — keeping book lookup
// out of the regex avoids it ever greedily swallowing an unrelated earlier
// word (e.g. "...about John 3:16" must not parse "about John" as the book).
const NUM_RE = /(?:(?:chapter|chap\.?|ch\.?)\s+)?(\d{1,3})(?:\s*(?:[:.]|verse[s]?|v\.?)\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?)?(?:\s*[-–]\s*(\d{1,3}))?/g;

/** Alphanumeric word tokens before `index`, in order (numeral book prefixes 1-3 included). */
function wordsBefore(text, index) {
  const before = text.slice(0, index);
  return (before.match(/(?:[1-3]|[A-Za-z]+)\.?/g) || []).map((t) => t.replace(/\.$/, ""));
}

/** Find the first valid Bible reference in free text, or null. */
export function parseReference(text) {
  if (!text) return null;
  NUM_RE.lastIndex = 0;
  let m;
  while ((m = NUM_RE.exec(text))) {
    const words = wordsBefore(text, m.index);
    let book = null;
    // Try the longest plausible book name first (up to 3 words, e.g. "Song of
    // Solomon"), falling back to shorter windows — never the reverse, so a
    // random earlier word is only ever absorbed if the longer form is itself
    // a real, exact book name/alias.
    for (const n of [3, 2, 1]) {
      if (words.length < n) continue;
      book = canonicalBook(words.slice(-n).join(" "));
      if (book) break;
    }
    if (book) {
      const [, chapter, verseStart, verseEnd, chapterEnd] = m;
      let reference;
      if (verseStart) reference = `${chapter}:${verseStart}${verseEnd ? "-" + verseEnd : ""}`;
      else if (chapterEnd) reference = `${chapter}-${chapterEnd}`;
      else reference = chapter;
      return { book, reference, display: `${book} ${reference}` };
    }
    // No valid book immediately before this number — keep scanning the rest
    // of the text for another numeric phrase instead of giving up.
  }
  return null;
}

function titleKeywords(story) {
  return normalize(story.title)
    .split(" ")
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

/**
 * Best curated-story match by title keyword overlap, or null. Requires
 * strong evidence — two distinct title words, or one title word plus the
 * book name — so a single common word (e.g. "love") can't false-match.
 */
export function matchStory(text, data) {
  const norm = normalize(text);
  if (!norm) return null;
  const words = new Set(norm.split(" "));
  let best = null;
  let bestScore = -1;
  for (const story of data.stories.stories) {
    const hits = titleKeywords(story).filter((kw) => words.has(kw)).length;
    const bookHit = words.has(story.book.toLowerCase());
    if (hits < 2 && !(hits >= 1 && bookHit)) continue;
    const score = hits * 2 + (bookHit ? 1 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = story;
    }
  }
  return best;
}

/**
 * Detect what the reader means by free text: an explicit scripture reference
 * takes priority (unambiguous), then a curated story mentioned by name.
 * Returns { kind: "reference", book, reference, display }
 *      or { kind: "story", id, title }
 *      or null.
 */
export function detectSubject(text, data) {
  if (!text || !text.trim()) return null;
  const ref = parseReference(text);
  if (ref) return { kind: "reference", ...ref };
  const story = matchStory(text, data);
  if (story) return { kind: "story", id: story.id, title: story.title };
  return null;
}
