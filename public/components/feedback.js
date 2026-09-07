// Retelling feedback panel — two-column metadata comparison (original vs retelling).
// Updates live as the user interacts with selectors.

const LABELS = {
  story: "Story",
  themes: "Themes",
  setting: "Setting",
  era: "Era",
  anchor: "Anchor",
  emotionalIntensity: "Tone Matrix (Intensity)",
  spiritualFocus: "Tone Matrix (Spiritual Focus)",
  metaphorDensity: "Symbolic Density",
  literaryForm: "Literary Form",
  persona: "Persona",
  imperativeAlignment: "Imperative Alignment",
};

function fmt(v) {
  if (v == null || v === "") return "—";
  if (Array.isArray(v)) return v.length ? v.join(", ") : "None";
  return String(v);
}

export function render() {
  const bridge = window.__bibleBridge;
  const { metadata, DATA } = bridge;
  const story = (DATA.stories.stories || []).find((s) => s.id === metadata.story);
  const persona = (DATA.personas.personas || []).find((p) => p.id === metadata.persona);
  const form = (DATA.forms.forms || []).find((f) => f.id === metadata.literaryForm);
  const anchor = (DATA.anchors.anchors || []).find((a) => a.id === metadata.anchor);
  const eraLabels = ["Ancient", "Kings", "1900s", "Modern", "Future"];
  const intensity = (DATA.tone.emotional_intensity || []).find((e) => e.value === metadata.emotionalIntensity);
  const focus = (DATA.tone.spiritual_focus || []).find((e) => e.value === metadata.spiritualFocus);

  const original = {
    story: story ? `${story.title} (${story.book} ${story.reference})` : "—",
    themes: metadata.themes,
    setting: (DATA.settings.settings || []).find((s) => s.id === metadata.setting)?.name || metadata.setting,
    era: eraLabels[Math.max(0, Math.min(4, Math.round(metadata.era)))] || "Ancient",
    anchor: anchor?.name || metadata.anchor,
    emotionalIntensity: intensity?.name || "—",
    spiritualFocus: focus?.name || "—",
    metaphorDensity: metadata.metaphorDensity,
    literaryForm: form?.name || metadata.literaryForm,
    persona: persona?.name || metadata.persona,
    imperativeAlignment: metadata.imperativeAlignment,
  };

  const retelling = { ...original };

  const col = (data) => Object.entries(LABELS).map(([k, label]) => `
    <dt>${label}</dt>
    <dd>${fmt(data[k])}</dd>
  `).join("");

  document.getElementById("originalMeta").innerHTML = `<dl>${col(original)}</dl>`;
  document.getElementById("retellingMeta").innerHTML = `<dl>${col(retelling)}</dl>`;
}