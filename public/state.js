// Central store: the single source of truth for the `metadata` object, the
// loaded reference data, the latest retelling, and the busy flag.
// Components subscribe instead of calling each other.

export const DEFAULT_METADATA = Object.freeze({
  story: null,
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
  return { ...DEFAULT_METADATA, themes: [], characterRoles: [], symbols: [] };
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
  // Make the defaults consistent with the data (first story/setting; valid ids).
  const first = (list) => list?.[0]?.id ?? null;
  const has = (list, id) => (list || []).some((x) => x.id === id);
  metadata.story = first(d.stories.stories);
  metadata.setting = first(d.settings.settings);
  if (!has(d.forms.forms, metadata.literaryForm)) metadata.literaryForm = first(d.forms.forms);
  if (!has(d.personas.personas, metadata.persona)) metadata.persona = first(d.personas.personas);
  if (!has(d.anchors.anchors, metadata.anchor)) metadata.anchor = first(d.anchors.anchors);
}

export const getData = () => DATA;
export const getMetadata = () => metadata;
export const snapshotMetadata = () => structuredClone(metadata);

export function setMetadata(patch, source = "external") {
  metadata = { ...metadata, ...patch };
  emit({ type: "metadata", source, keys: Object.keys(patch) });
}

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
