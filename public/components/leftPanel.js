// Left panel: full selector controls that feed the prompt-generation agent.
// Rendered once; later external changes (carousel presets etc.) sync the
// existing controls in place so sliders never lose focus mid-drag.

import { getData, getMetadata, setMetadata, toggleInList, subscribe, escapeHtml as h } from "../state.js";
import { IMPERATIVES, METAPHOR_LABELS } from "../constants.js";

const SOURCE = "leftPanel";

const option = (value, label) => `<option value="${h(value)}">${h(label)}</option>`;
const checks = (name, list) =>
  list.map((x) => `<label title="${h(x.description || "")}"><input type="checkbox" name="${name}" value="${h(x.id)}"/> ${h(x.name)}</label>`).join("");

function sliderLabels(key) {
  const DATA = getData();
  const names = (list) => list.map((x) => x.name);
  return {
    metaphorDensity: METAPHOR_LABELS,
    emotionalIntensity: names(DATA.tone.emotional_intensity),
    spiritualFocus: names(DATA.tone.spiritual_focus),
  }[key];
}

function render(body) {
  const D = getData();
  body.innerHTML = `
    <div class="selector" id="story"><label for="sel-story">Story</label>
      <select id="sel-story" data-key="story">${D.stories.stories.map((s) => option(s.id, `${s.title} (${s.book} ${s.reference})`)).join("")}</select></div>
    <div class="selector" id="themes"><label>Themes</label><div class="checkbox-grid">${checks("themes", D.themes.themes)}</div></div>
    <div class="selector" id="setting"><label for="sel-setting">Setting</label>
      <select id="sel-setting" data-key="setting">${D.settings.settings.map((s) => option(s.id, s.name)).join("")}</select></div>
    <div class="selector" id="roles"><label>Character Roles</label><div class="checkbox-grid">${checks("characterRoles", D.roles.roles)}</div></div>
    <div class="selector" id="symbols"><label>Symbols</label><div class="checkbox-grid">${checks("symbols", D.symbols.symbols)}</div></div>
    <div class="selector" id="metaphor"><label for="rng-metaphor">Symbolic Layer Density</label>
      <div class="slider-row"><input id="rng-metaphor" type="range" data-key="metaphorDensity" min="1" max="3" step="1"/><span class="val"></span></div></div>
    <div class="selector" id="tone"><label>Tone Matrix</label>
      <div class="tone-axis">
        <div class="row"><label for="rng-intensity">Emotional Intensity</label><input id="rng-intensity" type="range" data-key="emotionalIntensity" min="1" max="5" step="1"/><span class="val"></span></div>
        <div class="ticks"><span>Calm</span><span>Dramatic</span></div>
        <div class="row"><label for="rng-focus">Spiritual Focus</label><input id="rng-focus" type="range" data-key="spiritualFocus" min="1" max="5" step="1"/><span class="val"></span></div>
        <div class="ticks"><span>Subtle</span><span>Explicit</span></div>
      </div></div>
    <div class="selector" id="literaryForm"><label for="sel-form">Literary Form</label>
      <select id="sel-form" data-key="literaryForm">${D.forms.forms.map((f) => option(f.id, f.name)).join("")}</select></div>
    <div class="selector" id="persona"><label for="sel-persona">Voice Persona</label>
      <select id="sel-persona" data-key="persona">${D.personas.personas.map((p) => option(p.id, p.name)).join("")}</select></div>
    <div class="selector" id="anchor"><label for="sel-anchor">Theological Anchor</label>
      <select id="sel-anchor" data-key="anchor">${D.anchors.anchors.map((a) => option(a.id, a.name)).join("")}</select></div>
    <div class="selector" id="imperative"><label for="sel-imperative">Biblical Imperative Alignment</label>
      <select id="sel-imperative" data-key="imperativeAlignment" data-type="number">${IMPERATIVES.map((i) => option(i.value, i.name)).join("")}</select></div>
  `;
}

/** Push the current metadata into the existing controls. */
function sync(body) {
  const m = getMetadata();
  body.querySelectorAll("select[data-key], input[type=range][data-key]").forEach((el) => {
    const v = String(m[el.dataset.key] ?? "");
    if (el.value !== v) el.value = v;
    if (el.type === "range") updateLabel(el);
  });
  const lists = { themes: m.themes, characterRoles: m.characterRoles, symbols: m.symbols };
  body.querySelectorAll("input[type=checkbox]").forEach((cb) => {
    cb.checked = (lists[cb.name] || []).includes(cb.value);
  });
}

function updateLabel(range) {
  const val = range.parentElement.querySelector(".val");
  if (!val) return;
  const labels = sliderLabels(range.dataset.key);
  val.textContent = labels?.[parseInt(range.value, 10) - 1] ?? range.value;
}

export function mountLeftPanel() {
  const body = document.querySelector("#leftPanel .panel-body");
  render(body);
  sync(body);

  body.addEventListener("change", (e) => {
    const el = e.target;
    if (el.matches("input[type=checkbox]")) {
      toggleInList(el.name, el.value, el.checked, SOURCE);
    } else if (el.matches("select[data-key]")) {
      setMetadata({ [el.dataset.key]: el.dataset.type === "number" ? Number(el.value) : el.value }, SOURCE);
    }
  });

  body.addEventListener("input", (e) => {
    const el = e.target;
    if (el.matches("input[type=range][data-key]")) {
      updateLabel(el);
      setMetadata({ [el.dataset.key]: parseInt(el.value, 10) }, SOURCE);
    }
  });

  subscribe((ev) => {
    if (ev.type === "metadata" && ev.source !== SOURCE) sync(body);
  });
}
