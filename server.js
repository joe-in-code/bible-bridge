import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadData } from "./lib/data.js";
import { createApp } from "./lib/app.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "public");
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "127.0.0.1";

const data = loadData(join(publicDir, "data"));
const app = createApp({ data, publicDir });

app.listen(PORT, HOST, () => {
  console.log(`Bible-Bridge running at http://${HOST === "127.0.0.1" ? "localhost" : HOST}:${PORT}`);
  if (process.env.OPENAI_API_KEY) {
    console.log(`AI: OpenAI direct, model=${process.env.OPENAI_MODEL || "gpt-4o-mini"}`);
  } else if (process.env.OPENROUTER_API_KEY) {
    console.log(`AI: OpenRouter, model=${process.env.OPENAI_MODEL || "openrouter/auto"}${process.env.OPENROUTER_COST_TIER ? ` cost_tier=${process.env.OPENROUTER_COST_TIER}` : ""}`);
  } else {
    console.log("No OPENAI_API_KEY or OPENROUTER_API_KEY set: retellings will return a placeholder.");
  }
});
