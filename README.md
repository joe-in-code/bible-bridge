# bible-bridge

Bible-Bridge is a guided biblical-retelling environment that allows users to creatively reinterpret biblical stories while preserving theological integrity. The app is lightweight: the frontend handles UI state and selectors, while the backend formats metadata into structured prompts and sends them to an AI model for retelling generation.

## Run

Requires Node 22.9+.

```powershell
npm install
npm run dev          # http://localhost:3000 (auto-restarts on server changes)
npm test             # unit + API smoke tests
```

To enable AI generation, copy `.env.example` to `.env` and set either `OPENAI_API_KEY` (OpenAI directly) or `OPENROUTER_API_KEY` (via [OpenRouter](https://openrouter.ai/)). With OpenRouter and no `OPENAI_MODEL` set, requests use OpenRouter's [Auto Router](https://openrouter.ai/docs/guides/routing/routers/auto-router) (`openrouter/auto`), which picks a model per request from live community usage — no model name is hardcoded in the app. Tune it with `OPENROUTER_COST_TIER` (`low`/`medium`/`high`/`xhigh`/`max`), or set `OPENAI_MODEL` to a `provider/model` id (e.g. `anthropic/claude-sonnet-4.5`) to pin an exact model instead. Each response's `model` field reports which model actually answered, and shows up as the model name in the chat log.
Or for one session in PowerShell: `$env:OPENAI_API_KEY="sk-..."; npm start`.
Without a key, retellings return a clearly labelled placeholder.

Scripture text (WEB, public domain) lives in `public/data/passages.json` and is included in each prompt.
Regenerate it after editing `stories.json` with `npm run fetch-passages` (needs network; long stories use the `excerpt` field).

## ASCII Wireframe

```
---------------------------------------------------------
|                 GLIDING STORY / THEME CAROUSEL          |
| <Story> <Theme> <Setting> <Tone> <Anchor> <Persona> ... |
---------------------------------------------------------

---------------------------------------------------------
|                     TIME SELECTOR (SLIDER)              |
| [Ancient]--|--|--[Kings]--|--|--[1900s]--|--|--[Future] |
---------------------------------------------------------

---------------------------   ---------------------------   ------------------------------------
|        LEFT PANEL          | |       PROMPT / CHAT      | |        RETELLING OUTPUT PANEL     |
|  - Story Selector          | |   - User types            | |  - Generated Narrative             |
|  - Theme Selector          | |   - Suggested prompts     | |  - Reading View (toggle)           |
|  - Setting Selector        | |   - Central interaction    | |  - Font Size / Color / Background |
|  - Character Roles         | |                           | |  - Line Spacing / Typeface         |
|  - Symbols                 | |                           | |  - Dock: Right / Bottom / Left     |
|  - Symbolic Density        | |                           | |  - Creative Replay                 |
|  - Tone Matrix             | |                           | |                                    |
|  - Literary Form           | |                           | |                                    |
|  - Voice Persona           | |                           | |                                    |
|  - Theological Anchor      | |                           | |                                    |
|  - Imperative Alignment    | |                           | |                                    |
---------------------------   ---------------------------   ------------------------------------

---------------------------------------------------------
|                 RETELLING FEEDBACK PANEL                |
|   ORIGINAL STORY (left)      |     RETELLING METADATA    |
|   - Story                    |     - Story                |
|   - Themes                   |     - Themes               |
|   - Setting                  |     - Setting              |
|   - Era                      |     - Era                  |
|   - Anchor                   |     - Anchor               |
|   - Tone                     |     - Tone Matrix          |
|   - Symbols                  |     - Symbolic Density     |
|   - Literary Form            |     - Literary Form        |
|   - Persona                  |     - Persona              |
|   - Imperative Alignment     |     - Imperative Alignment |
---------------------------------------------------------
```

## Architecture

- **Frontend** (`public/`): vanilla JS modules in `components/`. `state.js` is a small store holding the `metadata` object, a per-field `enabled` map, and the loaded reference data; every selector updates it and components subscribe to changes. Story is required; every other single-value field (setting, literary form, persona, anchor, imperative alignment, era, symbolic density, each tone axis) has an enable switch that is off by default. `effectiveMetadata()` turns a disabled field into `null` before it's sent, so nothing the reader hasn't deliberately switched on can shape the retelling. `constants.js` is shared with the server.
- **Backend** (`server.js`, `lib/`): Express server. `POST /api/retell` validates metadata (`lib/validate.js`) — unset or invalid optional fields stay `null`, never a substituted default — formats it into a structured prompt with the source passage (`lib/prompt.js`), and calls the AI. Unset fields get no section in the prompt at all. `GET /api/data` serves the bundled JSON.
- **AI Layer**: OpenAI Chat Completions API. The frontend only displays the returned text.
- **Local static data** (`public/data/`): `passages.json`, `stories.json`, `themes.json`, `settings.json`, `personas.json`, `literary_forms.json`, `tone_matrix.json`, `symbols.json`, `anchors.json`, `character_roles.json`.