// Constants shared by the browser and the server (imported by lib/prompt.js).

export const ERA_LABELS = ["Ancient", "Kings", "1900s", "Modern", "Future"];
export const ERA_SNAP_POINTS = [0, 10, 20, 30, 40];
export const ERA_MAX = 40;

export function eraIndex(era) {
  const n = Number.isFinite(Number(era)) ? Number(era) : 0;
  return Math.max(0, Math.min(ERA_LABELS.length - 1, Math.round(n / 10)));
}

export function eraLabel(era) {
  return ERA_LABELS[eraIndex(era)];
}

export const IMPERATIVES = [
  { value: 1, name: "Strict Doctrine", directive: "remain faithful to historic confessional boundaries; avoid speculation." },
  { value: 2, name: "Faithful Interpretation", directive: "honor the text's plain sense while allowing pastoral application." },
  { value: 3, name: "Inspired Reflection", directive: "draw thoughtful, devotional insight rooted in the text." },
  { value: 4, name: "Symbolic Expansion", directive: "freely explore metaphor, allegory, and layered meaning." },
];
export const DEFAULT_IMPERATIVE = 2;

export const METAPHOR_LABELS = ["Low", "Moderate", "High"];
export const METAPHOR_DIRECTIVES = [
  "Low - lean on plain narration.",
  "Moderate - occasional figurative language.",
  "High - rich in metaphor and layered symbol.",
];

export const USER_PROMPT_MAX = 2000;
