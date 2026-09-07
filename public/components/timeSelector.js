// Time selector (slider) — major era anchors with proportional minor increments
// and snap-to markers. Updates retelling metadata.

const ERA_LABELS = ["Ancient", "Kings", "1900s", "Modern", "Future"];
const SNAP_POINTS = [0, 10, 20, 30, 40];

export function bindTimeSelector() {
  const slider = document.getElementById("eraSlider");
  const valueEl = document.getElementById("eraValue");
  const labels = document.querySelectorAll(".era-labels span");
  const bridge = window.__bibleBridge;

  function snap(v) {
    let best = SNAP_POINTS[0];
    let bestDist = Math.abs(v - best);
    for (const p of SNAP_POINTS) {
      const d = Math.abs(v - p);
      if (d < bestDist) { best = p; bestDist = d; }
    }
    return best;
  }

  function update() {
    const raw = parseInt(slider.value, 10);
    const snapped = snap(raw);
    if (snapped !== raw) slider.value = snapped;
    const eraIndex = Math.round(snapped / 10);
    bridge.metadata.era = snapped;
    valueEl.textContent = ERA_LABELS[eraIndex] || ERA_LABELS[0];
    labels.forEach((l, i) => l.classList.toggle("active", i === eraIndex));
    bridge.refreshAll();
  }

  slider.addEventListener("input", update);
  slider.addEventListener("change", update);
  update();
}

export function update() {
  const slider = document.getElementById("eraSlider");
  if (slider) {
    slider.value = window.__bibleBridge.metadata.era;
    slider.dispatchEvent(new Event("input"));
  }
}