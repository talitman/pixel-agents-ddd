# Structure

## Directory Layout

```
pixel-agents-ddd/
├── src/                          — Extension backend (Node.js, VS Code API)
│   ├── extension.ts              — Entry: activate(), deactivate()
│   ├── PixelAgentsViewProvider.ts — WebviewViewProvider, message dispatch
│   ├── agentManager.ts           — Terminal lifecycle
│   ├── layoutPersistence.ts      — Layout file I/O (~/.pixel-agents/layout.json)
│   ├── fileWatcher.ts            — fs.watch + polling, JSONL reading
│   ├── transcriptParser.ts       — JSONL parsing → webview messages
│   ├── timerManager.ts           — Waiting/permission timer logic
│   ├── assetLoader.ts            — PNG parsing, sprite conversion, catalog building
│   ├── types.ts                  — Shared interfaces (AgentState, PersistedAgent)
│   └── constants.ts              — All backend magic numbers/strings
│
├── webview-ui/
│   ├── src/
│   │   ├── App.tsx               — Composition root
│   │   ├── constants.ts          — All webview magic numbers/strings
│   │   ├── notificationSound.ts  — Web Audio API chime
│   │   ├── index.css             — CSS variables (--pixel-* tokens)
│   │   ├── hooks/
│   │   │   ├── useExtensionMessages.ts — Message handler + agent/tool state
│   │   │   ├── useEditorActions.ts     — Editor state + callbacks
│   │   │   └── useEditorKeyboard.ts    — Keyboard shortcut effect
│   │   ├── components/
│   │   │   ├── BottomToolbar.tsx
│   │   │   ├── ZoomControls.tsx
│   │   │   ├── SettingsModal.tsx
│   │   │   └── DebugView.tsx
│   │   └── office/
│   │       ├── types.ts              — Interfaces + re-exports from constants.ts
│   │       ├── toolUtils.ts          — STATUS_TO_TOOL mapping, extractToolName()
│   │       ├── colorize.ts           — Dual-mode color module
│   │       ├── floorTiles.ts         — Floor sprite storage + colorized cache
│   │       ├── wallTiles.ts          — Wall auto-tile
│   │       ├── sprites/
│   │       │   ├── spriteData.ts     — Pixel data: characters, furniture, tiles
│   │       │   └── spriteCache.ts    — SpriteData → offscreen canvas cache
│   │       ├── editor/
│   │       │   ├── editorActions.ts  — Pure layout ops (paint, place, remove, move)
│   │       │   ├── editorState.ts    — Imperative editor state
│   │       │   └── EditorToolbar.tsx — React toolbar for edit mode
│   │       ├── layout/
│   │       │   ├── furnitureCatalog.ts   — Dynamic catalog + getCatalogEntry()
│   │       │   ├── layoutSerializer.ts  — OfficeLayout ↔ runtime
│   │       │   └── tileMap.ts           — Walkability, BFS pathfinding
│   │       ├── engine/
│   │       │   ├── characters.ts     — Character FSM + wander AI
│   │       │   ├── officeState.ts    — Game world state
│   │       │   ├── gameLoop.ts       — rAF loop with delta time
│   │       │   ├── renderer.ts       — Canvas rendering
│   │       │   └── matrixEffect.ts   — Spawn/despawn digital rain
│   │       └── components/
│   │           ├── OfficeCanvas.tsx  — Canvas, resize, DPR, mouse hit-testing
│   │           └── ToolOverlay.tsx   — Activity status label
│   ├── public/assets/            — Sprites, furniture-catalog.json, default-layout.json
│   └── package.json
│
├── scripts/                      — 7-stage asset extraction pipeline
├── assets/                       — Extension bundled assets
├── esbuild.js                    — Extension build script
├── package.json                  — Extension manifest + build scripts
└── .planning/                    — GSD planning artifacts
    └── codebase/                 — Codebase analysis documents
```

## Key File Locations

| What | Where |
|------|-------|
| Extension entry | `src/extension.ts` |
| Webview root | `webview-ui/src/App.tsx` |
| Backend constants | `src/constants.ts` |
| Webview constants | `webview-ui/src/constants.ts` |
| CSS tokens | `webview-ui/src/index.css` |
| Agent state types | `src/types.ts` |
| Webview types | `webview-ui/src/office/types.ts` |
| Game state | `webview-ui/src/office/engine/officeState.ts` |
| Layout persistence | `src/layoutPersistence.ts` |
| Furniture catalog | `webview-ui/public/assets/furniture-catalog.json` |
| Default layout | `webview-ui/public/assets/default-layout.json` |
| User layout | `~/.pixel-agents/layout.json` |
| JSONL transcripts | `~/.claude/projects/<project-hash>/<session-id>.jsonl` |

## Naming Conventions

- React components: `PascalCase.tsx`
- Modules/utilities: `camelCase.ts`
- Constants: `SCREAMING_SNAKE_CASE` in constants files
- Assets: `{BASE}[_{ORIENTATION}][_{STATE}]` (e.g., `MONITOR_FRONT_OFF`)
