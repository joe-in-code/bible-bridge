// Retelling output panel — dockable, resizable, with reading view and styling controls.

let dockPosition = "right"; // right | bottom | left
let isReadingView = false;

export function bindOutputPanel() {
  const bridge = window.__bibleBridge;
  bridge.outputBody = document.getElementById("outputBody");
  const panel = document.getElementById("outputPanel");
  const layout = document.querySelector(".layout");
  const root = document.getElementById("app");
  const replayBtn = document.getElementById("replayBtn");
  const dockBtn = document.getElementById("dockBtn");
  const readingToggle = document.getElementById("readingToggle");
  const collapseRight = document.getElementById("collapseRight");
  const fontSize = document.getElementById("fontSize");
  const fontColor = document.getElementById("fontColor");
  const bgColor = document.getElementById("bgColor");
  const lineSpacing = document.getElementById("lineSpacing");
  const typeface = document.getElementById("typeface");

  // Expose the output body for the chat component.
  window.__bibleBridge.outputBody = bridge.outputBody;

  function applyStyling() {
    const body = bridge.outputBody;
    body.style.fontSize = fontSize.value + "px";
    body.style.color = fontColor.value;
    body.style.lineSpacing = lineSpacing.value;
    body.style.fontFamily = typeface.value;
    const panelEl = document.querySelector(".output-panel");
    if (panelEl) panelEl.style.background = bgColor.value;
    root.style.background = bgColor.value;
  }

  fontSize.addEventListener("input", applyStyling);
  fontColor.addEventListener("input", applyStyling);
  bgColor.addEventListener("input", applyStyling);
  lineSpacing.addEventListener("input", applyStyling);
  typeface.addEventListener("change", applyStyling);
  applyStyling();

  function toggleReadingView() {
    isReadingView = !isReadingView;
    root.classList.toggle("reading-view", isReadingView);
    readingToggle.textContent = isReadingView ? "Exit Reading" : "📖";
    readingToggle.title = isReadingView ? "Exit Reading View" : "Reading View";
  }
  readingToggle.addEventListener("click", toggleReadingView);

  function cycleDock() {
    const order = ["right", "bottom", "left"];
    dockPosition = order[(order.indexOf(dockPosition) + 1) % order.length];
    applyDock();
  }
  dockBtn.addEventListener("click", cycleDock);

  function applyDock() {
    layout.classList.remove("dock-right", "dock-bottom", "dock-left");
    layout.classList.add("dock-" + dockPosition);
    dockBtn.title = `Dock: ${dockPosition} (click to cycle)`;
  }
  applyDock();

  // Resizable border — drag the left edge of the output panel when docked right/left.
  let dragging = false;
  panel.addEventListener("mousedown", (e) => {
    if (dockPosition === "bottom") return;
    if (e.offsetX > 8) return; // only the left edge
    dragging = true;
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";
    e.preventDefault();
  });
  document.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const rect = layout.getBoundingClientRect();
    let w;
    if (dockPosition === "right") {
      w = rect.right - e.clientX;
    } else {
      w = e.clientX - rect.left;
    }
    w = Math.max(180, Math.min(600, w));
    panel.style.width = w + "px";
  });
  document.addEventListener("mouseup", () => {
    if (dragging) {
      dragging = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
  });

  // Collapse / expand the panel.
  let collapsed = false;
  collapseRight.addEventListener("click", () => {
    collapsed = !collapsed;
    panel.classList.toggle("collapsed", collapsed);
    collapseRight.textContent = collapsed ? "▶" : "◀";
    collapseRight.title = collapsed ? "Expand" : "Collapse";
  });

  // Creative Replay — regenerate with a touch of variation.
  replayBtn.addEventListener("click", async () => {
    const bridge = window.__bibleBridge;
    if (!bridge.outputBody.textContent.trim()) return;
    const meta = { ...bridge.metadata };
    // Introduce a small variation so the model produces a different telling.
    meta.userPrompt = (meta.userPrompt || "Regenerate with variation.") + " (creative replay: vary the phrasing.)";
    try {
      const res = await fetch(bridge.RETELL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(meta),
      });
      if (!res.ok) throw new Error("Replay failed");
      const data = await res.json();
      bridge.outputBody.textContent = data.text;
      bridge.outputBody.classList.remove("output-placeholder");
      bridge.outputBody.classList.add("narrative");
    } catch (err) {
      console.error(err);
    }
  });

  // Persist styling to localStorage so it survives reloads.
  function saveStyle() {
    localStorage.setItem("bb.style", JSON.stringify({
      fontSize: fontSize.value, fontColor: fontColor.value,
      bgColor: bgColor.value, lineSpacing: lineSpacing.value, typeface: typeface.value,
    }));
  }
  [fontSize, fontColor, bgColor, lineSpacing, typeface].forEach((el) => el.addEventListener("change", saveStyle));
  // Restore on next load.
  try {
    const saved = JSON.parse(localStorage.getItem("bb.style") || "null");
    if (saved) {
      if (saved.fontSize) fontSize.value = saved.fontSize;
      if (saved.fontColor) fontColor.value = saved.fontColor;
      if (saved.bgColor) bgColor.value = saved.bgColor;
      if (saved.lineSpacing) lineSpacing.value = saved.lineSpacing;
      if (saved.typeface) typeface.value = saved.typeface;
      applyStyling();
    }
  } catch (_) { /* ignore */ }

  // Persist dock position.
  try {
    const savedDock = localStorage.getItem("bb.dock");
    if (savedDock) {
      dockPosition = savedDock;
      applyDock();
    }
  } catch (_) { /* ignore */ }
  dockBtn.addEventListener("click", () => {
    try { localStorage.setItem("bb.dock", dockPosition); } catch (_) { /* ignore */ }
  });
}

export function updateControls() {
  // Placeholder — controls are bound once at init.
}