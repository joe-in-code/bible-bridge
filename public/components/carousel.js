// Carousel component — horizontally scrolling tiles at the top of the app.
// Tiles are high-frequency shortcuts; "More…" opens the full left-panel selectors.

export function renderCarousel() {
  const el = document.getElementById("carousel");
  const bridge = window.__bibleBridge;
  el.innerHTML = "";
  bridge.CAROUSEL_TILES.forEach((t) => {
    const btn = document.createElement("button");
    btn.className = "tile";
    btn.textContent = t.label;
    btn.dataset.key = t.key;
    btn.addEventListener("click", () => onTileClick(t.key));
    el.appendChild(btn);
  });
}

function onTileClick(key) {
  const bridge = window.__bibleBridge;
  switch (key) {
    case "popular":
      bridge.applyTimeSnapshot(0);
      bridge.metadata.story = bridge.DATA.stories.stories[0].id;
      bridge.refreshAll();
      break;
    case "themes":
      document.getElementById("themes").scrollIntoView({ behavior: "smooth", block: "nearest" });
      break;
    case "settings":
      document.getElementById("setting")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      break;
    case "period":
      document.getElementById("eraSlider")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      break;
    case "tone":
      bridge.applyTonePreset("earnest");
      break;
    case "anchor":
      bridge.applyAnchorPreset("evangelical");
      break;
    case "persona":
      bridge.applyPersonaPreset("modern-storyteller");
      break;
    case "more":
      document.getElementById("leftPanel")?.scrollIntoView({ behavior: "smooth" });
      break;
  }
}

export function bindCarousel() {
  // Tiles are rebound on every render; nothing persistent to wire here.
}