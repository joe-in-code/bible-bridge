// Central prompt/chat area. The user types an instruction; "Retell" sends the
// metadata to the backend, which formats it into a structured prompt. Only
// switched-on fields are sent — see state.effectiveMetadata.
//
// Feature: the reader never has to touch the selectors. Typing a story name
// ("Cain and Abel") or a scripture reference ("John 3:16") here is detected
// live and sets the subject automatically (see ../storyMatch.js); the
// selectors remain available as suggestions, not a requirement.

import {
  getMetadata, getData, snapshotMetadata, effectiveMetadata,
  setMetadata, setSubject, setRetelling, setBusy, isBusy, subscribe,
} from "../state.js";
import { detectSubject } from "../storyMatch.js";
import { expandPanel } from "./layout.js";

const SUGGESTIONS = [
  "Retell it from a minor character's point of view.",
  "Keep it under 300 words.",
  "Emphasize what the characters feel in the quiet moments.",
  "Close with a short prayer.",
];

const hasSubject = () => { const m = getMetadata(); return Boolean(m.story || m.customReference); };

export function addMessage(cls, text) {
  const messages = document.getElementById("chatMessages");
  const div = document.createElement("div");
  div.className = `msg ${cls}`;
  div.textContent = text;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

/**
 * Request a retelling. `sendMeta` is what the server receives (should already
 * be in effective form — no `enabled` map, disabled fields null); `shownMeta`
 * is what the feedback panel records as the retelling's metadata.
 */
export async function runRetelling(sendMeta, shownMeta = sendMeta) {
  if (isBusy()) return;
  setBusy(true);
  try {
    const res = await fetch("/api/retell", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sendMeta),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);
    setRetelling({
      text: data.text,
      model: data.model,
      placeholder: Boolean(data.placeholder),
      prompt: data.prompt,
      subject: data.subject,
      metadata: shownMeta,
    });
    expandPanel("out");
    addMessage("bot", data.placeholder ? "No AI key configured: showing a placeholder. Set OPENAI_API_KEY and restart." : `Retelling generated (${data.model}).`);
    markGenerated();
  } catch (err) {
    addMessage("bot", `Retelling failed: ${err.message}`);
  } finally {
    setBusy(false);
  }
}

let hasGenerated = false;
function markGenerated() {
  hasGenerated = true;
  updateSteps();
}

function updateSteps() {
  const steps = document.getElementById("steps");
  const howto = document.getElementById("howtoBtn");
  if (hasGenerated) {
    steps.hidden = true;
    howto.hidden = false;
    return;
  }
  steps.hidden = false;
  howto.hidden = true;
  const typed = document.getElementById("userPrompt").value.trim().length > 0;
  const current = !hasSubject() ? 1 : typed ? 3 : 2;
  steps.querySelectorAll("li").forEach((li) => li.classList.toggle("current", Number(li.dataset.step) === current));
}

function updateRetellAvailability() {
  const btn = document.getElementById("retellBtn");
  const ok = hasSubject();
  btn.disabled = !ok || isBusy();
  btn.title = !ok ? "Choose a story, or name one / type a reference above" : "";
}

let hideBadgeTimer = null;
function showDetectBadge(text) {
  clearTimeout(hideBadgeTimer);
  const badge = document.getElementById("detectBadge");
  document.getElementById("detectBadgeText").textContent = text;
  badge.hidden = false;
  hideBadgeTimer = setTimeout(() => { badge.hidden = true; }, 6000);
}

/** Detect a story/reference in the typed text and apply it, unless it's already active. */
function detectFromText(text) {
  const detected = detectSubject(text, getData());
  if (!detected) return;
  const m = getMetadata();
  if (detected.kind === "story") {
    if (m.story === detected.id) return;
    setSubject({ story: detected.id }, "chat-detect");
    showDetectBadge(`Detected story: ${detected.title}`);
  } else {
    if (m.customReference?.display === detected.display) return;
    setSubject({ customReference: detected }, "chat-detect");
    showDetectBadge(`Detected passage: ${detected.display}`);
  }
}

export function mountChat() {
  const form = document.getElementById("chatForm");
  const textarea = document.getElementById("userPrompt");
  const sendBtn = form.querySelector("button[type=submit]");
  const suggestions = document.getElementById("suggestions");
  const howto = document.getElementById("howtoBtn");
  const detectBadge = document.getElementById("detectBadge");
  const detectBadgeClear = document.getElementById("detectBadgeClear");

  suggestions.innerHTML = SUGGESTIONS.map((s, i) => `<button type="button" class="chip" data-i="${i}"></button>`).join("");
  suggestions.querySelectorAll(".chip").forEach((b, i) => { b.textContent = SUGGESTIONS[i]; });
  suggestions.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    textarea.value = SUGGESTIONS[Number(chip.dataset.i)];
    textarea.focus();
    updateSteps();
  });

  textarea.addEventListener("input", () => {
    setMetadata({ userPrompt: textarea.value }, "chat");
    detectFromText(textarea.value);
    updateSteps();
  });
  textarea.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  detectBadgeClear.addEventListener("click", () => {
    clearTimeout(hideBadgeTimer);
    detectBadge.hidden = true;
    setSubject({ story: null, customReference: null }, "chat-detect");
  });

  howto.addEventListener("click", () => {
    hasGenerated = false;
    updateSteps();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (isBusy() || !hasSubject()) return;
    const raw = snapshotMetadata();
    raw.userPrompt = textarea.value.trim(); // captured BEFORE the box is cleared
    const meta = effectiveMetadata(raw);
    addMessage("user", meta.userPrompt || "Produce the retelling now.");
    textarea.value = "";
    setMetadata({ userPrompt: "" }, "chat");
    await runRetelling(meta);
  });

  subscribe((ev) => {
    if (ev.type === "busy") {
      const busy = isBusy();
      sendBtn.disabled = busy || !hasSubject();
      sendBtn.textContent = busy ? "Retelling…" : "Retell";
    }
    if (ev.type === "metadata" && (ev.keys.includes("story") || ev.keys.includes("customReference") || ev.keys.includes("userPrompt"))) {
      updateRetellAvailability();
      updateSteps();
    }
  });
  updateRetellAvailability();
  updateSteps();
}
