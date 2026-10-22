// Carousel: horizontally scrolling tiles at the top. Each tile opens a popover
// of quick options built from the loaded data; "More…" opens the full selectors.
//
// Picking a value also switches that control on. Clicking the already-active
// chip in a single-select popover switches it back off (the remembered value
// stays, so turning it on again restores the same choice). The "Popular
// Stories" tile is required, not an opt-in switch — it never dims.

import { getData, getMetadata, setMetadata, setSubject, setEnabled, toggleInList, subscribe, byId, escapeHtml as h } from "../state.js";
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
const isOn = (key) => Boolean(getMetadata().enabled?.[key]);

/** A single-select opt-in field: picking sets the value and enables it;
 * clicking the active chip again disables it (keeping the remembered value). */
function singleToggleOptions(list, metaKey) {
  const m = getMetadata();
  return list.map((item) => ({
    label: item.name,
    active: isOn(metaKey) && m[metaKey] === item.id,
    pick: () => {
      if (isOn(metaKey) && m[metaKey] === item.id) {
        setEnabled(metaKey, false);
      } else {
        setMetadata({ [metaKey]: item.id });
        setEnabled(metaKey, true);
      }
    },
  }));
}

// key -> { label, multi, options(), current() }
const TILES = [
  {
    key: "popular", label: "Popular Stories",
    options: () => getData().stories.stories.slice(0, POPULAR_COUNT).map((s) => ({
      label: `${s.title} (${s.book} ${s.reference})`, active: getMetadata().story === s.id, pick: () => setSubject({ story: s.id }),
    })),
    current: () => {
      const m = getMetadata();
      if (m.story) return byId(getData().stories.stories, m.story)?.title ?? "";
      return m.customReference?.display ?? "";
    },
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
    options: () => singleToggleOptions(getData().settings.settings, "setting"),
    current: () => (isOn("setting") ? nameOf(getData().settings.settings, getMetadata().setting) : ""),
  },
  {
    key: "period", label: "Time Periods",
    options: () => ERA_LABELS.map((l, i) => {
      const era = ERA_SNAP_POINTS[i];
      return {
        label: l, active: isOn("era") && getMetadata().era === era,
        pick: () => {
          if (isOn("era") && getMetadata().era === era) setEnabled("era", false);
          else { setMetadata({ era }); setEnabled("era", true); }
        },
      };
    }),
    current: () => (isOn("era") ? eraLabel(getMetadata().era) : ""),
  },
  {
    key: "tone", label: "Tone Presets",
    options: () => TONE_PRESETS.map((p) => ({
      label: p.name, active: toneOn() && matchPreset() === p.id,
      pick: () => {
        if (toneOn() && matchPreset() === p.id) {
          setEnabled("emotionalIntensity", false);
          setEnabled("spiritualFocus", false);
        } else {
          setMetadata({ emotionalIntensity: p.emotionalIntensity, spiritualFocus: p.spiritualFocus });
          setEnabled("emotionalIntensity", true);
          setEnabled("spiritualFocus", true);
        }
      },
    })),
    current: () => (toneOn() ? TONE_PRESETS.find((p) => p.id === matchPreset())?.name ?? "Custom" : ""),
  },
  {
    key: "anchor", label: "Theological Anchors",
    options: () => singleToggleOptions(getData().anchors.anchors, "anchor"),
    current: () => (isOn("anchor") ? nameOf(getData().anchors.anchors, getMetadata().anchor) : ""),
  },
  {
    key: "persona", label: "Voice Personas",
    options: () => singleToggleOptions(getData().personas.personas, "persona"),
    current: () => (isOn("persona") ? nameOf(getData().personas.personas, getMetadata().persona) : ""),
  },
  { key: "more", label: "More…" },
];

const toneOn = () => isOn("emotionalIntensity") && isOn("spiritualFocus");
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
    tileEl("popular").classList.toggle("needs-attention", !getMetadata().story && !getMetadata().customReference);
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

  // "More…" expands the left panel; clicking the Popular Stories tile while
  // no story is chosen is the fastest path to satisfy step 1.
  document.getElementById("jumpStory")?.addEventListener("click", () => tileEl("popular").click());
}
