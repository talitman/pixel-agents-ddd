# Concerns

## No Automated Testing

**Severity: High**

Zero test coverage. No Jest, Vitest, or any test framework configured. All verification is manual via Extension Dev Host (F5). Any refactoring carries high regression risk — there's no safety net.

## fs.watch Unreliability (Cross-Platform)

**Severity: Medium**

`fs.watch` is unreliable on Windows/macOS network drives. The codebase mitigates this with a 2s polling backup in `fileWatcher.ts`, but the dual approach adds complexity and the polling interval may miss rapid changes.

## Imperative Game State vs React

**Severity: Medium (architectural debt)**

`OfficeState` is an imperative class, not React state. This works well for performance but creates a split mental model: React manages UI overlays while canvas rendering is fully imperative. Changes to game state require manual `onEditorSelectionChange()` calls to trigger React re-renders. This tight coupling could cause subtle bugs.

## Partial Line Buffering Complexity

**Severity: Low-Medium**

JSONL file reading carries unterminated lines in a buffer across reads. This is necessary for correctness (mid-write reads) but adds complexity to `fileWatcher.ts`. Bugs in buffer handling could cause silent data loss or duplicate processing.

## Single Office = Single Layout File

**Severity: Medium (relevant to DDD feature)**

The layout is a single file at `~/.pixel-agents/layout.json` — one office for the entire workspace. Extending to multi-domain (multiple offices) requires a new persistence model. The current layout schema (`{ version: 1, tiles, furniture }`) has no concept of domains.

## Global Layout Persistence (Cross-Window)

**Severity: Low**

Layout is user-level (`~/.pixel-agents/layout.json`), shared across all VS Code windows. The cross-window sync uses a hybrid `fs.watch` + 2s polling watcher with a `markOwnWrite()` mechanism to avoid read-back loops. Any race condition in this mechanism could cause layout corruption.

## Tool Done Delay (300ms)

**Severity: Low**

`agentToolDone` is delayed 300ms to prevent React batching from hiding brief active states. This is a timing hack — the root cause (React batching behavior) is not addressed. Different machines/loads could break the assumption.

## Asset Pipeline Complexity

**Severity: Low**

The 7-stage asset extraction pipeline (`scripts/`) is manual and browser-UI-based. No CI integration. Regenerating sprites requires manual steps with `asset-manager.html` + CLI tools.

## Magic Numbers in Canvas Rendering

**Severity: Low**

Despite the constants-centralization policy, canvas rendering in `renderer.ts` may contain render-specific values that are hard to tune. The z-sort logic for chairs (`zY = (row+1)*TILE_SIZE` vs `zY = (row+1)*TILE_SIZE + 1`) is particularly fragile.

## Sub-Agent Permission Timer Coupling

**Severity: Low**

Sub-agent permission detection fires on the parent agent's timer. If a sub-agent runs a non-exempt tool and 5s pass without data, permission bubbles appear on BOTH parent and sub-agent. This coupling (`activeSubagentToolNames`) is complex state that could degrade under unusual sub-agent patterns.
