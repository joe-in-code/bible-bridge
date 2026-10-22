// Metadata validation: never trust the request body.
//
// Every single-value field here is opt-in on the client: a disabled control
// is sent as null (or simply omitted), meaning "let the AI decide, don't
// pin this". That null is preserved all the way through — it is NOT replaced
// with a default — so an unselected field never silently shapes the prompt.
// Only present, well-formed values are validated and clamped.
//
// A retelling needs a subject: either a curated `story` id, or a
// `customReference` naming a Bible book + chapter[:verse] the reader typed in
// chat (e.g. "John 3:16"). Exactly one is kept; story wins if both are sent.

import { ERA_MAX, IMPERATIVES, USER_PROMPT_MAX, BIBLE_BOOKS } from "../public/constants.js";

const BOOK_NAMES = new Set(BIBLE_BOOKS.map((b) => b.name));
const REFERENCE_RE = /^\d{1,3}(:\d{1,3}(-\d{1,3})?)?(-\d{1,3})?$/;

const clampIntOrNull = (v, min, max) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return null;
  return Math.max(min, Math.min(max, n));
};

const ids = (list) => new Set((list || []).map((x) => x.id));

function pickList(value, allowed, max = 12) {
  if (!Array.isArray(value)) return [];
  const out = [];
  for (const v of value) {
    if (typeof v === "string" && allowed.has(v) && !out.includes(v)) out.push(v);
    if (out.length >= max) break;
  }
  return out;
}

function pickOneOrNull(value, allowed) {
  return typeof value === "string" && allowed.has(value) ? value : null;
}

function pickCustomReference(raw) {
  const cr = raw?.customReference;
  if (!cr || typeof cr !== "object") return null;
  const book = typeof cr.book === "string" ? cr.book.trim() : "";
  const reference = typeof cr.reference === "string" ? cr.reference.trim() : "";
  if (!BOOK_NAMES.has(book) || !REFERENCE_RE.test(reference)) return null;
  return { book, reference };
}

/**
 * @returns {{ ok: true, value: object } | { ok: false, error: string }}
 */
export function sanitizeMetadata(raw, data) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "Metadata object required." };
  }
  const storyIds = ids(data.stories.stories);
  const story = typeof raw.story === "string" && storyIds.has(raw.story) ? raw.story : null;
  const customReference = story ? null : pickCustomReference(raw);
  if (!story && !customReference) {
    return { ok: false, error: 'Choose a story, or type a Bible reference (e.g. "John 3:16") in your message.' };
  }
  const imperativeValues = new Set(IMPERATIVES.map((i) => i.value));
  const imperative = clampIntOrNull(raw.imperativeAlignment, 1, 4);

  return {
    ok: true,
    value: {
      story,
      customReference,
      themes: pickList(raw.themes, ids(data.themes.themes)),
      setting: pickOneOrNull(raw.setting, ids(data.settings.settings)),
      characterRoles: pickList(raw.characterRoles, ids(data.roles.roles)),
      symbols: pickList(raw.symbols, ids(data.symbols.symbols)),
      metaphorDensity: clampIntOrNull(raw.metaphorDensity, 1, 3),
      emotionalIntensity: clampIntOrNull(raw.emotionalIntensity, 1, 5),
      spiritualFocus: clampIntOrNull(raw.spiritualFocus, 1, 5),
      literaryForm: pickOneOrNull(raw.literaryForm, ids(data.forms.forms)),
      persona: pickOneOrNull(raw.persona, ids(data.personas.personas)),
      anchor: pickOneOrNull(raw.anchor, ids(data.anchors.anchors)),
      era: clampIntOrNull(raw.era, 0, ERA_MAX),
      imperativeAlignment: imperative !== null && imperativeValues.has(imperative) ? imperative : null,
      userPrompt: typeof raw.userPrompt === "string" ? raw.userPrompt.trim().slice(0, USER_PROMPT_MAX) : "",
    },
  };
}
