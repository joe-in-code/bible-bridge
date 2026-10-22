import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadData } from "../lib/data.js";
import { createApp, openAiGenerate } from "../lib/app.js";

const publicDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const data = loadData(join(publicDir, "data"));

let server, base, lastPrompt;

before(async () => {
  const generate = async (prompt) => {
    lastPrompt = prompt;
    return { text: "A retelling.", model: "stub", placeholder: false };
  };
  const app = createApp({ data, publicDir, generate, rateMax: 1000 });
  await new Promise((r) => { server = app.listen(0, "127.0.0.1", r); });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

const post = (body) =>
  fetch(`${base}/api/retell`, { method: "POST", headers: { "Content-Type": "application/json" }, body: typeof body === "string" ? body : JSON.stringify(body) });

test("GET /api/data returns reference data", async () => {
  const j = await (await fetch(`${base}/api/data`)).json();
  for (const k of ["stories", "themes", "settings", "personas", "forms", "tone", "symbols", "anchors", "roles", "passages"]) assert.ok(j[k], k);
});

test("POST /api/retell forwards the user's instruction", async () => {
  const res = await post({ story: "ruth", userPrompt: "Use plain words." });
  assert.equal(res.status, 200);
  const j = await res.json();
  assert.equal(j.text, "A retelling.");
  assert.ok(lastPrompt.includes("Use plain words."));
});

test("POST /api/retell rejects invalid input", async () => {
  assert.equal((await post({ story: "nope" })).status, 400);
  assert.equal((await post("{not json")).status, 400);
});

test("without an API key the default generator returns a placeholder", async () => {
  const r = await openAiGenerate("x", {});
  assert.equal(r.placeholder, true);
  assert.equal(r.model, "placeholder");
});

test("static index is served", async () => {
  const res = await fetch(`${base}/`);
  assert.equal(res.status, 200);
  assert.ok((await res.text()).includes("Bible-Bridge"));
});
