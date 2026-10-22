// Carousel: horizontally scrolling tiles at the top. Each tile opens a popover
// of quick options built from the loaded data; "More…" opens the full selectors.

import { getData, getMetadata, setMetadata, toggleInList, subscribe, byId, escapeHtml as h } from "../state.js";
import { ERA_LABELS, ERA_SNAP_POINTS, eraLabel } from "../constants.js";
import { expandPanel } from "./layout.js";

const TONE_PRESETS = [
  { id: "calm", name: "Calm", emotionalIntensity: 1, spiritualFocus: 1 },
  { id: "subtle", name: "Subtle", emotionalIntensity: 2, spiritualFocus: 1 },
  { id: "earnest", name: "Earnest", emotionalIntensity: 3, spiritualFocus: 3 },
  { id: "explicit", name: "Explicit", emotionalIntensity: 4, spiritualFocus: 5 },
  { id: "dramatic", name: "Dramatic", emotionalIntensity: 5, spiritualFocus: 4 },
];
const POPULAR_COUNT = 10;

const nameOf = (list, id) => byId(list, id)?.name ?? "";

// key -> { label, multi, options(), current() }
const TILES = [
  {
    key: "popular", label: "Popular Stories",
    options: () => getData().stories.stories.slice(0, POPULAR_COUNT).map((s) => ({
      label: `${s.title} (${s.book} ${s.reference})`, active: getMetadata().story === s.id, pick: () => setMetadata({ story: s.id }),
    })),
    current: () => byId(getData().stories.stories, getMetadata().story)?.title ?? "",
  },
  {
    key: "themes", label: "Core Themes", multi: true,
    options: () => getData().themes.themes.map((t) => ({
      label: t.name, active: getMetadata().themes.includes(t.id), pick: () => toggleInList("themes", t.id, !getMetadata().themes.includes(t.id)),
    })),
    current: () => { const n = getMetadata().themes.length; return n ? `${n} selected` : ""; },
  },
  {
    key: "settings", label: "Settings",
    options: () => getData().settings.settings.map((s) => ({
      label: s.name, active: getMetadata().setting === s.id, pick: () => setMetadata({ setting: s.id }),
    })),
    current: () => nameOf(getData().settings.settings, getMetadata().setting),
  },
  {
    key: "period", label: "Time Periods",
    options: () => ERA_LABELS.map((l, i) => ({
      label: l, active: getMetadata().era === ERA_SNAP_POINTS[i], pick: () => setMetadata({ era: ERA_SNAP_POINTS[i] }),
    })),
    current: () => eraLabel(getMetadata().era),
  },
  {
    key: "tone", label: "Tone Presets",
    options: () => TONE_PRESETS.map((p) => ({
      label: p.name, active: matchPreset() === p.id,
      pick: () => setMetadata({ emotionalIntensity: p.emotionalIntensity, spiritualFocus: p.spiritualFocus }),
    })),
    current: () => TONE_PRESETS.find((p) => p.id === matchPreset())?.name ?? "Custom",
  },
  {
    key: "anchor", label: "Theological Anchors",
    options: () => getData().anchors.anchors.map((a) => ({
      label: a.name, active: getMetadata().anchor === a.id, pick: () => setMetadata({ anchor: a.id }),
    })),
    current: () => nameOf(getData().anchors.anchors, getMetadata().anchor),
  },
  {
    key: "persona", label: "Voice Personas",
    options: () => getData().personas.personas.map((p) => ({
      label: p.name, active: getMetadata().persona === p.id, pick: () => setMetadata({ persona: p.id }),
    })),
    current: () => nameOf(getData().personas.personas, getMetadata().persona),
  },
  { key: "more", label: "More…" },
];

function matchPreset() {
  const m = getMetadata();
  return TONE_PRESETS.find((p) => p.emotionalIntensity === m.emotionalIntensity && p.spiritualFocus === m.spiritualFocus)?.id ?? null;
}

let openKey = null;

export function mountCarousel() {
  const el = document.getElementById("carousel");
  const pop = document.getElementById("carouselPopover");

  el.innerHTML = TILES.map((t) =>
    `<button type="button" class="tile" data-key="${t.key}" aria-haspopup="true" aria-expanded="false">${h(t.label)}<small></small></button>`).join("");

  const tileEl = (key) => el.querySelector(`[data-key="${key}"]`);

  function refreshBadges() {
    TILES.forEach((t) => {
      if (!t.current) return;
      const small = tileEl(t.key).querySelector("small");
      const cur = t.current() || "";
      small.textContent = cur;
      small.hidden = !cur;
    });
  }

  function close() {
    openKey = null;
    pop.hidden = true;
    el.querySelectorAll(".tile").forEach((b) => { b.classList.remove("active"); b.setAttribute("aria-expanded", "false"); });
  }

  function renderPopover() {
    const tile = TILES.find((t) => t.key === openKey);
    if (!tile) return;
    const opts = tile.options();
    pop.innerHTML = opts.map((o, i) => `<button type="button" class="chip${o.active ? " on" : ""}" data-i="${i}">${h(o.label)}</button>`).join("");
    pop._opts = opts;
    const btn = tileEl(openKey);
    pop.style.left = Math.max(8, btn.offsetLeft - el.scrollLeft) + "px";
  }

  function open(key) {
    openKey = key;
    pop.hidden = false;
    el.querySelectorAll(".tile").forEach((b) => {
      const on = b.dataset.key === key;
      b.classList.toggle("active", on);
      b.setAttribute("aria-expanded", String(on));
    });
    renderPopover();
  }

  el.addEventListener("click", (e) => {
    const btn = e.target.closest(".tile");
    if (!btn) return;
    const key = btn.dataset.key;
    if (key === "more") {
      close();
      expandPanel("left");
      document.getElementById("leftPanel").scrollIntoView({ behavior: "smooth", block: "nearest" });
      document.querySelector("#leftPanel select, #leftPanel input")?.focus();
      return;
    }
    openKey === key ? close() : open(key);
  });

  pop.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    const tile = TILES.find((t) => t.key === openKey);
    pop._opts[Number(chip.dataset.i)].pick();
    if (!tile.multi) close();
  });

  document.addEventListener("click", (e) => {
    if (openKey && !e.target.closest("#carousel, #carouselPopover")) close();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && openKey) close(); });
  el.addEventListener("scroll", () => { if (openKey) renderPopover(); });

  subscribe((ev) => {
    if (ev.type !== "metadata") return;
    refreshBadges();
    if (openKey) renderPopover();
  });
  refreshBadges();
}
