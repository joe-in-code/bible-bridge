// Central store: the single source of truth for the `metadata` object, the
// loaded reference data, the latest retelling, and the busy flag.
// Components subscribe instead of calling each other.
//
// "Opt-in" controls: setting, literaryForm, persona, anchor, imperativeAlignment,
// era, metaphorDensity, emotionalIntensity, and spiritualFocus each have an
// enabled flag in `metadata.enabled`. When disabled, the remembered value stays
// in `metadata` (so flipping the switch back on restores it), but
// `effectiveMetadata()` reports that field as null so it is never sent to the
// AI and never silently shapes the retelling. Story is always required and has
// no switch. Multi-select fields (themes, characterRoles, symbols) need no
// switch: empty already means "none".

export const TOGGLEABLE_KEYS = [
  "setting",
  "literaryForm",
  "persona",
  "anchor",
  "imperativeAlignment",
  "era",
  "metaphorDensity",
  "emotionalIntensity",
  "spiritualFocus",
];

function freshEnabled() {
  return Object.fromEntries(TOGGLEABLE_KEYS.map((k) => [k, false]));
}

export const DEFAULT_METADATA = Object.freeze({
  story: null,
  // A Bible reference typed in chat that isn't one of the curated stories,
  // e.g. { book: "John", reference: "11:1-44", display: "John 11:1-44" }.
  // Mutually exclusive with `story` — setSubject() keeps only one set.
  customReference: null,
  themes: [],
  setting: null,
  characterRoles: [],
  symbols: [],
  metaphorDensity: 2,
  emotionalIntensity: 3,
  spiritualFocus: 3,
  literaryForm: "parable",
  persona: "modern-storyteller",
  anchor: "evangelical",
  era: 0,
  imperativeAlignment: 2,
  userPrompt: "",
});

let DATA = null;
let metadata = freshMetadata();
let retelling = null;
let busy = false;
const listeners = new Set();

function freshMetadata() {
  return { ...DEFAULT_METADATA, themes: [], characterRoles: [], symbols: [], enabled: freshEnabled() };
}

function emit(event) {
  for (const fn of [...listeners]) {
    try { fn(event); } catch (err) { console.error("Subscriber error:", err); }
  }
}

/** subscribe(fn) -> unsubscribe. fn receives { type: "metadata"|"retelling"|"busy", source, keys? }. */
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function setData(d) {
  DATA = d;
  // Story starts unselected: the reader must choose it deliberately.
  // Remembered single-value fields are seeded with a real choice (the first
  // item) so turning a switch on always shows something concrete, but they
  // stay off (not sent) until the reader opts in.
  const first = (list) => list?.[0]?.id ?? null;
  const has = (list, id) => (list || []).some((x) => x.id === id);
  metadata.story = null;
  metadata.customReference = null;
  if (!metadata.setting || !has(d.settings.settings, metadata.setting)) metadata.setting = first(d.settings.settings);
  if (!has(d.forms.forms, metadata.literaryForm)) metadata.literaryForm = first(d.forms.forms);
  if (!has(d.personas.personas, metadata.persona)) metadata.persona = first(d.personas.personas);
  if (!has(d.anchors.anchors, metadata.anchor)) metadata.anchor = first(d.anchors.anchors);
}

export const getData = () => DATA;
export const getMetadata = () => metadata;
export const snapshotMetadata = () => structuredClone(metadata);

/**
 * The metadata actually sent to the AI: disabled single-value fields become
 * null (the server treats null/missing as "not set" and omits that prompt
 * section entirely, rather than falling back to a default).
 */
export function effectiveMetadata(meta = metadata) {
  const out = structuredClone(meta);
  for (const key of TOGGLEABLE_KEYS) {
    if (!out.enabled?.[key]) out[key] = null;
  }
  if (out.customReference) out.customReference = { book: out.customReference.book, reference: out.customReference.reference };
  delete out.enabled;
  return out;
}

export function setMetadata(patch, source = "external") {
  metadata = { ...metadata, ...patch };
  emit({ type: "metadata", source, keys: Object.keys(patch) });
}

/**
 * Set what the retelling is about: a curated story id, or a reference typed
 * in chat ({ book, reference, display }). The two are mutually exclusive —
 * setting one always clears the other.
 */
export function setSubject({ story = null, customReference = null }, source = "external") {
  metadata = { ...metadata, story, customReference };
  emit({ type: "metadata", source, keys: ["story", "customReference"] });
}

/** Turn one opt-in control on or off. The remembered value is untouched. */
export function setEnabled(key, on, source = "external") {
  if (!TOGGLEABLE_KEYS.includes(key)) return;
  if (metadata.enabled[key] === Boolean(on)) return;
  metadata = { ...metadata, enabled: { ...metadata.enabled, [key]: Boolean(on) } };
  emit({ type: "metadata", source, keys: ["enabled"] });
}

export const isEnabled = (key) => Boolean(metadata.enabled?.[key]);

/** Add/remove an id in one of the array fields (themes, characterRoles, symbols). */
export function toggleInList(key, id, on, source = "external") {
  const current = metadata[key];
  const next = on ? (current.includes(id) ? current : [...current, id]) : current.filter((x) => x !== id);
  setMetadata({ [key]: next }, source);
}

export const getRetelling = () => retelling;
export function setRetelling(r, source = "chat") {
  retelling = r;
  emit({ type: "retelling", source });
}

export const isBusy = () => busy;
export function setBusy(b) {
  busy = b;
  emit({ type: "busy", source: "chat" });
}

/** Lookup helper: find an item by id (or other key) in a list. */
export const byId = (list, id, key = "id") => (list || []).find((x) => x[key] === id) ?? null;

export function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
