# Personal Productivity System – MVP Starter Kit

This starter is an initial single-user MVP for the flexible, outcome-first productivity system discussed with you. It uses Google Sheets as the database, Google Apps Script for business logic, GitHub for source control, and Cloudflare Pages for hosting.

## Included
- `Productivity_Framework_Database.xlsx` – import into Google Sheets.
- `Code.gs` – Apps Script API (CRUD for hierarchy nodes, plus time logs/reviews/suggestions).
- `appsscript.json` – Apps Script manifest.
- `index.html`, `styles.css`, `app.js` – responsive PWA starter.
- `functions/api/[[path]].js` – Cloudflare Pages Function proxy.
- `manifest.webmanifest`, `sw.js` – basic PWA shell.

## 1. Create the Google Sheet
1. Upload `Productivity_Framework_Database.xlsx` to Google Drive.
2. Open it with Google Sheets and save as a Google Sheets file.
3. Keep the sheet tab names and column headers unchanged.
4. The sample Local Business Promotion records are illustrative. `is_example=TRUE` marks them; edit/delete them as you decide.

## 2. Set up Apps Script
1. In the Google Sheet, choose **Extensions → Apps Script**.
2. Replace the default code with `Code.gs` contents.
3. In Project Settings, enable showing `appsscript.json` if needed; replace manifest with the supplied file.
4. Open **Project Settings → Script Properties** and add:
   - `SPREADSHEET_ID` = the ID from the Google Sheet URL (optional for a bound script; recommended).
   - `API_SECRET` = a long random secret. Do not commit it to GitHub.
5. Run `setupDatabase()` once and authorize. It preserves existing sheet data and creates missing tabs.
6. Deploy → New deployment → Web app. Execute as **Me**. Access setting must permit the Cloudflare server to reach the web app. If using broad access, the API secret is essential; review the security implications and your Google Workspace policy.
7. Copy the deployed Web App URL ending in `/exec`.

## 3. Configure Cloudflare Pages
1. Push the contents of this folder to a GitHub repository (or upload through GitHub).
2. In Cloudflare Pages, connect the repository.
3. Framework preset: **None**. Build command: leave blank. Build output directory: `/` (or the repository root, depending on the Pages UI).
4. Add environment variables/secrets:
   - `GAS_WEB_APP_URL` = Apps Script Web App `/exec` URL.
   - `API_SECRET` = exactly the same secret set in Apps Script.
5. Deploy. Open the Pages URL.

## 4. Local preview
You can preview the static frontend with any local static server, but API requests need the Cloudflare Pages Function and configured environment variables. `wrangler pages dev .` is one option after installing Wrangler.

## Current API actions
- `GET /api?action=bootstrap` – returns Nodes and Settings.
- `GET /api?action=nodes` – returns Nodes.
- `POST /api` with `{ "action":"createNode", "node":{...} }`
- `POST /api` with `{ "action":"updateNode", "node":{ "node_id":"...", ... } }`
- `POST /api` with `{ "action":"deleteNode", "node_id":"..." }`
- `POST /api` with `{ "action":"createTimeLog", "record":{...} }`
- `POST /api` with `{ "action":"saveReview", "record":{...} }`
- `POST /api` with `{ "action":"saveSuggestion", "record":{...} }`

## Data model
`Nodes` is the universal hierarchy table. `node_id` uniquely identifies an item; `parent_id` points to its parent. `node_type` is the semantic label (Area, Goal, Project, Phase, Milestone, Task, Subtask, Habit, etc.). Not every branch needs every level.

Other sheets:
- `Dependencies`: cross-links between nodes.
- `Time_Logs`: planned/actual effort and work sessions.
- `Reviews`: weekly/periodic reviews and resumption decisions.
- `History`: audit trail for node create/update/delete.
- `Settings`: adjustable app settings.
- `AI_Suggestions`: AI proposals remain pending until explicitly approved.

## Important limitations – MVP 0.1
- Single-user prototype, not production-hardened multi-user software.
- UI currently supports reading hierarchy and creating nodes. Update/delete UI, timeline, Kanban, mind-map, offline write-sync, AI decomposition, reminders, analytics, and authentication UI are future versions.
- Apps Script quotas and Sheets performance limits apply. This is suitable for a personal MVP, not high-volume concurrent usage.
- The current service worker caches the app shell only; it does not provide offline database editing.
- Do not expose Apps Script URL or API secret in client-side JavaScript. Keep secrets in Cloudflare environment variables.
- Before using sensitive data, add stronger authentication/authorization and test the deployment end-to-end.

## Suggested version path
- `v0.1.0` – Sheets schema + read/create hierarchy.
- `v0.2.0` – edit, pause/resume notes, status/progress updates.
- `v0.3.0` – task scheduling, time logs, weekly review.
- `v0.4.0` – Tree improvements, Kanban, Timeline.
- `v0.5.0` – AI decomposition proposals with explicit approval.
- `v1.0.0` – stable personal release after real-world use.

## Design rules carried into this starter
1. Outcome-first: define success criteria before breaking work into tasks.
2. Flexible hierarchy: add levels only when they clarify the work.
3. Rolling-wave planning: detail the next milestone; keep distant work broad.
4. Actionable leaf nodes: every active task should have a clear next action.
5. Pause/resume: capture where you stopped and the next action before pausing.
6. AI does not silently alter the plan; suggestions need approval.
