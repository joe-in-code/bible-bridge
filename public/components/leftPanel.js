// Left panel — full selector controls that feed the prompt-generation agent.

export function renderLeftPanel() {
  const body = document.querySelector(".left-panel .panel-body");
  if (!body) return;
  const bridge = window.__bibleBridge;
  const { metadata, DATA } = bridge;
  const stories = DATA.stories.stories;
  const themes = DATA.themes.themes;
  const settings = DATA.settings.settings;
  const roles = DATA.roles.roles;
  const symbols = DATA.symbols.symbols;
  const forms = DATA.forms.forms;
  const personas = DATA.personas.personas;
  const anchors = DATA.anchors.anchors;
  const intensity = DATA.tone.emotional_intensity;
  const focus = DATA.tone.spiritual_focus;

  const storyOpts = stories.map((s) => `<option value="${s.id}" ${metadata.story === s.id ? "selected" : ""}>${s.title} (${s.book} ${s.reference})</option>`).join("");
  const settingOpts = settings.map((s) => `<option value="${s.id}" ${metadata.setting === s.id ? "selected" : ""}>${s.name}</option>`).join("");
  const formOpts = forms.map((f) => `<option value="${f.id}" ${metadata.literaryForm === f.id ? "selected" : ""}>${f.name}</option>`).join("");
  const personaOpts = personas.map((p) => `<option value="${p.id}" ${metadata.persona === p.id ? "selected" : ""}>${p.name}</option>`).join("");
  const anchorOpts = anchors.map((a) => `<option value="${a.id}" ${metadata.anchor === a.id ? "selected" : ""}>${a.name}</option>`).join("");

  const themeChk = themes.map((t) => `<label><input type="checkbox" name="themes" value="${t.id}" ${metadata.themes.includes(t.id) ? "checked" : ""}/> ${t.name}</label>`).join("");
  const roleChk = roles.map((r) => `<label><input type="checkbox" name="roles" value="${r.id}" ${metadata.characterRoles.includes(r.id) ? "checked" : ""}/> ${r.name}</label>`).join("");
  const symbolChk = symbols.map((s) => `<label><input type="checkbox" name="symbols" value="${s.id}" ${metadata.symbols.includes(s.id) ? "checked" : ""}/> ${s.name}</label>`).join("");

  const intensityOpts = intensity.map((e) => `<option value="${e.value}" ${metadata.emotionalIntensity === e.value ? "selected" : ""}>${e.name}</option>`).join("");
  const focusOpts = focus.map((e) => `<option value="${e.value}" ${metadata.spiritualFocus === e.value ? "selected" : ""}>${e.name}</option>`).join("");

  const imperatives = [
    { v: 1, t: "Strict Doctrine" },
    { v: 2, t: "Faithful Interpretation" },
    { v: 3, t: "Inspired Reflection" },
    { v: 4, t: "Symbolic Expansion" },
  ];
  const impOpts = imperatives.map((i) => `<option value="${i.v}" ${metadata.imperativeAlignment === i.v ? "selected" : ""}>${i.t}</option>`).join("");

  body.innerHTML = `
    <div class="selector" id="story">
      <label>Story</label>
      <select data-key="story" data-type="single">${storyOpts}</select>
    </div>
    <div class="selector" id="themes">
      <label>Themes</label>
      <div class="checkbox-grid">${themeChk}</div>
    </div>
    <div class="selector" id="setting">
      <label>Setting</label>
      <select data-key="setting" data-type="single">${settingOpts}</select>
    </div>
    <div class="selector" id="roles">
      <label>Character Roles</label>
      <div class="checkbox-grid">${roleChk}</div>
    </div>
    <div class="selector" id="symbols">
      <label>Symbols</label>
      <div class="checkbox-grid">${symbolChk}</div>
    </div>
    <div class="selector" id="metaphor">
      <label>Symbolic Layer Density</label>
      <div class="slider-row">
        <input type="range" data-key="metaphorDensity" min="1" max="3" step="1" value="${metadata.metaphorDensity}"/>
        <span class="val"></span>
      </div>
    </div>
    <div class="selector" id="tone">
      <label>Tone Matrix</label>
      <div class="tone-axis">
        <div class="row"><label>Emotional Intensity</label><input type="range" data-key="emotionalIntensity" min="1" max="5" step="1" value="${metadata.emotionalIntensity}"/></div>
        <div class="ticks"><span>Calm</span><span>Dramatic</span></div>
        <div class="row"><label>Spiritual Focus</label><input type="range" data-key="spiritualFocus" min="1" max="5" step="1" value="${metadata.spiritualFocus}"/></div>
        <div class="ticks"><span>Subtle</span><span>Explicit</span></div>
      </div>
    </div>
    <div class="selector" id="literaryForm">
      <label>Literary Form</label>
      <select data-key="literaryForm" data-type="single">${formOpts}</select>
    </div>
    <div class="selector" id="persona">
      <label>Voice Persona</label>
      <select data-key="persona" data-type="single">${personaOpts}</select>
    </div>
    <div class="selector" id="anchor">
      <label>Theological Anchor</label>
      <select data-key="anchor" data-type="single">${anchorOpts}</select>
    </div>
    <div class="selector" id="imperative">
      <label>Biblical Imperative Alignment</label>
      <select data-key="imperativeAlignment" data-type="single">${impOpts}</select>
    </div>
  `;
}

export function bindLeftPanel() {
  const body = document.querySelector(".left-panel .panel-body");
  const panel = document.getElementById("leftPanel");
  if (!body) return;
  const bridge = window.__bibleBridge;

  // Collapse / expand the left panel.
  const collapseBtn = document.getElementById("collapseLeft");
  let collapsed = false;
  collapseBtn?.addEventListener("click", () => {
    collapsed = !collapsed;
    panel.classList.toggle("collapsed", collapsed);
    collapseBtn.textContent = collapsed ? "▶" : "◀";
    collapseBtn.title = collapsed ? "Expand" : "Collapse";
  });

  body.querySelectorAll("select[data-key]").forEach((sel) => {
    sel.addEventListener("change", () => {
      const key = sel.dataset.key;
      if (sel.dataset.type === "single") {
        bridge.metadata[key] = sel.value;
      }
      bridge.refreshAll();
    });
  });

  body.querySelectorAll("input[type=checkbox]").forEach((cb) => {
    cb.addEventListener("change", () => {
      const key = cb.name === "themes" ? "themes" : cb.name === "roles" ? "characterRoles" : "symbols";
      const arr = bridge.metadata[key];
      if (cb.checked) {
        if (!arr.includes(cb.value)) arr.push(cb.value);
      } else {
        const i = arr.indexOf(cb.value);
        if (i >= 0) arr.splice(i, 1);
      }
      bridge.refreshAll();
    });
  });

  body.querySelectorAll("input[type=range]").forEach((r) => {
    const updateVal = () => {
      const key = r.dataset.key;
      bridge.metadata[key] = parseInt(r.value, 10);
      const valEl = r.closest(".slider-row")?.querySelector(".val");
      if (valEl) {
        const bridge2 = window.__bibleBridge;
        const labels = {
          metaphorDensity: ["Low", "Moderate", "High"],
          emotionalIntensity: ["Calm", "Steady", "Earnest", "Tense", "Dramatic"],
          spiritualFocus: ["Subtle", "Quiet", "Clear", "Direct", "Explicit"],
        };
        valEl.textContent = labels[key]?.[parseInt(r.value, 10) - 1] || r.value;
      }
      bridge.refreshAll();
    };
    r.addEventListener("input", updateVal);
    r.addEventListener("change", updateVal);
    r.dispatchEvent(new Event("input"));
  });
}