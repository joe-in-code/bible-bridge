// Central prompt/chat area. The user types an instruction; "Retell" sends the
// metadata to the backend, which formats it into a structured prompt.

import { setMetadata, snapshotMetadata, setRetelling, setBusy, isBusy, subscribe } from "../state.js";
import { expandPanel } from "./layout.js";

const SUGGESTIONS = [
  "Retell it from a minor character's point of view.",
  "Keep it under 300 words.",
  "Emphasize what the characters feel in the quiet moments.",
  "Close with a short prayer.",
];

export function addMessage(cls, text) {
  const messages = document.getElementById("chatMessages");
  const div = document.createElement("div");
  div.className = `msg ${cls}`;
  div.textContent = text;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

/**
 * Request a retelling. `sendMeta` is what the server receives; `shownMeta` is what
 * the feedback panel records as the retelling's metadata (defaults to sendMeta).
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
      metadata: shownMeta,
    });
    expandPanel("out");
    addMessage("bot", data.placeholder ? "No AI key configured: showing a placeholder. Set OPENAI_API_KEY and restart." : `Retelling generated (${data.model}).`);
  } catch (err) {
    addMessage("bot", `Retelling failed: ${err.message}`);
  } finally {
    setBusy(false);
  }
}

export function mountChat() {
  const form = document.getElementById("chatForm");
  const textarea = document.getElementById("userPrompt");
  const sendBtn = form.querySelector("button[type=submit]");
  const suggestions = document.getElementById("suggestions");

  suggestions.innerHTML = SUGGESTIONS.map((s, i) => `<button type="button" class="chip" data-i="${i}"></button>`).join("");
  suggestions.querySelectorAll(".chip").forEach((b, i) => { b.textContent = SUGGESTIONS[i]; });
  suggestions.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    textarea.value = SUGGESTIONS[Number(chip.dataset.i)];
    textarea.focus();
  });

  textarea.addEventListener("input", () => setMetadata({ userPrompt: textarea.value }, "chat"));
  textarea.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (isBusy()) return;
    const meta = snapshotMetadata();
    meta.userPrompt = textarea.value.trim(); // captured BEFORE the box is cleared
    if (!meta.story) {
      addMessage("bot", "Please choose a story from the left panel first.");
      return;
    }
    addMessage("user", meta.userPrompt || "Produce the retelling now.");
    textarea.value = "";
    setMetadata({ userPrompt: "" }, "chat");
    await runRetelling(meta);
  });

  subscribe((ev) => {
    if (ev.type !== "busy") return;
    const busy = isBusy();
    sendBtn.disabled = busy;
    sendBtn.textContent = busy ? "Retelling…" : "Retell";
  });
}
