# External Integrations

**Analysis Date:** 2026-03-07

## APIs & External Services

**Anthropic Claude (dev-time only):**
- Claude Vision API — used by `scripts/3-vision-inspect.ts` to auto-generate furniture asset metadata (name, label, category, isDesk, canPlaceOnWalls) during tileset import pipeline
  - SDK/Client: `@anthropic-ai/sdk` ^0.74.0 (devDependency)
  - Auth: `ANTHROPIC_API_KEY` environment variable (read from `.env` file or process env)
  - Not used at runtime — strictly a developer tooling dependency

**Claude Code CLI (runtime, local):**
- The extension launches `claude --session-id <uuid>` in VS Code terminals. This is the Claude Code CLI installed locally on the user's machine.
- No API key is managed by the extension; authentication is handled by Claude Code itself
- The extension only reads the JSONL transcript files that Claude Code writes to disk
- Transcript path: `~/.claude/projects/<project-hash>/<session-id>.jsonl`

## Data Storage

**Databases:**
- None — no database connections

**File Storage (local filesystem only):**
- Layout file: `~/.pixel-agents/layout.json` — user-level office layout, shared across all VS Code windows. Read/written by `src/layoutPersistence.ts` via Node.js `fs` module
- Agent transcripts: `~/.claude/projects/<project-hash>/*.jsonl` — written by Claude Code CLI, read-only by extension via `src/fileWatcher.ts`
- Character sprites: `dist/assets/characters/char_0.png` – `char_5.png`
- Furniture assets: `dist/assets/furniture/furniture-catalog.json` + PNG files
- Floor tiles: `dist/assets/floors.png`
- Wall tiles: `dist/assets/walls.png`
- Default layout: `dist/assets/default-layout.json`

**Caching:**
- In-memory only — sprite data cached in `WeakMap` per zoom level in `webview-ui/src/office/sprites/spriteCache.ts`. No persistent cache layer.

## Authentication & Identity

**Auth Provider:**
- None — the extension has no authentication of its own
- Claude Code CLI authentication is external and user-managed

## Monitoring & Observability

**Error Tracking:**
- None — no crash reporting or external monitoring service

**Logs:**
- `console.log` / `console.error` / `console.warn` — extension host logs appear in VS Code's "Output" panel under "Pixel Agents" when the extension is active. No structured logging library.

## CI/CD & Deployment

**Hosting:**
- VS Code Marketplace — published by publisher `pablodelucca`
- GitHub repository: `https://github.com/pablodelucca/pixel-agents`

**CI Pipeline:**
- Not detected — no CI config files (`.github/workflows/`, `.circleci/`, etc.) found in the repository

**Packaging:**
- `vsce` (VS Code Extension manager) — invoked via `npm run package` → `vscode:prepublish` script
- Output: `.vsix` file for marketplace upload

## Environment Configuration

**Required env vars (runtime):**
- None — the extension reads no environment variables at runtime

**Required env vars (dev-time asset pipeline only):**
- `ANTHROPIC_API_KEY` — needed only to run `scripts/3-vision-inspect.ts` for furniture asset auto-tagging

**Secrets location:**
- No secrets tracked in version control
- `.env` file (if present) is gitignored and read only by `scripts/3-vision-inspect.ts`

## VS Code Extension Host APIs Used

**Terminal Management:**
- `vscode.window.createTerminal()` — creates Claude Code terminals
- `terminal.sendText()` — sends `claude --session-id <uuid>` command
- `vscode.window.terminals` — enumerates live terminals for agent restore

**Webview Communication:**
- `vscode.window.registerWebviewViewProvider()` — registers the panel webview
- `webview.postMessage()` — extension → webview messages
- `webview.onDidReceiveMessage()` — webview → extension messages

**State Persistence:**
- `context.workspaceState` — persists agent list (`pixel-agents.agents`), agent seat assignments (`pixel-agents.agentSeats`)
- `context.globalState` — persists sound enabled preference (`pixel-agents.soundEnabled`)

**File System:**
- Node.js `fs` module (not VS Code `vscode.workspace.fs`) — used for all file I/O (JSONL reading, layout file, PNG loading)
- `fs.watch` + `fs.watchFile` — hybrid file watching for JSONL transcripts and layout file

**Commands:**
- `pixel-agents.showPanel` — focuses the webview panel
- `pixel-agents.exportDefaultLayout` — writes current layout to `webview-ui/public/assets/default-layout.json`

## Webhooks & Callbacks

**Incoming:**
- None — no HTTP server, no webhook endpoints

**Outgoing:**
- None — no outgoing HTTP requests at runtime

## Web Audio API (Webview)

**Notification Sound:**
- Browser Web Audio API (`AudioContext`, `OscillatorNode`, `GainNode`) — used by `webview-ui/src/notificationSound.ts` to play a two-note chime when an agent completes a turn
- No external audio service; tones are synthesized programmatically
- `AudioContext` must be resumed on user gesture (webview starts suspended); unlock called on canvas `mousedown`

---

*Integration audit: 2026-03-07*
