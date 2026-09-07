# bible-bridge

Bible-Bridge is a guided biblical-retelling environment that allows users to creatively reinterpret biblical stories while preserving theological integrity. The app is lightweight: the frontend handles UI state and selectors, while the backend formats metadata into structured prompts and sends them to an AI model for retelling generation.

## Run

```bash
npm install
npm start            # http://localhost:3000
OPENAI_API_KEY=sk-... npm start   # enables AI retelling generation
```

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

- **Frontend** (`public/`): vanilla JS modules in `components/`. A single `metadata` object is the source of truth; every selector updates it.
- **Backend** (`server.js`): Express server. `POST /retell` formats metadata into a structured prompt and calls OpenAI. `GET /api/data` serves the bundled JSON.
- **AI Layer**: OpenAI Chat Completions API. The frontend only displays the returned text.
- **Local static data** (`public/data/`): `bible.json`, `stories.json`, `themes.json`, `settings.json`, `personas.json`, `literary_forms.json`, `tone_matrix.json`, `symbols.json`, `anchors.json`, `character_roles.json`.