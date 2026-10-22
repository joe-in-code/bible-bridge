// Prompt-generation agent: turns sanitized metadata into a structured prompt.

import {
  eraLabel,
  IMPERATIVES,
  DEFAULT_IMPERATIVE,
  METAPHOR_DIRECTIVES,
} from "../public/constants.js";

export const PASSAGE_CHAR_CAP = 9000;

const find = (list, key, value) => (list || []).find((x) => x[key] === value) ?? null;
const named = (list, idList) => (idList || []).map((id) => find(list, "id", id)?.name).filter(Boolean);

export function buildPrompt(metadata, data) {
  const story = find(data.stories.stories, "id", metadata.story);
  const storyText = story
    ? `The story being retold is "${story.title}" (${story.book} ${story.reference}). ${story.summary}`
    : "A biblical story chosen by the reader.";

  const passageEntry = story ? data.passages?.passages?.[story.id] : null;
  let passageSection = null;
  if (passageEntry?.text) {
    let text = passageEntry.text.trim();
    let note = passageEntry.excerpted ? " (excerpt of a longer passage)" : "";
    if (text.length > PASSAGE_CHAR_CAP) {
      text = text.slice(0, PASSAGE_CHAR_CAP).replace(/\s+\S*$/, "") + " [...]";
      note = " (truncated)";
    }
    passageSection = [
      `## Source Passage (${data.passages.translation || "WEB"} - ${passageEntry.reference})${note}`,
      text,
      "",
      "Stay faithful to the events, characters, and sequence of this passage. Do not invent doctrine or contradict the text.",
    ].join("\n");
  }

  const themes = named(data.themes.themes, metadata.themes);
  const symbols = named(data.symbols.symbols, metadata.symbols);
  const roles = named(data.roles.roles, metadata.characterRoles);

  const setting = find(data.settings.settings, "id", metadata.setting);
  const persona = find(data.personas.personas, "id", metadata.persona);
  const form = find(data.forms.forms, "id", metadata.literaryForm);
  const anchor = find(data.anchors.anchors, "id", metadata.anchor);

  const intensity = find(data.tone.emotional_intensity, "value", metadata.emotionalIntensity)?.name ?? "Earnest";
  const focus = find(data.tone.spiritual_focus, "value", metadata.spiritualFocus)?.name ?? "Clear";

  const imperative =
    IMPERATIVES.find((i) => i.value === metadata.imperativeAlignment) ??
    IMPERATIVES.find((i) => i.value === DEFAULT_IMPERATIVE);

  const describe = (item, extra) => (item ? `${item.name}${extra ? " - " + extra : ""}` : "Not specified.");

  const sections = [
    "You are Bible-Bridge, a guide for creative biblical retelling that preserves theological integrity.",
    "Write a retelling using the following structured metadata. Treat every field as a deliberate constraint.",
    "",
    "## Story",
    storyText,
    "",
  ];
  if (passageSection) sections.push(passageSection, "");
  sections.push(
    "## Era / Time Period",
    eraLabel(metadata.era),
    "",
    "## Setting",
    describe(setting, setting?.description),
    "",
    "## Themes",
    themes.length ? themes.join(", ") : "None specified.",
    "",
    "## Character Roles",
    roles.length ? roles.join(", ") : "None specified.",
    "",
    "## Symbols",
    symbols.length ? symbols.join(", ") : "None specified.",
    "",
    "## Symbolic Layer Density",
    METAPHOR_DIRECTIVES[(metadata.metaphorDensity ?? 2) - 1] ?? METAPHOR_DIRECTIVES[1],
    "",
    "## Tone Matrix",
    `Emotional Intensity: ${intensity}`,
    `Spiritual Focus: ${focus}`,
    "",
    "## Literary Form",
    describe(form, form?.description),
    "",
    "## Voice Persona",
    describe(persona, persona?.voice),
    "",
    "## Theological Anchor",
    describe(anchor, anchor?.description),
    "",
    "## Biblical Imperative Alignment",
    `${imperative.name} - ${imperative.directive}`,
    "",
    "## Reader's Instruction",
    metadata.userPrompt || "Produce the retelling now, in the chosen form and voice.",
    "",
    "Write only the retelling itself. Do not add commentary, labels, or meta-text.",
  );
  return sections.join("\n");
}
