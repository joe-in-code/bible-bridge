// Feedback panel: original story facts (left) vs the retelling's metadata (right).
// Values use the effective (sent-to-AI) form: a disabled field reads "Not set",
// not its remembered-but-unsent value. The "subject" may be a curated story
// or a reference detected from chat (see ../storyMatch.js); the server
// resolves the latter and returns the fetched text as `retelling.subject`.

import { getData, getMetadata, getRetelling, effectiveMetadata, subscribe, byId, escapeHtml as h } from "../state.js";
import { eraLabel, IMPERATIVES, METAPHOR_LABELS } from "../constants.js";

const FIELDS = [
  ["story", "Story / Passage"],
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
const NOT_SET = "Not set";

const names = (list, ids) => ids.map((id) => byId(list, id)?.name).filter(Boolean);

/** Human-readable value for one effective-metadata field (null means "not set"). */
function display(key, m) {
  const D = getData();
  switch (key) {
    case "story": {
      const s = byId(D.stories.stories, m.story);
      if (s) return `${s.title} (${s.book} ${s.reference})`;
      if (m.customReference) return `${m.customReference.book} ${m.customReference.reference} (from chat)`;
      return NOT_SET;
    }
    case "themes": return names(D.themes.themes, m.themes).join(", ") || "None";
    case "setting": return m.setting == null ? NOT_SET : byId(D.settings.settings, m.setting)?.name ?? NOT_SET;
    case "era": return m.era == null ? NOT_SET : eraLabel(m.era);
    case "characterRoles": return names(D.roles.roles, m.characterRoles).join(", ") || "None";
    case "symbols": return names(D.symbols.symbols, m.symbols).join(", ") || "None";
    case "metaphorDensity": return m.metaphorDensity == null ? NOT_SET : METAPHOR_LABELS[m.metaphorDensity - 1] ?? NOT_SET;
    case "emotionalIntensity": return m.emotionalIntensity == null ? NOT_SET : byId(D.tone.emotional_intensity, m.emotionalIntensity, "value")?.name ?? NOT_SET;
    case "spiritualFocus": return m.spiritualFocus == null ? NOT_SET : byId(D.tone.spiritual_focus, m.spiritualFocus, "value")?.name ?? NOT_SET;
    case "literaryForm": return m.literaryForm == null ? NOT_SET : byId(D.forms.forms, m.literaryForm)?.name ?? NOT_SET;
    case "persona": return m.persona == null ? NOT_SET : byId(D.personas.personas, m.persona)?.name ?? NOT_SET;
    case "anchor": return m.anchor == null ? NOT_SET : byId(D.anchors.anchors, m.anchor)?.name ?? NOT_SET;
    case "imperativeAlignment": return m.imperativeAlignment == null ? NOT_SET : IMPERATIVES.find((i) => i.value === m.imperativeAlignment)?.name ?? NOT_SET;
    default: return "";
  }
}

const sameValue = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const sameRef = (a, b) => a && b && a.book === b.book && a.reference === b.reference;
let renderedKey;

/** The fetched subject for the current reference, if we have it (from the latest retelling). */
function fetchedCustomSubject(live) {
  const r = getRetelling();
  if (!live.customReference || !r?.subject?.custom) return null;
  return sameRef(r.subject, live.customReference) ? r.subject : null;
}

export function render() {
  const D = getData();
  const live = effectiveMetadata(getMetadata());
  const r = getRetelling();
  const shown = r ? r.metadata : live;

  // Original story column: the facts of the source text.
  const story = byId(D.stories.stories, live.story);
  const curatedPassage = story ? D.passages?.passages?.[story.id] : null;
  const customSubject = fetchedCustomSubject(live);
  const originalCacheKey = story ? `story:${story.id}` : live.customReference ? `ref:${live.customReference.book} ${live.customReference.reference}:${customSubject ? "fetched" : "pending"}` : null;

  if (originalCacheKey !== renderedKey) {
    renderedKey = originalCacheKey;
    const originalMeta = document.getElementById("originalMeta");
    if (story) {
      originalMeta.innerHTML = `<dl>
        <dt>Story</dt><dd>${h(story.title)}</dd>
        <dt>Reference</dt><dd>${h(story.book)} ${h(story.reference)}</dd>
        <dt>Summary</dt><dd>${h(story.summary)}</dd>
        ${curatedPassage ? `<dt>Source Text (${h(D.passages.translation || "WEB")})</dt>
        <dd><details><summary>${h(curatedPassage.reference)}${curatedPassage.excerpted ? " (excerpt)" : ""}</summary><div class="passage">${h(curatedPassage.text)}</div></details></dd>` : ""}
      </dl>`;
    } else if (live.customReference) {
      const ref = live.customReference;
      originalMeta.innerHTML = `<dl>
        <dt>Passage (detected from chat)</dt><dd>${h(ref.book)} ${h(ref.reference)}</dd>
        ${customSubject
          ? `<dt>Source Text (${h(customSubject.translation || "WEB")})</dt><dd><details open><summary>${h(customSubject.book)} ${h(customSubject.reference)}</summary><div class="passage">${h(customSubject.passageText)}</div></details></dd>`
          : `<dd class="feedback-note">The text will be fetched live from a public-domain Bible API when you press Retell.</dd>`}
      </dl>`;
    } else {
      originalMeta.innerHTML = `<p class="feedback-note">Choose a story, or type a story name / Bible reference in chat.</p>`;
    }
  }

  // Retelling column: snapshot of what was generated (or the live effective
  // selection until then). A field is flagged as "changed" if its effective
  // value (including whether it's on at all) differs from the live one. The
  // "story" row compares the whole subject (story id OR custom reference),
  // since either one alone can be null while the other carries the identity.
  const subjectKey = (m) => (m.story ? `s:${m.story}` : m.customReference ? `r:${m.customReference.book}|${m.customReference.reference}` : "none");
  const rows = FIELDS.map(([key, label]) => {
    const changed = r && (key === "story" ? subjectKey(shown) !== subjectKey(live) : !sameValue(shown[key], live[key]));
    const shownText = display(key, shown);
    const notSetClass = shownText === NOT_SET ? " not-set" : "";
    const hint = changed ? ` <span class="changed" title="Selection changed since this retelling">now: ${h(display(key, live))}</span>` : "";
    return `<dt>${label}</dt><dd class="${notSetClass.trim()}">${h(shownText)}${hint}</dd>`;
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
