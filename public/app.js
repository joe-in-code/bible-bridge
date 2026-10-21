// Bible-Bridge frontend application
// Single source of truth: the `metadata` object. All selectors update it;
// the backend only formats it into a prompt and sends it to the AI model.

import { buildMetadata, DEFAULT_METADATA } from "./state.js";
import { renderCarousel, bindCarousel } from "./components/carousel.js";
import { renderLeftPanel, bindLeftPanel } from "./components/leftPanel.js";
import { bindChat } from "./components/chat.js";
import { bindOutputPanel } from "./components/outputPanel.js";
import { bindFeedback } from "./components/feedback.js";
import { bindTimeSelector, update as updateTimeSelector } from "./components/timeSelector.js";

const DATA_URL = "/api/data";
const RETELL_URL = "/api/retell";

let DATA = null;
let metadata = buildMetadata();

async function loadData() {
  try {
  const res = await fetch(DATA_URL);
  if (!res.ok) {
    throw new Error("Failed to load data");
  }
  if (!res.ok) throw new Error("Failed to load data");
  console.log(`Fetched data: ${JSON.stringify(DATA, null, 2)}`);
}

function get(path, fallback) {
  return path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), DATA) ?? fallback;
}

// ---------------------------------------------------------------------------
// Carousel tiles
// ---------------------------------------------------------------------------
const CAROUSEL_TILES = [
  { key: "popular", label: "Popular Stories" },
  { key: "themes", label: "Core Themes" },
  { key: "settings", label: "Settings" },
  { key: "period", label: "Time Periods" },
  { key: "tone", label: "Tone Presets" },
  { key: "anchor", label: "Theological Anchors" },
  { key: "persona", label: "Voice Personas" },
  { key: "more", label: "More…" },
];

const TONE_PRESETS = {
  calm: { emotionalIntensity: 1, spiritualFocus: 1 },
  earnest: { emotionalIntensity: 3, spiritualFocus: 3 },
  dramatic: { emotionalIntensity: 5, spiritualFocus: 4 },
  subtle: { emotionalIntensity: 2, spiritualFocus: 1 },
  explicit: { emotionalIntensity: 4, spiritualFocus: 5 },
};

function applyTonePreset(id) {
  const p = TONE_PRESETS[id];
  if (!p) return;
  metadata.emotionalIntensity = p.emotionalIntensity;
  metadata.spiritualFocus = p.spiritualFocus;
  refreshAll();
}

function applyAnchorPreset(id) {
  metadata.anchor = id;
  refreshAll();
}

function applyPersonaPreset(id) {
  metadata.persona = id;
  refreshAll();
}

function applyTimeSnapshot(era) {
  metadata.era = era;
  updateTimeSelector();
  refreshAll();
}

// ---------------------------------------------------------------------------
// Render / refresh
// ---------------------------------------------------------------------------
function refreshAll() {
  renderLeftPanel().catch(err => console.error(`Error rendering left panel: ${err.message}`));
  bindLeftPanel();
  bindCarousel();
  bindFeedback.render();
  bindOutputPanel.updateControls();
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
async function init() {
  await loadData().catch(err => console.error(`Error loading data: ${err.message}`));
  window.__bibleBridge.DATA = DATA;
  renderCarousel();
  bindCarousel();
  renderLeftPanel().catch(err => console.error(`Error rendering left panel: ${err.message}`));
  bindLeftPanel();
  bindChat();
  bindOutputPanel();
  bindFeedback();
  bindTimeSelector();
}

init().catch((err) => {
  console.error(err);
  document.getElementById("chatMessages").innerHTML =
    `<div class="msg bot">Failed to load app data. Please refresh your page or try again later.</div>`;
});

// Expose helpers used by components
window.__bibleBridge = { metadata, DATA, get, applyTonePreset, applyAnchorPreset, applyPersonaPreset, applyTimeSnapshot, refreshAll, CAROUSEL_TILES, TONE_PRESETS, RETELL_URL };