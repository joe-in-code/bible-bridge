// Metadata validation: never trust the request body.

import { ERA_MAX, DEFAULT_IMPERATIVE, IMPERATIVES, USER_PROMPT_MAX } from "../public/constants.js";

const clampInt = (v, min, max, fallback) => {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return fallback;
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

function pickOne(value, allowed, fallback) {
  return typeof value === "string" && allowed.has(value) ? value : fallback;
}

/**
 * @returns {{ ok: true, value: object } | { ok: false, error: string }}
 */
export function sanitizeMetadata(raw, data) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "Metadata object required." };
  }
  const storyIds = ids(data.stories.stories);
  if (typeof raw.story !== "string" || !storyIds.has(raw.story)) {
    return { ok: false, error: "A valid story is required." };
  }
  const imperativeValues = new Set(IMPERATIVES.map((i) => i.value));
  const imperative = clampInt(raw.imperativeAlignment, 1, 4, DEFAULT_IMPERATIVE);

  return {
    ok: true,
    value: {
      story: raw.story,
      themes: pickList(raw.themes, ids(data.themes.themes)),
      setting: pickOne(raw.setting, ids(data.settings.settings), null),
      characterRoles: pickList(raw.characterRoles, ids(data.roles.roles)),
      symbols: pickList(raw.symbols, ids(data.symbols.symbols)),
      metaphorDensity: clampInt(raw.metaphorDensity, 1, 3, 2),
      emotionalIntensity: clampInt(raw.emotionalIntensity, 1, 5, 3),
      spiritualFocus: clampInt(raw.spiritualFocus, 1, 5, 3),
      literaryForm: pickOne(raw.literaryForm, ids(data.forms.forms), null),
      persona: pickOne(raw.persona, ids(data.personas.personas), null),
      anchor: pickOne(raw.anchor, ids(data.anchors.anchors), null),
      era: clampInt(raw.era, 0, ERA_MAX, 0),
      imperativeAlignment: imperativeValues.has(imperative) ? imperative : DEFAULT_IMPERATIVE,
      userPrompt: typeof raw.userPrompt === "string" ? raw.userPrompt.trim().slice(0, USER_PROMPT_MAX) : "",
    },
  };
}
