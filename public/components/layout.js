// Layout controller: dock position, panel collapse rails, output resize,
// and reading view. Persisted in localStorage.

const KEY = "bb.layout";
const DOCKS = ["right", "bottom", "left"];
const RAIL = 36;

const state = { dock: "right", outW: 360, outH: 320, leftW: 280, leftCollapsed: false, outCollapsed: false, reading: false };
const refs = {};

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "null");
    if (saved && typeof saved === "object") {
      if (DOCKS.includes(saved.dock)) state.dock = saved.dock;
      for (const k of ["outW", "outH"]) if (Number.isFinite(saved[k])) state[k] = saved[k];
      state.leftCollapsed = Boolean(saved.leftCollapsed);
      state.outCollapsed = Boolean(saved.outCollapsed);
    }
  } catch { /* ignore */ }
}

function save() {
  try {
    const { dock, outW, outH, leftCollapsed, outCollapsed } = state;
    localStorage.setItem(KEY, JSON.stringify({ dock, outW, outH, leftCollapsed, outCollapsed }));
  } catch { /* ignore */ }
}

function apply() {
  const { layout, leftPanel, outPanel, app } = refs;
  layout.classList.remove(...DOCKS.map((d) => "dock-" + d));
  layout.classList.add("dock-" + state.dock);
  layout.style.setProperty("--left-w", (state.leftCollapsed ? RAIL : state.leftW) + "px");
  layout.style.setProperty("--out-w", (state.outCollapsed ? RAIL : state.outW) + "px");
  layout.style.setProperty("--out-h", (state.outCollapsed ? RAIL : state.outH) + "px");
  leftPanel.classList.toggle("collapsed", state.leftCollapsed);
  outPanel.classList.toggle("collapsed", state.outCollapsed);
  app.classList.toggle("reading-view", state.reading);

  refs.collapseLeft.textContent = state.leftCollapsed ? "▶" : "◀";
  refs.collapseLeft.title = state.leftCollapsed ? "Expand selectors" : "Collapse selectors";

  const expandedGlyph = { right: "▶", left: "◀", bottom: "▼" }[state.dock];
  const collapsedGlyph = { right: "◀", left: "▶", bottom: "▲" }[state.dock];
  refs.collapseRight.textContent = state.outCollapsed ? collapsedGlyph : expandedGlyph;
  refs.collapseRight.title = state.outCollapsed ? "Expand retelling" : "Collapse retelling";

  refs.dockBtn.title = `Dock: ${state.dock} (click to cycle)`;
  refs.readingToggle.textContent = state.reading ? "Exit Reading" : "📖";
  refs.readingToggle.title = state.reading ? "Exit Reading View" : "Reading View";
}

export function expandPanel(which) {
  if (which === "left") state.leftCollapsed = false;
  if (which === "out") state.outCollapsed = false;
  apply();
  save();
}

export function mountLayout() {
  refs.app = document.getElementById("app");
  refs.layout = document.getElementById("layout");
  refs.leftPanel = document.getElementById("leftPanel");
  refs.outPanel = document.getElementById("outputPanel");
  refs.collapseLeft = document.getElementById("collapseLeft");
  refs.collapseRight = document.getElementById("collapseRight");
  refs.dockBtn = document.getElementById("dockBtn");
  refs.readingToggle = document.getElementById("readingToggle");
  refs.handle = document.getElementById("resizeHandle");

  load();
  apply();

  refs.collapseLeft.addEventListener("click", () => { state.leftCollapsed = !state.leftCollapsed; apply(); save(); });
  refs.collapseRight.addEventListener("click", () => { state.outCollapsed = !state.outCollapsed; apply(); save(); });
  refs.dockBtn.addEventListener("click", () => {
    state.dock = DOCKS[(DOCKS.indexOf(state.dock) + 1) % DOCKS.length];
    apply(); save();
  });
  refs.readingToggle.addEventListener("click", () => {
    state.reading = !state.reading;
    if (state.reading) state.outCollapsed = false;
    apply();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && state.reading) { state.reading = false; apply(); }
  });

  // Drag the handle to resize the output panel.
  let dragging = false;
  refs.handle.addEventListener("pointerdown", (e) => {
    if (state.outCollapsed) return;
    dragging = true;
    refs.handle.setPointerCapture(e.pointerId);
    document.body.style.userSelect = "none";
    e.preventDefault();
  });
  refs.handle.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const rect = refs.layout.getBoundingClientRect();
    if (state.dock === "bottom") {
      state.outH = Math.max(120, Math.min(rect.height - 120, rect.bottom - e.clientY));
    } else {
      const w = state.dock === "right" ? rect.right - e.clientX : e.clientX - rect.left;
      state.outW = Math.max(220, Math.min(Math.max(220, rect.width - 480), w));
    }
    apply();
  });
  const stop = () => {
    if (!dragging) return;
    dragging = false;
    document.body.style.userSelect = "";
    save();
  };
  refs.handle.addEventListener("pointerup", stop);
  refs.handle.addEventListener("pointercancel", stop);
}
