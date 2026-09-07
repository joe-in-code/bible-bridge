// Central prompt/chat area. User types instructions; "Retell" sends metadata
// to the backend which formats it into a structured prompt and calls the AI.

export function bindChat() {
  const form = document.getElementById("chatForm");
  const textarea = document.getElementById("userPrompt");
  const messages = document.getElementById("chatMessages");
  const bridge = window.__bibleBridge;

  // Keep metadata.userPrompt in sync with the textarea.
  textarea.addEventListener("input", () => {
    bridge.metadata.userPrompt = textarea.value;
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const prompt = textarea.value.trim();
    if (!bridge.metadata.story) {
      addMessage("bot", "Please choose a story from the left panel first.");
      return;
    }
    addMessage("user", prompt || "Produce the retelling now.");
    textarea.value = "";
    bridge.metadata.userPrompt = "";

    const sendBtn = form.querySelector("button[type=submit]");
    sendBtn.disabled = true;
    sendBtn.textContent = "Retelling…";

    try {
      const res = await fetch(bridge.RETELL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bridge.metadata),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server error ${res.status}`);
      }
      const data = await res.json();
      addMessage("bot", `Retelling generated (${data.model}).`);
      window.__bibleBridge.outputBody.textContent = data.text;
      window.__bibleBridge.outputBody.classList.remove("output-placeholder");
      window.__bibleBridge.outputBody.classList.add("narrative");
      bridge.refreshAll();
    } catch (err) {
      addMessage("bot", `Retelling failed: ${err.message}`);
    } finally {
      sendBtn.disabled = false;
      sendBtn.textContent = "Retell";
    }
  });
}

function addMessage(cls, text) {
  const messages = document.getElementById("chatMessages");
  const div = document.createElement("div");
  div.className = `msg ${cls}`;
  div.textContent = text;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}