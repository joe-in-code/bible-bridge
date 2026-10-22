// Bible-Bridge frontend entry point.
// The store (state.js) holds the `metadata` object; every selector updates it,
// and the backend formats it into a prompt for the AI model.

import { setData } from "./state.js";
import { mountLayout } from "./components/layout.js";
import { mountCarousel } from "./components/carousel.js";
import { mountTimeSelector } from "./components/timeSelector.js";
import { mountLeftPanel } from "./components/leftPanel.js";
import { mountChat } from "./components/chat.js";
import { mountOutputPanel } from "./components/outputPanel.js";
import { mountFeedback } from "./components/feedback.js";

async function loadData() {
  const res = await fetch("/api/data");
  if (!res.ok) throw new Error(`Failed to load data (HTTP ${res.status})`);
  return res.json();
}

async function init() {
  setData(await loadData());
  mountLayout();
  mountCarousel();
  mountTimeSelector();
  mountLeftPanel();
  mountChat();
  mountOutputPanel();
  mountFeedback();
}

init().catch((err) => {
  console.error(err);
  document.getElementById("chatMessages").innerHTML =
    `<div class="msg bot">Failed to load app data. Please refresh the page or try again later.</div>`;
});
