// Feedback panel: original story facts (left) vs the retelling's metadata (right).

import { getData, getMetadata, getRetelling, subscribe, byId, escapeHtml as h } from "../state.js";
import { eraLabel, IMPERATIVES, METAPHOR_LABELS } from "../constants.js";

const FIELDS = [
  ["story", "Story"],
  ["themes", "Themes"],
  ["setting", "Setting"],
  ["era", "Era"],
  ["characterRoles", "Character Roles"],
  ["symbols", "Symbols"],
  ["metaphorDensity", "Symbolic Density"],
  ["emotionalIntensity", "Tone Matrix (Intensity)"],
  ["spiritualFocus", "Tone Matrix (Spiritual Focus)"],
  ["literaryForm", "Literary Form"],
  ["persona", "Persona"],
  ["anchor", "Anchor"],
  ["imperativeAlignment", "Imperative Alignment"],
];

const names = (list, ids) => ids.map((id) => byId(list, id)?.name).filter(Boolean);

/** Human-readable value for one metadata field. */
function display(key, m) {
  const D = getData();
  switch (key) {
    case "story": { const s = byId(D.stories.stories, m.story); return s ? `${s.title} (${s.book} ${s.reference})` : ""; }
    case "themes": return names(D.themes.themes, m.themes).join(", ") || "None";
    case "setting": return byId(D.settings.settings, m.setting)?.name ?? "";
    case "era": return eraLabel(m.era);
    case "characterRoles": return names(D.roles.roles, m.characterRoles).join(", ") || "None";
    case "symbols": return names(D.symbols.symbols, m.symbols).join(", ") || "None";
    case "metaphorDensity": return METAPHOR_LABELS[m.metaphorDensity - 1] ?? "";
    case "emotionalIntensity": return byId(D.tone.emotional_intensity, m.emotionalIntensity, "value")?.name ?? "";
    case "spiritualFocus": return byId(D.tone.spiritual_focus, m.spiritualFocus, "value")?.name ?? "";
    case "literaryForm": return byId(D.forms.forms, m.literaryForm)?.name ?? "";
    case "persona": return byId(D.personas.personas, m.persona)?.name ?? "";
    case "anchor": return byId(D.anchors.anchors, m.anchor)?.name ?? "";
    case "imperativeAlignment": return IMPERATIVES.find((i) => i.value === m.imperativeAlignment)?.name ?? "";
    default: return "";
  }
}

const sameValue = (a, b) => JSON.stringify(a) === JSON.stringify(b);
let renderedStory;

export function render() {
  const D = getData();
  const live = getMetadata();
  const r = getRetelling();
  const shown = r ? r.metadata : live;

  // Original story column: the facts of the source text.
  const story = byId(D.stories.stories, live.story);
  const passage = story ? D.passages?.passages?.[story.id] : null;
  if (story?.id !== renderedStory) {
    renderedStory = story?.id;
    document.getElementById("originalMeta").innerHTML = story
    ? `<dl>
        <dt>Story</dt><dd>${h(story.title)}</dd>
        <dt>Reference</dt><dd>${h(story.book)} ${h(story.reference)}</dd>
        <dt>Summary</dt><dd>${h(story.summary)}</dd>
        ${passage ? `<dt>Source Text (${h(D.passages.translation || "WEB")})</dt>
        <dd><details><summary>${h(passage.reference)}${passage.excerpted ? " (excerpt)" : ""}</summary><div class="passage">${h(passage.text)}</div></details></dd>` : ""}
      </dl>`
    : "<p>No story selected.</p>";
  }

  // Retelling column: snapshot of what was generated (or the live selection until then).
  const rows = FIELDS.map(([key, label]) => {
    const changed = r && !sameValue(shown[key], live[key]);
    const hint = changed ? ` <span class="changed" title="Selection changed since this retelling">now: ${h(display(key, live))}</span>` : "";
    return `<dt>${label}</dt><dd>${h(display(key, shown))}${hint}</dd>`;
  }).join("");
  const note = r
    ? `<p class="feedback-note">Metadata used for the current retelling${r.placeholder ? " (placeholder)" : ""}.</p>`
    : `<p class="feedback-note">Live selection. No retelling generated yet.</p>`;
  document.getElementById("retellingMeta").innerHTML = `${note}<dl>${rows}</dl>`;
}

export function mountFeedback() {
  subscribe((ev) => {
    if (ev.type === "metadata" && ev.keys.length === 1 && ev.keys[0] === "userPrompt") return;
    if (ev.type === "metadata" || ev.type === "retelling") render();
  });
  render();
}
