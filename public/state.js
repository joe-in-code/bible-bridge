// Central metadata object — the single source of truth for all selectors.
// The backend formats this into a structured prompt; the frontend only
// displays the AI's returned text.

export const DEFAULT_METADATA = {
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
};

export function buildMetadata() {
  return { ...DEFAULT_METADATA };
}