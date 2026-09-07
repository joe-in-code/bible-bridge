import express from "express";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { readFileSync } from "node:fs";
import OpenAI from "openai";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "1mb" }));
app.use(express.static(join(__dirname, "public")));

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------
function load(name) {
  return JSON.parse(readFileSync(join(__dirname, "public", "data", name), "utf8"));
}

const data = {
  stories: load("stories.json"),
  themes: load("themes.json"),
  settings: load("settings.json"),
  personas: load("personas.json"),
  forms: load("literary_forms.json"),
  tone: load("tone_matrix.json"),
  symbols: load("symbols.json"),
  anchors: load("anchors.json"),
  roles: load("character_roles.json"),
  bible: load("bible.json"),
};

// ---------------------------------------------------------------------------
// Prompt-generation agent
// ---------------------------------------------------------------------------
function buildPrompt(metadata) {
  const story = (data.stories.stories || []).find((s) => s.id === metadata.story) ?? null;
  const storyText = story
    ? `The story being retold is "${story.title}" (${story.book} ${story.reference}). ${story.summary}`
    : "A biblical story chosen by the reader.";

  const themes = (metadata.themes || [])
    .map((id) => (data.themes.themes || []).find((t) => t.id === id)?.name)
    .filter(Boolean);

  const setting = (data.settings.settings || []).find((s) => s.id === metadata.setting)?.name ?? metadata.setting;
  const persona = (data.personas.personas || []).find((p) => p.id === metadata.persona)?.name ?? metadata.persona;
  const form = (data.forms.forms || []).find((f) => f.id === metadata.literaryForm)?.name ?? metadata.literaryForm;
  const anchor = (data.anchors.anchors || []).find((a) => a.id === metadata.anchor)?.name ?? metadata.anchor;

  const intensity = (data.tone.emotional_intensity || []).find((e) => e.value === metadata.emotionalIntensity)?.name ?? "Earnest";
  const focus = (data.tone.spiritual_focus || []).find((e) => e.value === metadata.spiritualFocus)?.name ?? "Clear";

  const imperatives = {
    1: "Strict Doctrine — remain faithful to historic confessional boundaries; avoid speculation.",
    2: "Faful Interpretation — honor the text's plain sense while allowing pastoral application.",
    3: "Inspired Reflection — draw thoughtful, devotional insight rooted in the text.",
    4: "Symbolic Expansion — freely explore metaphor, allegory, and layered meaning.",
  };
  const imperative = imperatives[metadata.imperativeAlignment] ?? imperatives[2];

  const symbols = (metadata.symbols || [])
    .map((id) => (data.symbols.symbols || []).find((s) => s.id === id)?.name)
    .filter(Boolean);

  const roles = (metadata.characterRoles || [])
    .map((id) => (data.roles.roles || []).find((r) => r.id === id)?.name)
    .filter(Boolean);

  const eraLabels = ["Ancient", "Kings", "1900s", "Modern", "Future"];
  // Era slider spans 0-40 with snap points at 0,10,20,30,40; map to the 5 labels.
  const eraIndex = Math.max(0, Math.min(4, Math.round((metadata.era ?? 0) / 10)));
  const era = eraLabels[eraIndex] ?? "Ancient";

  const userPrompt = (metadata.userPrompt || "").trim();

  return [
    "You are Bible-Bridge, a guide for creative biblical retelling that preserves theological integrity.",
    "Write a retelling using the following structured metadata. Treat every field as a deliberate constraint.",
    "",
    "## Story",
    storyText,
    "",
    "## Era / Time Period",
    era,
    "",
    "## Setting",
    setting,
    "",
    "## Themes",
    themes.length ? themes.join(", ") : "None specified.",
    "",
    "## Character Roles",
    roles.length ? roles.join(", ") : "None specified.",
    "",
    "## Symbols",
    symbols.length ? symbols.join(", ") : "None specified.",
    "",
    "## Symbolic Layer Density",
    metadata.metaphorDensity === 1 ? "Low — lean on plain narration."
    : metadata.metaphorDensity === 2 ? "Moderate — occasional figurative language."
    : "High — rich in metaphor and layered symbol.",
    "",
    "## Tone Matrix",
    `Emotional Intensity: ${intensity}`,
    `Spiritual Focus: ${focus}`,
    "",
    "## Literary Form",
    form,
    "",
    "## Voice Persona",
    persona,
    "",
    "## Theological Anchor",
    anchor,
    "",
    "## Biblical Imperative Alignment",
    imperative,
    "",
    "## Reader's Instruction",
    userPrompt || "Produce the retelling now, in the chosen form and voice.",
    "",
    "Write only the retelling itself. Do not add commentary, labels, or meta-text.",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// AI integration
// ---------------------------------------------------------------------------
function getOpenAI() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

async function generateRetelling(prompt) {
  const client = getOpenAI();
  if (!client) {
    return {
      text: "[AI integration not configured. Set OPENAI_API_KEY to generate retellings.]",
      model: "placeholder",
    };
  }
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: "You are Bible-Bridge, a careful biblical retelling guide." },
      { role: "user", content: prompt },
    ],
    temperature: 0.8,
    max_tokens: 2048,
  });
  return { text: completion.choices[0].message.content.trim(), model };
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.get("/api/data", (req, res) => {
  const { stories, themes, settings, personas, forms, tone, symbols, anchors, roles, bible } = data;
  res.json({ stories, themes, settings, personas, forms, tone, symbols, anchors, roles, bible });
});

app.post("/api/retell", async (req, res) => {
  try {
    const metadata = req.body;
    if (!metadata || typeof metadata !== "object") {
      return res.status(400).json({ error: "Metadata object required." });
    }
    const prompt = buildPrompt(metadata);
    const result = await generateRetelling(prompt);
    res.json({ prompt, ...result });
  } catch (err) {
    console.error("Retell error:", err);
    res.status(500).json({ error: "Retelling failed.", detail: err.message });
  }
});

app.get("/health", (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Bible-Bridge running at http://localhost:${PORT}`);
});