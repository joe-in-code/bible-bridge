// Layout controller: dock position, panel collapse rails, output resize,
// feedback panel resize/collapse, and reading view. Persisted in localStorage.

const KEY = "bb.layout";
const DOCKS = ["right", "bottom", "left"];
const RAIL = 36;
const FEEDBACK_RAIL = 32;

const state = {
  dock: "right", outW: 360, outH: 320, leftW: 280, leftCollapsed: false, outCollapsed: false, reading: false,
  fbH: 220, fbCollapsed: false,
};
const refs = {};

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "null");
    if (saved && typeof saved === "object") {
      if (DOCKS.includes(saved.dock)) state.dock = saved.dock;
      for (const k of ["outW", "outH", "fbH"]) if (Number.isFinite(saved[k])) state[k] = saved[k];
      state.leftCollapsed = Boolean(saved.leftCollapsed);
      state.outCollapsed = Boolean(saved.outCollapsed);
      state.fbCollapsed = Boolean(saved.fbCollapsed);
    }
  } catch { /* ignore */ }
}

function save() {
  try {
    const { dock, outW, outH, leftCollapsed, outCollapsed, fbH, fbCollapsed } = state;
    localStorage.setItem(KEY, JSON.stringify({ dock, outW, outH, leftCollapsed, outCollapsed, fbH, fbCollapsed }));
  } catch { /* ignore */ }
}

function apply() {
  const { layout, leftPanel, outPanel, app, feedbackPanel } = refs;
  layout.classList.remove(...DOCKS.map((d) => "dock-" + d));
  layout.classList.add("dock-" + state.dock);
  layout.style.setProperty("--left-w", (state.leftCollapsed ? RAIL : state.leftW) + "px");
  layout.style.setProperty("--out-w", (state.outCollapsed ? RAIL : state.outW) + "px");
  layout.style.setProperty("--out-h", (state.outCollapsed ? RAIL : state.outH) + "px");
  app.style.setProperty("--feedback-h", (state.fbCollapsed ? FEEDBACK_RAIL : state.fbH) + "px");
  leftPanel.classList.toggle("collapsed", state.leftCollapsed);
  outPanel.classList.toggle("collapsed", state.outCollapsed);
  feedbackPanel.classList.toggle("collapsed", state.fbCollapsed);
  app.classList.toggle("reading-view", state.reading);

  refs.collapseLeft.textContent = state.leftCollapsed ? "▶" : "◀";
  refs.collapseLeft.title = state.leftCollapsed ? "Expand selectors" : "Collapse selectors";

  const expandedGlyph = { right: "▶", left: "◀", bottom: "▼" }[state.dock];
  const collapsedGlyph = { right: "◀", left: "▶", bottom: "▲" }[state.dock];
  refs.collapseRight.textContent = state.outCollapsed ? collapsedGlyph : expandedGlyph;
  refs.collapseRight.title = state.outCollapsed ? "Expand retelling" : "Collapse retelling";

  refs.collapseFeedback.textContent = state.fbCollapsed ? "▲" : "▼";
  refs.collapseFeedback.title = state.fbCollapsed ? "Expand feedback panel" : "Collapse feedback panel";

  refs.dockBtn.title = `Dock: ${state.dock} (click to cycle)`;
  refs.readingToggle.textContent = state.reading ? "Exit Reading" : "📖";
  refs.readingToggle.title = state.reading ? "Exit Reading View" : "Reading View";
}

export function expandPanel(which) {
  if (which === "left") state.leftCollapsed = false;
  if (which === "out") state.outCollapsed = false;
  if (which === "feedback") state.fbCollapsed = false;
  apply();
  save();
}

export function mountLayout() {
  refs.app = document.getElementById("app");
  refs.layout = document.getElementById("layout");
  refs.leftPanel = document.getElementById("leftPanel");
  refs.outPanel = document.getElementById("outputPanel");
  refs.feedbackPanel = document.getElementById("feedbackPanel");
  refs.collapseLeft = document.getElementById("collapseLeft");
  refs.collapseRight = document.getElementById("collapseRight");
  refs.collapseFeedback = document.getElementById("collapseFeedback");
  refs.dockBtn = document.getElementById("dockBtn");
  refs.readingToggle = document.getElementById("readingToggle");
  refs.handle = document.getElementById("resizeHandle");
  refs.fbHandle = document.getElementById("feedbackResizeHandle");

  load();
  apply();

  refs.collapseLeft.addEventListener("click", () => { state.leftCollapsed = !state.leftCollapsed; apply(); save(); });
  refs.collapseRight.addEventListener("click", () => { state.outCollapsed = !state.outCollapsed; apply(); save(); });
  refs.collapseFeedback.addEventListener("click", () => { state.fbCollapsed = !state.fbCollapsed; apply(); save(); });
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

  // Drag the feedback panel's top edge to resize it. It's pinned to the
  // bottom of the viewport, so the desired height is simply the distance
  // from the pointer to the bottom of the viewport.
  let fbDragging = false;
  refs.fbHandle.addEventListener("pointerdown", (e) => {
    if (state.fbCollapsed) return;
    fbDragging = true;
    refs.fbHandle.setPointerCapture(e.pointerId);
    document.body.style.userSelect = "none";
    e.preventDefault();
  });
  refs.fbHandle.addEventListener("pointermove", (e) => {
    if (!fbDragging) return;
    const vh = document.documentElement.clientHeight;
    state.fbH = Math.max(80, Math.min(Math.max(160, vh - 240), Math.round(vh - e.clientY)));
    apply();
  });
  const fbStop = () => {
    if (!fbDragging) return;
    fbDragging = false;
    document.body.style.userSelect = "";
    save();
  };
  refs.fbHandle.addEventListener("pointerup", fbStop);
  refs.fbHandle.addEventListener("pointercancel", fbStop);
}
