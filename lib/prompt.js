// Prompt-generation agent: turns sanitized metadata plus a resolved subject
// (lib/subject.js — either a curated story or a live-fetched custom
// reference) into a structured prompt. Opt-in fields that are null (the
// reader left the control off) are omitted entirely — no "Not specified"
// filler and no default value — so an unselected control never shapes the
// retelling. Only the subject, its source passage, and the reader's
// instruction are always present.

import {
  eraLabel,
  IMPERATIVES,
  METAPHOR_DIRECTIVES,
} from "../public/constants.js";

export const PASSAGE_CHAR_CAP = 9000;

const find = (list, key, value) => (list || []).find((x) => x[key] === value) ?? null;
const named = (list, idList) => (idList || []).map((id) => find(list, "id", id)?.name).filter(Boolean);

export function buildPrompt(metadata, data, subject = null) {
  const storyText = subject
    ? `The passage being retold is "${subject.title}" (${subject.book} ${subject.reference}).${subject.summary ? " " + subject.summary : ""}`
    : "A biblical passage chosen by the reader.";

  let passageSection = null;
  if (subject?.passageText) {
    let text = subject.passageText.trim();
    let note = subject.excerpted ? " (excerpt of a longer passage)" : "";
    if (text.length > PASSAGE_CHAR_CAP) {
      text = text.slice(0, PASSAGE_CHAR_CAP).replace(/\s+\S*$/, "") + " [...]";
      note = " (truncated)";
    }
    passageSection = [
      `## Source Passage (${subject.translation || "WEB"} - ${subject.book} ${subject.reference})${note}`,
      text,
      "",
      "Stay faithful to the events, characters, and sequence of this passage. Do not invent doctrine or contradict the text.",
    ].join("\n");
  }

  const themes = named(data.themes.themes, metadata.themes);
  const symbols = named(data.symbols.symbols, metadata.symbols);
  const roles = named(data.roles.roles, metadata.characterRoles);

  const setting = metadata.setting != null ? find(data.settings.settings, "id", metadata.setting) : null;
  const persona = metadata.persona != null ? find(data.personas.personas, "id", metadata.persona) : null;
  const form = metadata.literaryForm != null ? find(data.forms.forms, "id", metadata.literaryForm) : null;
  const anchor = metadata.anchor != null ? find(data.anchors.anchors, "id", metadata.anchor) : null;
  const intensity = metadata.emotionalIntensity != null ? find(data.tone.emotional_intensity, "value", metadata.emotionalIntensity) : null;
  const focus = metadata.spiritualFocus != null ? find(data.tone.spiritual_focus, "value", metadata.spiritualFocus) : null;
  const imperative = metadata.imperativeAlignment != null ? IMPERATIVES.find((i) => i.value === metadata.imperativeAlignment) : null;

  const describe = (item, extra) => `${item.name}${extra ? " - " + extra : ""}`;

  const sections = [
    "You are Bible-Bridge, a guide for creative biblical retelling that preserves theological integrity.",
    "Write a retelling using the following structured metadata. Treat every field as a deliberate constraint; fields that are absent were left open by the reader, so use your own good judgment for them.",
    "",
    "## Story",
    storyText,
    "",
  ];
  let anyOptional = false;
  const addSection = (heading, body) => {
    anyOptional = true;
    sections.push(heading, body, "");
  };

  if (passageSection) sections.push(passageSection, "");
  if (metadata.era != null) addSection("## Era / Time Period", eraLabel(metadata.era));
  if (setting) addSection("## Setting", describe(setting, setting.description));
  if (themes.length) addSection("## Themes", themes.join(", "));
  if (roles.length) addSection("## Character Roles", roles.join(", "));
  if (symbols.length) addSection("## Symbols", symbols.join(", "));
  if (metadata.metaphorDensity != null) addSection("## Symbolic Layer Density", METAPHOR_DIRECTIVES[metadata.metaphorDensity - 1]);
  if (intensity || focus) {
    const lines = [];
    if (intensity) lines.push(`Emotional Intensity: ${intensity.name}`);
    if (focus) lines.push(`Spiritual Focus: ${focus.name}`);
    addSection("## Tone Matrix", lines.join("\n"));
  }
  if (form) addSection("## Literary Form", describe(form, form.description));
  if (persona) addSection("## Voice Persona", describe(persona, persona.voice));
  if (anchor) addSection("## Theological Anchor", describe(anchor, anchor.description));
  if (imperative) addSection("## Biblical Imperative Alignment", `${imperative.name} - ${imperative.directive}`);

  sections.push(
    "## Reader's Instruction",
    metadata.userPrompt || (anyOptional ? "Produce the retelling now, honoring the fields above." : "Retell this passage plainly and faithfully."),
    "",
    "Write only the retelling itself. Do not add commentary, labels, or meta-text.",
  );
  return sections.join("\n");
}
