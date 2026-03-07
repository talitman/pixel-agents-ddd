# Architecture

## Pattern

**VS Code Extension + Embedded React Webview**

Two distinct runtimes communicating via `postMessage`:
- **Extension host** (Node.js): VS Code API, file system, terminal management
- **Webview** (React + TypeScript, Vite): pixel art office rendering, game loop, editor

## Layers

### Extension Backend (`src/`)

```
VS Code API
    ↓
extension.ts          — activate/deactivate, command registration
    ↓
PixelAgentsViewProvider.ts  — WebviewViewProvider, message dispatch, asset loading
    ↓
agentManager.ts       — terminal lifecycle (launch, remove, restore, persist)
fileWatcher.ts        — JSONL file watching (fs.watch + 2s polling backup)
transcriptParser.ts   — JSONL → webview messages
layoutPersistence.ts  — layout file I/O (~/.pixel-agents/layout.json)
timerManager.ts       — waiting/permission timer logic
assetLoader.ts        — PNG → SpriteData, catalog building
```

### Webview Frontend (`webview-ui/src/`)

```
App.tsx               — composition root
    ↓
hooks/                — message handling, editor state, keyboard
    ↓
office/
  engine/             — game loop (rAF), OfficeState, renderer, characters FSM
  layout/             — serialization, furniture catalog, tile map/pathfinding
  editor/             — layout editor state + actions (pure functions)
  sprites/            — sprite data + offscreen canvas cache
  components/         — OfficeCanvas, ToolOverlay
components/           — BottomToolbar, ZoomControls, SettingsModal, DebugView
```

## Data Flow

### Agent Lifecycle
```
User clicks "+ Agent"
  → agentManager: new terminal (claude --session-id <uuid>)
  → agentCreated message → webview
  → 1s poll for <uuid>.jsonl → fileWatcher starts
  → JSONL events → transcriptParser → postMessage to webview
  → useExtensionMessages updates agent state → renderer
```

### Layout Persistence
```
Layout edit in webview
  → saveLayout message → extension
  → writeLayoutToFile() → ~/.pixel-agents/layout.json (atomic: .tmp + rename)
  → watchLayoutFile() detects external changes → layoutLoaded to other windows
```

### Message Protocol (key messages)
- `openClaude`, `agentCreated/Closed`, `focusAgent`
- `agentToolStart/Done/Clear`, `agentStatus`
- `existingAgents`, `layoutLoaded`, `furnitureAssetsLoaded`
- `floorTilesLoaded`, `wallTilesLoaded`, `characterSpritesLoaded`
- `saveLayout`, `saveAgentSeats`, `exportLayout`, `importLayout`
- `settingsLoaded`, `setSoundEnabled`

## Key Abstractions

- **AgentState** — per-agent runtime state (id, terminalRef, projectDir, jsonlFile, fileOffset, lineBuffer, activeToolIds, isWaiting)
- **OfficeState** — imperative game world class (layout, characters, seats, selection, subagents)
- **Character FSM** — idle (wander) / active (pathfind to seat, animate by tool type)
- **OfficeLayout** — `{ version: 1, cols, rows, tiles, furniture, tileColors? }`

## Entry Points

- **Extension**: `src/extension.ts` → `activate()`
- **Webview**: `webview-ui/src/App.tsx`
- **Build**: `esbuild.js` (extension) + Vite (webview)

## Asset Load Order

`characterSpritesLoaded` → `floorTilesLoaded` → `wallTilesLoaded` → `furnitureAssetsLoaded` → `layoutLoaded`
