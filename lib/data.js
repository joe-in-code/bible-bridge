import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const FILES = {
  stories: "stories.json",
  themes: "themes.json",
  settings: "settings.json",
  personas: "personas.json",
  forms: "literary_forms.json",
  tone: "tone_matrix.json",
  symbols: "symbols.json",
  anchors: "anchors.json",
  roles: "character_roles.json",
  passages: "passages.json",
};

const OPTIONAL = new Set(["passages"]);

export function loadData(dir) {
  const data = {};
  for (const [key, file] of Object.entries(FILES)) {
    const path = join(dir, file);
    if (!existsSync(path)) {
      if (OPTIONAL.has(key)) {
        console.warn(`Optional data file missing: ${file} (run "npm run fetch-passages")`);
        data[key] = { translation: "WEB", passages: {} };
        continue;
      }
      throw new Error(`Required data file missing: ${path}`);
    }
    data[key] = JSON.parse(readFileSync(path, "utf8"));
  }
  return data;
}
