// Time selector: major era anchors with proportional minor increments and
// snap-to markers. Updates the retelling metadata. Off by default — the
// slider and labels stay disabled until the switch is turned on, so a past
// drag can't silently pin an era onto the retelling.

import { getMetadata, setMetadata, setEnabled, subscribe } from "../state.js";
import { ERA_LABELS, ERA_SNAP_POINTS, eraIndex } from "../constants.js";

const SOURCE = "timeSelector";

function snap(v) {
  return ERA_SNAP_POINTS.reduce((best, p) => (Math.abs(v - p) < Math.abs(v - best) ? p : best), ERA_SNAP_POINTS[0]);
}

export function mountTimeSelector() {
  const enableBox = document.getElementById("eraEnable");
  const slider = document.getElementById("eraSlider");
  const valueEl = document.getElementById("eraValue");
  const labelsEl = document.getElementById("eraLabels");

  labelsEl.innerHTML = ERA_LABELS.map((l, i) => `<button type="button" data-era="${ERA_SNAP_POINTS[i]}">${l}</button>`).join("");

  function show() {
    const m = getMetadata();
    const on = Boolean(m.enabled?.era);
    enableBox.checked = on;
    slider.disabled = !on;
    labelsEl.querySelectorAll("button").forEach((b) => (b.disabled = !on));
    document.getElementById("timeSelector").classList.toggle("off", !on);
    if (!on) {
      valueEl.textContent = "Not set";
      labelsEl.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
      return;
    }
    const idx = eraIndex(m.era);
    slider.value = m.era;
    valueEl.textContent = ERA_LABELS[idx];
    labelsEl.querySelectorAll("button").forEach((b, i) => b.classList.toggle("active", i === idx));
  }

  // While dragging, record the nearest era; settle the thumb on release.
  slider.addEventListener("input", () => {
    const snapped = snap(parseInt(slider.value, 10));
    setMetadata({ era: snapped }, SOURCE);
    show();
  });
  slider.addEventListener("change", () => {
    const snapped = snap(parseInt(slider.value, 10));
    slider.value = snapped;
    setMetadata({ era: snapped }, SOURCE);
    show();
  });
  labelsEl.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-era]");
    if (!b || b.disabled) return;
    const era = Number(b.dataset.era);
    slider.value = era;
    setMetadata({ era }, SOURCE);
    if (!getMetadata().enabled?.era) setEnabled("era", true, SOURCE);
    show();
  });
  enableBox.addEventListener("change", () => {
    setEnabled("era", enableBox.checked, SOURCE);
    show();
  });

  subscribe((ev) => {
    if (ev.type === "metadata" && ev.source !== SOURCE) show();
  });
  show();
}
