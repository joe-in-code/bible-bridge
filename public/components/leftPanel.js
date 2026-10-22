// Left panel: full selector controls that feed the prompt-generation agent.
// Rendered once; later external changes (carousel presets etc.) sync the
// existing controls in place so sliders never lose focus mid-drag.
//
// Every single-value control (setting, density, tone axes, form, persona,
// anchor, imperative) has an enable switch, default off. Off controls are
// greyed out and excluded from what gets sent to the AI (see
// state.effectiveMetadata). Story has no switch — it is always required,
// but it (or a chat-detected reference) can come from typing in chat instead
// of picking here; see ../storyMatch.js and components/chat.js.
//
// Every control carries a short description, both as a native hover tooltip
// (the `title` attribute) and as a visible caption under the control that
// updates to describe whatever is currently selected.

import { getData, getMetadata, setMetadata, setSubject, setEnabled, toggleInList, subscribe, byId, escapeHtml as h } from "../state.js";
import { IMPERATIVES, METAPHOR_LABELS, METAPHOR_DIRECTIVES } from "../constants.js";

const SOURCE = "leftPanel";

// Static, always-visible explanation of each control's purpose.
const HINT = {
  story: "The Bible passage to retell.",
  themes: "Theological themes to emphasize (optional — pick none to let the text decide).",
  setting: "Where the retelling takes place.",
  roles: "Character types to foreground (optional).",
  symbols: "Recurring images to weave through the retelling (optional).",
  metaphorDensity: "How richly symbolic and layered the retelling's imagery should be.",
  emotionalIntensity: "How emotionally charged the telling feels, from calm to dramatic.",
  spiritualFocus: "How plainly the spiritual meaning is stated, from subtle to explicit.",
  literaryForm: "The literary shape the retelling takes.",
  persona: "The narrating voice's character.",
  anchor: "The faith tradition whose emphasis shapes the interpretation.",
  imperativeAlignment: "How freely the retelling may interpret the text versus stay literal.",
};

const option = (value, label, desc) => `<option value="${h(value)}" title="${h(desc || "")}">${h(label)}</option>`;
const checks = (name, list) =>
  list.map((x) => `<label title="${h(x.description || x.meaning || "")}"><input type="checkbox" name="${name}" value="${h(x.id)}"/> ${h(x.name)}</label>`).join("");
const toggle = (key, title) =>
  `<label class="switch" title="${h(title)}"><input type="checkbox" data-enable="${key}" aria-label="${h(title)}" /></label>`;
const desc = (key, extra) => `<p class="field-desc" data-desc="${key}">${h(HINT[key])}${extra ? ` — ${h(extra)}` : ""}</p>`;

function sliderLabels(key) {
  const DATA = getData();
  const names = (list) => list.map((x) => x.name);
  return {
    metaphorDensity: METAPHOR_LABELS,
    emotionalIntensity: names(DATA.tone.emotional_intensity),
    spiritualFocus: names(DATA.tone.spiritual_focus),
  }[key];
}

// For each select-backed field, how to find the currently selected item's
// own description text (for the live caption and the select's own tooltip).
const ITEM_DESC = {
  setting: (id) => byId(getData().settings.settings, id)?.description,
  literaryForm: (id) => byId(getData().forms.forms, id)?.description,
  persona: (id) => byId(getData().personas.personas, id)?.voice,
  anchor: (id) => byId(getData().anchors.anchors, id)?.description,
  imperativeAlignment: (id) => IMPERATIVES.find((i) => i.value === id)?.directive,
  metaphorDensity: (id) => METAPHOR_DIRECTIVES[id - 1],
  emotionalIntensity: (id) => byId(getData().tone.emotional_intensity, id, "value")?.description,
  spiritualFocus: (id) => byId(getData().tone.spiritual_focus, id, "value")?.description,
};

function render(body) {
  const D = getData();
  body.innerHTML = `
    <div class="selector" id="story">
      <label for="sel-story">Story <span class="required">*</span></label>
      <select id="sel-story" data-key="story" title="${h(HINT.story)}">
        <option value="">Choose a story…</option>
        ${D.stories.stories.map((s) => option(s.id, `${s.title} (${s.book} ${s.reference})`, s.summary)).join("")}
      </select>
      ${desc("story")}
      <p class="custom-ref-note" id="customRefNote" hidden></p>
    </div>
    <div class="selector" id="themes"><label>Themes</label>${desc("themes")}<div class="checkbox-grid">${checks("themes", D.themes.themes)}</div></div>
    <div class="selector" id="setting">
      <div class="field">
        <div class="label-row"><label for="sel-setting">Setting</label>${toggle("setting", "Enable setting")}</div>
        <select id="sel-setting" data-key="setting" disabled title="${h(HINT.setting)}">${D.settings.settings.map((s) => option(s.id, s.name, s.description)).join("")}</select>
        ${desc("setting")}
      </div>
    </div>
    <div class="selector" id="roles"><label>Character Roles</label>${desc("roles")}<div class="checkbox-grid">${checks("characterRoles", D.roles.roles)}</div></div>
    <div class="selector" id="symbols"><label>Symbols</label>${desc("symbols")}<div class="checkbox-grid">${checks("symbols", D.symbols.symbols)}</div></div>
    <div class="selector" id="metaphor">
      <div class="field">
        <div class="label-row"><label for="rng-metaphor">Symbolic Layer Density</label>${toggle("metaphorDensity", "Enable symbolic layer density")}</div>
        <div class="slider-row"><input id="rng-metaphor" type="range" data-key="metaphorDensity" min="1" max="3" step="1" disabled title="${h(HINT.metaphorDensity)}"/><span class="val"></span></div>
        ${desc("metaphorDensity")}
      </div>
    </div>
    <div class="selector" id="tone"><label>Tone Matrix</label>
      <div class="tone-axis">
        <div class="field">
          <div class="label-row"><label for="rng-intensity">Emotional Intensity</label>${toggle("emotionalIntensity", "Enable emotional intensity")}</div>
          <div class="row"><input id="rng-intensity" type="range" data-key="emotionalIntensity" min="1" max="5" step="1" disabled title="${h(HINT.emotionalIntensity)}"/><span class="val"></span></div>
          <div class="ticks"><span>Calm</span><span>Dramatic</span></div>
          ${desc("emotionalIntensity")}
        </div>
        <div class="field">
          <div class="label-row"><label for="rng-focus">Spiritual Focus</label>${toggle("spiritualFocus", "Enable spiritual focus")}</div>
          <div class="row"><input id="rng-focus" type="range" data-key="spiritualFocus" min="1" max="5" step="1" disabled title="${h(HINT.spiritualFocus)}"/><span class="val"></span></div>
          <div class="ticks"><span>Subtle</span><span>Explicit</span></div>
          ${desc("spiritualFocus")}
        </div>
      </div>
    </div>
    <div class="selector" id="literaryForm">
      <div class="field">
        <div class="label-row"><label for="sel-form">Literary Form</label>${toggle("literaryForm", "Enable literary form")}</div>
        <select id="sel-form" data-key="literaryForm" disabled title="${h(HINT.literaryForm)}">${D.forms.forms.map((f) => option(f.id, f.name, f.description)).join("")}</select>
        ${desc("literaryForm")}
      </div>
    </div>
    <div class="selector" id="persona">
      <div class="field">
        <div class="label-row"><label for="sel-persona">Voice Persona</label>${toggle("persona", "Enable voice persona")}</div>
        <select id="sel-persona" data-key="persona" disabled title="${h(HINT.persona)}">${D.personas.personas.map((p) => option(p.id, p.name, p.voice)).join("")}</select>
        ${desc("persona")}
      </div>
    </div>
    <div class="selector" id="anchor">
      <div class="field">
        <div class="label-row"><label for="sel-anchor">Theological Anchor</label>${toggle("anchor", "Enable theological anchor")}</div>
        <select id="sel-anchor" data-key="anchor" disabled title="${h(HINT.anchor)}">${D.anchors.anchors.map((a) => option(a.id, a.name, a.description)).join("")}</select>
        ${desc("anchor")}
      </div>
    </div>
    <div class="selector" id="imperative">
      <div class="field">
        <div class="label-row"><label for="sel-imperative">Biblical Imperative Alignment</label>${toggle("imperativeAlignment", "Enable imperative alignment")}</div>
        <select id="sel-imperative" data-key="imperativeAlignment" data-type="number" disabled title="${h(HINT.imperativeAlignment)}">${IMPERATIVES.map((i) => option(i.value, i.name, i.directive)).join("")}</select>
        ${desc("imperativeAlignment")}
      </div>
    </div>
  `;
}

function updateDesc(key, item) {
  const el = document.querySelector(`.field-desc[data-desc="${key}"]`);
  if (!el) return;
  const extra = item;
  el.innerHTML = `${h(HINT[key])}${extra ? ` — ${h(extra)}` : ""}`;
}

/** Push the current metadata into the existing controls. */
function sync(body) {
  const m = getMetadata();
  body.querySelector("#sel-story").value = m.story ?? "";
  body.querySelector("#story").classList.toggle("needs-attention", !m.story && !m.customReference);
  const story = byId(getData().stories.stories, m.story);
  updateDesc("story", story?.summary);

  const note = document.getElementById("customRefNote");
  if (m.customReference && !m.story) {
    note.hidden = false;
    note.innerHTML = `Using a passage detected from chat: <strong>${h(m.customReference.display)}</strong> <button type="button" id="clearCustomRef">clear</button>`;
  } else {
    note.hidden = true;
    note.innerHTML = "";
  }

  body.querySelectorAll("select[data-key]:not(#sel-story), input[type=range][data-key]").forEach((el) => {
    const v = String(m[el.dataset.key] ?? "");
    if (el.value !== v) el.value = v;
    if (el.type === "range") updateLabel(el);
    const getItemDesc = ITEM_DESC[el.dataset.key];
    if (getItemDesc) {
      const raw = el.type === "range" || el.dataset.type === "number" ? Number(el.value) : el.value;
      updateDesc(el.dataset.key, getItemDesc(raw));
    }
  });

  body.querySelectorAll("[data-enable]").forEach((sw) => {
    const key = sw.dataset.enable;
    const on = Boolean(m.enabled?.[key]);
    sw.checked = on;
    sw.closest(".field").classList.toggle("off", !on);
    // data-key is unique per field, so this targets exactly the control this switch governs.
    document.querySelectorAll(`#leftPanel [data-key="${key}"]`).forEach((c) => (c.disabled = !on));
  });

  const lists = { themes: m.themes, characterRoles: m.characterRoles, symbols: m.symbols };
  body.querySelectorAll("input[type=checkbox]:not([data-enable])").forEach((cb) => {
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

  body.addEventListener("click", (e) => {
    if (e.target.id === "clearCustomRef") setSubject({ story: null, customReference: null }, SOURCE);
  });

  body.addEventListener("change", (e) => {
    const el = e.target;
    if (el.matches("[data-enable]")) {
      setEnabled(el.dataset.enable, el.checked, SOURCE);
    } else if (el.matches("input[type=checkbox]")) {
      toggleInList(el.name, el.value, el.checked, SOURCE);
    } else if (el.matches("#sel-story")) {
      setSubject({ story: el.value || null }, SOURCE);
    } else if (el.matches("select[data-key]")) {
      setMetadata({ [el.dataset.key]: el.dataset.type === "number" ? Number(el.value) : el.value }, SOURCE);
    } else {
      return;
    }
    // These are discrete, single-fire events (not a slider drag), so it's safe
    // and necessary to reflect side effects (disabled state, needs-attention,
    // .off dimming, captions) immediately rather than waiting for an external source.
    sync(body);
  });

  body.addEventListener("input", (e) => {
    const el = e.target;
    if (el.matches("input[type=range][data-key]")) {
      updateLabel(el);
      setMetadata({ [el.dataset.key]: parseInt(el.value, 10) }, SOURCE);
      const getItemDesc = ITEM_DESC[el.dataset.key];
      if (getItemDesc) updateDesc(el.dataset.key, getItemDesc(parseInt(el.value, 10)));
    }
  });

  subscribe((ev) => {
    if (ev.type === "metadata" && ev.source !== SOURCE) sync(body);
  });
}
