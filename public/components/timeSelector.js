// Time selector: major era anchors with proportional minor increments and
// snap-to markers. Updates the retelling metadata.

import { getMetadata, setMetadata, subscribe } from "../state.js";
import { ERA_LABELS, ERA_SNAP_POINTS, eraIndex } from "../constants.js";

const SOURCE = "timeSelector";

function snap(v) {
  return ERA_SNAP_POINTS.reduce((best, p) => (Math.abs(v - p) < Math.abs(v - best) ? p : best), ERA_SNAP_POINTS[0]);
}

export function mountTimeSelector() {
  const slider = document.getElementById("eraSlider");
  const valueEl = document.getElementById("eraValue");
  const labelsEl = document.getElementById("eraLabels");

  labelsEl.innerHTML = ERA_LABELS.map((l, i) => `<button type="button" data-era="${ERA_SNAP_POINTS[i]}">${l}</button>`).join("");

  function show(era) {
    const idx = eraIndex(era);
    valueEl.textContent = ERA_LABELS[idx];
    labelsEl.querySelectorAll("button").forEach((b, i) => b.classList.toggle("active", i === idx));
  }

  // While dragging, record the nearest era; settle the thumb on release.
  slider.addEventListener("input", () => {
    const snapped = snap(parseInt(slider.value, 10));
    show(snapped);
    setMetadata({ era: snapped }, SOURCE);
  });
  slider.addEventListener("change", () => {
    const snapped = snap(parseInt(slider.value, 10));
    slider.value = snapped;
    show(snapped);
    setMetadata({ era: snapped }, SOURCE);
  });
  labelsEl.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-era]");
    if (!b) return;
    const era = Number(b.dataset.era);
    slider.value = era;
    show(era);
    setMetadata({ era }, SOURCE);
  });

  const syncFromState = () => {
    const era = getMetadata().era;
    slider.value = era;
    show(era);
  };
  subscribe((ev) => {
    if (ev.type === "metadata" && ev.source !== SOURCE && ev.keys.includes("era")) syncFromState();
  });
  syncFromState();
}
