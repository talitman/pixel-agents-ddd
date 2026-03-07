# pixel-agents-ddd

## What This Is

A fork of pixel-agents — a VS Code extension with an embedded React webview showing a pixel art office
where AI agents (Claude Code terminals) are animated characters. This project extends the concept so
that each domain in the workspace (e.g., each package in a monorepo) is represented as its own
separate, fully functional office room, with agents moving between rooms based on which files they
are accessing.

## Core Value

Every domain gets its own office: agents live where their work lives, and every room supports the
full set of agent actions (read, write, chat, tool animations, layout editing) independently.

## Requirements

### Validated

- ✓ VS Code extension with embedded React webview — existing
- ✓ Pixel art office with animated agent characters (Claude Code terminals) — existing
- ✓ Agent status tracking via JSONL transcript watching — existing
- ✓ Layout editor (floor, walls, furniture, drag-to-move, undo/redo) — existing
- ✓ Persistent layout at `~/.pixel-agents/layout.json` — existing
- ✓ Agent sprites with FSM (idle/walk/type/read), sub-agents, permission bubbles — existing
- ✓ Sound notifications, settings modal, zoom controls — existing

### Active

- [ ] Config loader: read optional `pixel-agents.config.json` from workspace root
- [ ] Auto-detect domains: if no config, use subdirectories of `packages/` at workspace root
- [ ] `detectDomain(filePath)` utility: maps any file path to its domain name
- [ ] Agents travel between domains: agent's current domain updates as files are accessed
- [ ] Multi-office UI: grid of office rooms, one per active domain
- [ ] Each room is fully functional: all agent actions work per-room
- [ ] Agents appear in the room matching their current domain
- [ ] "workspace" catch-all room for files outside any domain root

### Out of Scope

- Full rewrite of rendering engine — keep existing canvas/game loop, add domain layer above it
- Per-room separate layouts — rooms share layout schema but each domain has its own instance
- Real-time multi-user collaboration — out of scope for this milestone

## Context

**Brownfield project.** Existing codebase is a production VS Code extension with:
- Extension host (Node.js) + webview (React + Vite), communicating via `postMessage`
- Imperative `OfficeState` game class (not React state) — all rendering is canvas-based
- Single office model today: one `OfficeLayout`, one `OfficeState`, one canvas
- Layout persisted to `~/.pixel-agents/layout.json`

**The domain model lives above the current office:** the extension backend detects which domain a
file belongs to, tracks each agent's current domain, and the webview renders a grid of office
canvases (one per domain). The existing `OfficeState` + renderer are reused per room.

**Domain detection rule:**
1. Read `domainsRoot` from `pixel-agents.config.json` (default: `packages`)
2. If file path contains `packages/<domain>/...` → domain = `<domain>`
3. Otherwise → domain = `defaultDomain` (default: `workspace`)

**Agent travel:** agents are not locked to a room. They follow their work. Every file access event
(read, write, open) triggers a domain re-evaluation. The agent moves to whatever room matches the
file being touched.

## Constraints

- **Tech stack**: TypeScript, VS Code Extension API, React 19, esbuild + Vite — no new runtimes
- **No enum**: use `as const` objects (enforced by tsconfig `erasableSyntaxOnly`)
- **Constants**: all magic numbers go in `src/constants.ts` or `webview-ui/src/constants.ts`
- **Rendering**: do not rewrite canvas renderer — compose domain layer above existing engine
- **Backwards compat**: single-workspace (no `packages/` folder) must still work as one office

## Key Decisions

| Decision | Rationale | Outcome |
|---|---|---|
| Domain layer above rendering engine | Reuse existing OfficeState/renderer per room, avoid rewrite | — Pending |
| Auto-detect `packages/` if no config | Zero-config experience for standard monorepos | — Pending |
| Agents travel freely between domains | Agents follow their work, not locked to one room | — Pending |
| "workspace" catch-all room | Files outside any domain root still have a home | — Pending |

---
*Last updated: 2026-03-07 after initialization*
