// Retelling output panel: renders the latest retelling, styling controls
// (persisted), and Creative Replay.

import { getRetelling, subscribe, isBusy } from "../state.js";
import { runRetelling } from "./chat.js";

const STYLE_KEY = "bb.style";
const REPLAY_NOTE = "Creative replay: tell it again with fresh phrasing and imagery, avoiding the previous wording.";

export function mountOutputPanel() {
  const panel = document.getElementById("outputPanel");
  const body = document.getElementById("outputBody");
  const replayBtn = document.getElementById("replayBtn");
  const ctl = {
    fontSize: document.getElementById("fontSize"),
    fontColor: document.getElementById("fontColor"),
    bgColor: document.getElementById("bgColor"),
    lineSpacing: document.getElementById("lineSpacing"),
    typeface: document.getElementById("typeface"),
  };

  function applyStyling() {
    body.style.fontSize = ctl.fontSize.value + "px";
    body.style.color = ctl.fontColor.value;
    body.style.lineHeight = ctl.lineSpacing.value;
    body.style.fontFamily = ctl.typeface.value;
    body.style.background = ctl.bgColor.value;
    panel.style.background = ctl.bgColor.value;
  }

  function saveStyle() {
    try {
      localStorage.setItem(STYLE_KEY, JSON.stringify(Object.fromEntries(Object.entries(ctl).map(([k, el]) => [k, el.value]))));
    } catch { /* ignore */ }
  }

  try {
    const saved = JSON.parse(localStorage.getItem(STYLE_KEY) || "null");
    if (saved) for (const [k, el] of Object.entries(ctl)) if (saved[k]) el.value = saved[k];
  } catch { /* ignore */ }
  applyStyling();

  Object.values(ctl).forEach((el) => {
    el.addEventListener("input", () => { applyStyling(); saveStyle(); });
    el.addEventListener("change", () => { applyStyling(); saveStyle(); });
  });

  function renderRetelling() {
    const r = getRetelling();
    body.textContent = "";
    if (!r) {
      const p = document.createElement("div");
      p.className = "output-placeholder";
      p.textContent = "Your retelling will appear here.";
      body.appendChild(p);
    } else {
      if (r.placeholder) {
        const warn = document.createElement("div");
        warn.className = "output-warning";
        warn.textContent = "Placeholder only: no AI key is configured on the server.";
        body.appendChild(warn);
      }
      const text = document.createElement("div");
      text.className = "narrative";
      text.textContent = r.text;
      body.appendChild(text);
      body.scrollTop = 0;
    }
    updateReplay();
  }

  function updateReplay() {
    const r = getRetelling();
    replayBtn.disabled = !r || r.placeholder || isBusy();
  }

  replayBtn.addEventListener("click", () => {
    const r = getRetelling();
    if (!r || isBusy()) return;
    const send = { ...r.metadata, userPrompt: [r.metadata.userPrompt, REPLAY_NOTE].filter(Boolean).join("\n") };
    runRetelling(send, r.metadata);
  });

  subscribe((ev) => {
    if (ev.type === "retelling") renderRetelling();
    if (ev.type === "busy") updateReplay();
  });
  renderRetelling();
}
