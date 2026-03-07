# Phase 1: Foundation - Research

**Researched:** 2026-03-07
**Domain:** VS Code Extension — config file I/O, workspace file watching, path-based domain resolution
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CFG-01 | Extension reads optional `pixel-agents.config.json` from workspace root | Node `fs.existsSync` + `fs.readFileSync` at workspace root path; graceful no-op when absent |
| CFG-02 | Config supports `domainsRoot` field (default: `"packages"`) | Interface field with default; resolved to absolute path at load time using workspace root |
| CFG-03 | Config supports `defaultDomain` field (default: `"workspace"`) | Interface field with string default; falls through when path not under domainsRoot |
| CFG-04 | Extension works with zero config — auto-detects `packages/` at workspace root | `fs.existsSync(path.join(workspaceRoot, "packages"))` check at load; use as domainsRoot when present |
| DOM-01 | `detectDomain(filePath)` returns domain name for any file path | Pure function: normalize path → check against resolved domainsRoot → return segment or default |
| DOM-02 | Files inside `<domainsRoot>/<domain>/...` return `<domain>` as their domain | `path.relative(resolvedDomainsRoot, absFilePath).split(path.sep)[0]` is the domain segment |
| DOM-03 | Files outside the domains root return the `defaultDomain` value | When `path.relative` result starts with `..` or is the same path, return defaultDomain |
| DOM-04 | Domain detection is case-preserving | `path.relative` preserves casing; no `.toLowerCase()` anywhere in the pipeline |
</phase_requirements>

---

## Summary

Phase 1 adds two thin, purely extension-backend capabilities: a config loader (`configLoader.ts`) that reads an optional `pixel-agents.config.json` from workspace root, and a domain detection function (`detectDomain()`) that maps any absolute file path to a domain name string. Neither capability touches the webview at all in this phase — they are internal utilities consumed by Phase 2's agent tracking.

The implementation fits naturally into the existing codebase. The project already uses `fs.existsSync` / `fs.readFileSync` (in `layoutPersistence.ts`, `assetLoader.ts`) and `vscode.workspace.workspaceFolders` (in `agentManager.ts`, `PixelAgentsViewProvider.ts`) for all file I/O. The same patterns apply here. Config watching at runtime uses `vscode.workspace.createFileSystemWatcher` — the VS Code–native watcher that respects the VS Code file system abstraction — rather than raw `fs.watch`, because the config lives in the workspace (not a user home directory).

The `detectDomain()` function is a pure, synchronous, Node.js `path`-only utility with no VS Code imports. It lives in the extension backend only — the webview has no file paths to resolve. The loaded config is module-level state in `configLoader.ts`, mutated only on initial load or on `onDidChangeConfiguration`/file-change events.

**Primary recommendation:** Create `src/configLoader.ts` that (1) loads/validates config once at `webviewReady`, (2) auto-detects `packages/` if no config file, (3) exports `detectDomain(absPath)` as a named export. Wire the watcher in `PixelAgentsViewProvider.resolveWebviewView`. Keep config state inside `configLoader.ts`, not on `PixelAgentsViewProvider`.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `node:path` | Node 22 built-in | Path normalization, `path.relative`, `path.sep` | Only correct cross-platform solution; handles Windows sep automatically |
| `node:fs` | Node 22 built-in | `existsSync`, `readFileSync` for config file | Matches how all other file I/O is done in this codebase |
| `vscode.workspace` | ^1.107.0 | `workspaceFolders[0].uri.fsPath`, `createFileSystemWatcher` | VS Code–native workspace access |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `vscode.workspace.createFileSystemWatcher` | ^1.107.0 | Watch `pixel-agents.config.json` for live reloads | At `resolveWebviewView` time; dispose in `PixelAgentsViewProvider.dispose()` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `vscode.workspace.createFileSystemWatcher` | `fs.watch` + polling | `fs.watch` is the existing pattern for `~/.pixel-agents/layout.json` (user-level, outside VS Code workspace). For workspace files, `createFileSystemWatcher` is VS Code idiomatic and handles remote workspaces. Use `createFileSystemWatcher` for the workspace config; keep `fs.watch` + poll only for user-home files |
| `vscode.workspace.onDidChangeConfiguration` | file watcher | Only fires for VS Code settings (`settings.json`), not arbitrary JSON files in workspace root. Not applicable here |

**Installation:** No new dependencies. Uses existing Node built-ins and VS Code API already in the project.

---

## Architecture Patterns

### Recommended Project Structure

New file added to extension backend:

```
src/
├── configLoader.ts     ← NEW: load/validate config, export detectDomain()
├── constants.ts        ← add CONFIG_FILE_NAME, DEFAULT_DOMAINS_ROOT, DEFAULT_DOMAIN constants
├── types.ts            ← add PixelAgentsConfig interface
├── extension.ts        — unchanged
├── PixelAgentsViewProvider.ts  — wire configLoader init + watcher
└── ...                 — all other files unchanged
```

### Pattern 1: Config Loader Module with Internal Singleton State

**What:** `configLoader.ts` holds `let resolvedConfig: ResolvedConfig` (module-level). Exported functions read this state. No class needed.

**When to use:** Simple, single-instance module state — consistent with how `layoutPersistence.ts` owns its file path logic without being a class.

**Example:**

```typescript
// src/configLoader.ts
import * as fs from 'fs';
import * as path from 'path';

import { CONFIG_FILE_NAME, DEFAULT_DOMAIN, DEFAULT_DOMAINS_ROOT } from './constants.js';
import type { PixelAgentsConfig, ResolvedConfig } from './types.js';

let resolvedConfig: ResolvedConfig | null = null;

export function loadConfig(workspaceRoot: string): ResolvedConfig {
  const configPath = path.join(workspaceRoot, CONFIG_FILE_NAME);
  let parsed: Partial<PixelAgentsConfig> = {};

  if (fs.existsSync(configPath)) {
    try {
      const raw = fs.readFileSync(configPath, 'utf-8');
      parsed = JSON.parse(raw) as Partial<PixelAgentsConfig>;
      console.log('[Pixel Agents] Config loaded from', configPath);
    } catch (err) {
      console.error('[Pixel Agents] Failed to parse config, using defaults:', err);
    }
  }

  // Auto-detect: if domainsRoot not specified, check if packages/ exists
  const domainsRootName = parsed.domainsRoot ?? DEFAULT_DOMAINS_ROOT;
  const resolvedDomainsRoot = path.join(workspaceRoot, domainsRootName);

  resolvedConfig = {
    domainsRoot: resolvedDomainsRoot,
    domainsRootExists: fs.existsSync(resolvedDomainsRoot),
    defaultDomain: parsed.defaultDomain ?? DEFAULT_DOMAIN,
  };

  return resolvedConfig;
}

export function getConfig(): ResolvedConfig | null {
  return resolvedConfig;
}
```

### Pattern 2: detectDomain() as Pure Function

**What:** Pure synchronous function over `resolvedConfig`. No VS Code imports. Uses `path.relative` and `path.sep`.

**When to use:** Called from Phase 2's file-event handlers (potentially many times per second). Must be sync and fast.

**Example:**

```typescript
// src/configLoader.ts (continued)
export function detectDomain(absFilePath: string): string {
  if (!resolvedConfig || !resolvedConfig.domainsRootExists) {
    return resolvedConfig?.defaultDomain ?? DEFAULT_DOMAIN;
  }

  const rel = path.relative(resolvedConfig.domainsRoot, absFilePath);

  // path.relative returns something starting with '..' if absFilePath is outside domainsRoot
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    return resolvedConfig.defaultDomain;
  }

  const parts = rel.split(path.sep);
  const domain = parts[0];

  // Empty string means absFilePath IS the domainsRoot itself — fall back
  if (!domain) {
    return resolvedConfig.defaultDomain;
  }

  return domain; // Case-preserved — path.relative does not alter casing
}
```

### Pattern 3: FileSystemWatcher for Config Live-Reload

**What:** `vscode.workspace.createFileSystemWatcher` watching `**/pixel-agents.config.json`. On change/delete: re-run `loadConfig()`. Push updated config to webview if consumers need it (Phase 2/3 concern — not needed in Phase 1).

**When to use:** In `PixelAgentsViewProvider.resolveWebviewView`, after initial `loadConfig()`. Dispose in `PixelAgentsViewProvider.dispose()`.

**Example:**

```typescript
// In PixelAgentsViewProvider.ts resolveWebviewView():
const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
if (workspaceRoot) {
  loadConfig(workspaceRoot);

  const watcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(workspaceRoot, CONFIG_FILE_NAME),
  );
  const reload = () => {
    console.log('[Pixel Agents] Config file changed, reloading');
    loadConfig(workspaceRoot);
  };
  watcher.onDidChange(reload);
  watcher.onDidCreate(reload);
  watcher.onDidDelete(reload);
  context.subscriptions.push(watcher);
}
```

Note: `context.subscriptions.push(watcher)` handles disposal automatically — no need for manual tracking if done in `resolveWebviewView` (which has access to the context through `this.context`).

### Pattern 4: TypeScript Interfaces in `types.ts`

**What:** Two new interfaces: `PixelAgentsConfig` (raw JSON shape) and `ResolvedConfig` (post-processing, with resolved absolute paths).

**When to use:** Raw shape for JSON.parse result; resolved shape for all runtime consumers.

**Example:**

```typescript
// src/types.ts additions
/** Raw shape of pixel-agents.config.json */
export interface PixelAgentsConfig {
  domainsRoot: string;      // e.g. "packages" or "apps"
  defaultDomain: string;    // e.g. "workspace"
}

/** Resolved at load time — absolute paths, existence flags */
export interface ResolvedConfig {
  domainsRoot: string;          // Absolute path to domainsRoot directory
  domainsRootExists: boolean;   // Whether domainsRoot actually exists on disk
  defaultDomain: string;        // Domain name for files outside domainsRoot
}
```

### Anti-Patterns to Avoid

- **Putting config state on `PixelAgentsViewProvider`:** The provider is already busy managing agent maps, timers, and layout watchers. Config is a singleton concern — keep it in `configLoader.ts`.
- **Exposing `detectDomain()` to the webview:** The webview never has file paths to resolve. All domain resolution happens backend-only.
- **Using `fs.watch` for workspace-root config:** `fs.watch` on macOS can miss renames; use `createFileSystemWatcher` for workspace files.
- **Eagerly failing when config is absent:** CFG-04 requires zero-config. `loadConfig()` must always produce a valid `ResolvedConfig` even when no file exists.
- **Storing `domainsRoot` as a relative string in `ResolvedConfig`:** `detectDomain()` uses `path.relative(domainsRoot, ...)` — if `domainsRoot` is relative the comparison is unreliable. Resolve to absolute at load time.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cross-platform path separator | String `.split('/')` | `path.sep` + `path.relative` | Windows uses `\`; `path.relative` already handles normalization |
| Workspace file watching | `fs.watch` + polling loop | `vscode.workspace.createFileSystemWatcher` | VS Code API handles remote workspaces, fires correctly on all platforms |
| JSON schema validation | Custom validator | Partial parse + TypeScript's optional fields + `??` defaults | Config is tiny; full schema validation (Zod, ajv) is over-engineering |

**Key insight:** `path.relative` is the correct primitive for "is this path under that directory?" — it handles platform separators, symlinks, and returns a `..`-prefixed string when outside. No need for string prefix matching or regex.

---

## Common Pitfalls

### Pitfall 1: Windows Path Separators in `detectDomain()`

**What goes wrong:** File paths from VS Code on Windows use backslashes (`C:\foo\packages\api\src`). If code splits on `/`, domain detection silently returns wrong results or the default domain.

**Why it happens:** Developers test on macOS/Linux where `/` is universal; Windows paths silently break regex or `startsWith` checks.

**How to avoid:** Use `path.relative(domainsRoot, filePath)` then `.split(path.sep)`. Both `domainsRoot` (set from `path.join`) and incoming file paths from VS Code (`uri.fsPath`) use the OS-native separator.

**Warning signs:** `detectDomain()` always returns `defaultDomain` on Windows even for files clearly inside `packages/`.

### Pitfall 2: Config Loaded Before Workspace Folders Are Available

**What goes wrong:** `loadConfig()` called at extension `activate()` time, but `vscode.workspace.workspaceFolders` is `undefined` in some edge cases (extension host restart, fresh VS Code window with no folder).

**Why it happens:** VS Code workspace folders are only reliably available after the webview is opened and the workspace is fully initialized.

**How to avoid:** Call `loadConfig(workspaceRoot)` inside `resolveWebviewView` (already triggered by `webviewReady` message which fires after the webview is set up), or guard with `if (!workspaceRoot) return` and leave `resolvedConfig = null`. `detectDomain()` must handle `resolvedConfig === null` gracefully by returning `DEFAULT_DOMAIN`.

**Warning signs:** `vscode.workspace.workspaceFolders?.[0]` is undefined; `loadConfig` receives empty string.

### Pitfall 3: `path.relative` on Paths with Different Cases (Windows)

**What goes wrong:** On Windows, file system is case-insensitive but `path.relative` is case-sensitive by default. `path.relative("C:\\Packages", "C:\\packages\\api\\src")` returns `..\..\packages\api\src` instead of `api\src`.

**Why it happens:** `path.relative` does a string comparison, not a file system comparison.

**How to avoid:** Normalize both paths with the same casing before comparison. The safest approach: resolve both `domainsRoot` and the incoming `filePath` to lowercase before `path.relative` on Windows — but only for the comparison, not for extracting the domain name segment (which must be case-preserved per DOM-04).

**Implementation:** Extract the domain name from the *original* path segments, not from the `path.relative` output:

```typescript
// Windows-safe approach
const normalizedDomainsRoot = resolvedConfig.domainsRoot.toLowerCase();
const normalizedFilePath = absFilePath.toLowerCase();
const relLower = path.relative(normalizedDomainsRoot, normalizedFilePath);
if (relLower.startsWith('..') || path.isAbsolute(relLower)) {
  return resolvedConfig.defaultDomain;
}
// Get segment index from lowercase rel, extract from original path
const parts = relLower.split(path.sep);
const originalParts = absFilePath.slice(resolvedConfig.domainsRoot.length).split(path.sep);
const domain = originalParts.find(p => p.toLowerCase() === parts[0]) ?? parts[0];
```

Simpler alternative: use `path.normalize` on both and trust that `domainsRoot` was set via `path.join(workspaceRoot, domainsRootName)` — which preserves whatever casing was in `workspaceRoot`. On macOS/Linux this is a non-issue (case-sensitive FS). Only matters on Windows.

**Warning signs:** Domain returns `defaultDomain` on Windows when casing of workspace path differs between stored config and runtime path.

### Pitfall 4: Nested `packages/` Directories (packages/a/packages/b)

**What goes wrong:** A file at `packages/api/node_modules/some-lib/packages/b/index.ts` would return `"api"` which is correct — the first segment is still `api`. But a monorepo where `domainsRoot` itself is nested (e.g., user sets `domainsRoot: "apps/packages"`) needs `path.join(workspaceRoot, "apps/packages")` not just `path.join(workspaceRoot, "apps", "packages")` — these are equivalent with `path.join`, so no special handling needed.

**How to avoid:** `path.join(workspaceRoot, domainsRootName)` handles multi-segment `domainsRoot` values (e.g., `"apps/packages"`) correctly.

**Warning signs:** None — `path.join` is correct.

### Pitfall 5: Config File JSON Parse Error Crashes Extension

**What goes wrong:** Malformed `pixel-agents.config.json` throws in `JSON.parse`, propagates up, and the extension either crashes or fails silently with no config loaded.

**Why it happens:** No try/catch around parse.

**How to avoid:** Always wrap `JSON.parse` in try/catch. On parse error: log with `[Pixel Agents]` prefix, fall through to defaults. Show a `vscode.window.showWarningMessage` to inform the user.

**Warning signs:** Extension fails to initialize in workspaces with a config file.

---

## Code Examples

Verified patterns from existing codebase:

### Workspace Root Access (from `agentManager.ts`)

```typescript
// Source: src/agentManager.ts:18
const workspacePath = cwd || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
```

### Synchronous File Existence + Read (from `layoutPersistence.ts`)

```typescript
// Source: src/layoutPersistence.ts:22-32
export function readLayoutFromFile(): Record<string, unknown> | null {
  const filePath = getLayoutFilePath();
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as Record<string, unknown>;
  } catch (err) {
    console.error('[Pixel Agents] Failed to read layout file:', err);
    return null;
  }
}
```

### Console Logging Convention (from `PixelAgentsViewProvider.ts`)

```typescript
// Source: src/PixelAgentsViewProvider.ts:145
console.log('[Extension] workspaceRoot:', workspaceRoot);
console.error('[Pixel Agents] Failed to read layout file:', err);
```

### `vscode.workspace.createFileSystemWatcher` Pattern

```typescript
// VS Code API — standard workspace file watch pattern
// Source: VS Code Extension API docs (verified approach)
const watcher = vscode.workspace.createFileSystemWatcher(
  new vscode.RelativePattern(workspaceRoot, 'pixel-agents.config.json'),
);
watcher.onDidChange(() => { /* reload */ });
watcher.onDidCreate(() => { /* reload */ });
watcher.onDidDelete(() => { /* reset to defaults */ });
context.subscriptions.push(watcher); // auto-disposes with extension
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `fs.watch` for all file watching | `createFileSystemWatcher` for workspace files, `fs.watch` for home-dir files | VS Code has always had this split | Workspace config files should use `createFileSystemWatcher`; the existing `~/.pixel-agents/layout.json` watcher correctly uses `fs.watch` because it's outside the VS Code workspace |

**Deprecated/outdated:**
- `vscode.workspace.onDidChangeConfiguration`: Only relevant for VS Code `settings.json` entries contributed via `contributes.configuration`. Not applicable for arbitrary JSON config files.

---

## Open Questions

1. **Should `loadConfig` be called from `activate()` or from `resolveWebviewView`?**
   - What we know: `activate()` runs before any webview exists; `resolveWebviewView` is only called when the panel is visible. The existing pattern calls most initialization from `webviewReady` inside `resolveWebviewView`.
   - What's unclear: If `detectDomain()` is needed before the webview is open (Phase 2 may call it from JSONL watchers which start at `webviewReady`), `resolveWebviewView` is the correct call site.
   - Recommendation: Call `loadConfig()` from `resolveWebviewView` at the start of the `webviewReady` handler block, guarded by `if (workspaceRoot)`. This matches the existing initialization ordering.

2. **What if `workspaceFolders` is undefined at `resolveWebviewView` time?**
   - What we know: Can happen in an "empty window" (no folder open). `getProjectDirPath()` already handles this with `if (!workspacePath) return null`.
   - What's unclear: Should we show a VS Code warning message?
   - Recommendation: Leave `resolvedConfig = null`; `detectDomain()` returns `DEFAULT_DOMAIN` for all paths. No user-visible error — the extension functions normally, just without domain segmentation.

3. **Does Phase 1 need to notify the webview of the loaded config?**
   - What we know: Phase 2 uses `detectDomain()` in the backend; Phase 3 needs domain names in the webview.
   - What's unclear: Whether to send config to webview now or defer to Phase 2.
   - Recommendation: Phase 1 does NOT send config to webview. `detectDomain()` is backend-only. Phase 2 will send `agentDomainChanged` messages with the domain name string — the webview never needs the raw config.

---

## Validation Architecture

> `nyquist_validation: true` in `.planning/config.json` — section included.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None installed — no test framework in project |
| Config file | None — Wave 0 must install |
| Quick run command | N/A until Wave 0 |
| Full suite command | N/A until Wave 0 |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CFG-01 | Config absent → no error, defaults used | unit | `node --test src/__tests__/configLoader.test.js` | ❌ Wave 0 |
| CFG-02 | Config with `domainsRoot: "apps"` → resolved to abs path | unit | `node --test src/__tests__/configLoader.test.js` | ❌ Wave 0 |
| CFG-03 | Config with `defaultDomain: "main"` → files outside get `"main"` | unit | `node --test src/__tests__/configLoader.test.js` | ❌ Wave 0 |
| CFG-04 | No config + `packages/` present → auto-detected | unit | `node --test src/__tests__/configLoader.test.js` | ❌ Wave 0 |
| DOM-01 | `detectDomain(anyPath)` returns a string (never throws) | unit | `node --test src/__tests__/detectDomain.test.js` | ❌ Wave 0 |
| DOM-02 | `detectDomain("packages/api/src/index.ts")` → `"api"` | unit | `node --test src/__tests__/detectDomain.test.js` | ❌ Wave 0 |
| DOM-03 | `detectDomain("src/utils/helpers.ts")` → `"workspace"` | unit | `node --test src/__tests__/detectDomain.test.js` | ❌ Wave 0 |
| DOM-04 | `detectDomain("packages/MyApp/index.ts")` → `"MyApp"` (not `"myapp"`) | unit | `node --test src/__tests__/detectDomain.test.js` | ❌ Wave 0 |

**Note on test framework choice:** Node 22 has a built-in test runner (`node:test`, invoked with `node --test`) that requires zero new dependencies. Given the project has no existing test framework and the tests are pure unit tests of synchronous functions, the built-in runner is the correct choice. No `npm install` required.

### Sampling Rate

- **Per task commit:** `node --test src/__tests__/configLoader.test.js src/__tests__/detectDomain.test.js`
- **Per wave merge:** Same (all unit tests run in < 5s)
- **Phase gate:** All tests green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/__tests__/configLoader.test.js` — covers CFG-01 through CFG-04
- [ ] `src/__tests__/detectDomain.test.js` — covers DOM-01 through DOM-04
- [ ] No framework install needed — Node 22 built-in `node:test` is sufficient

---

## Sources

### Primary (HIGH confidence)

- Codebase direct read: `src/layoutPersistence.ts` — established pattern for `fs.existsSync`/`readFileSync`/`JSON.parse` with try/catch; exact same pattern for config loading
- Codebase direct read: `src/agentManager.ts:18` — confirmed `vscode.workspace.workspaceFolders?.[0]?.uri.fsPath` as workspace root access pattern
- Codebase direct read: `src/constants.ts` — confirms all magic strings/numbers live here; new constants (`CONFIG_FILE_NAME`, `DEFAULT_DOMAINS_ROOT`, `DEFAULT_DOMAIN`) must go here
- Codebase direct read: `src/types.ts` — confirmed interface location for `PixelAgentsConfig` and `ResolvedConfig`
- Node.js 22 docs (`node:path`) — `path.relative`, `path.sep`, `path.join` behavior verified
- Node.js 22 docs (`node:test`) — built-in test runner available with zero dependencies

### Secondary (MEDIUM confidence)

- VS Code Extension API docs — `vscode.workspace.createFileSystemWatcher` + `RelativePattern` for workspace file watching; this is the idiomatic VS Code approach for workspace-scoped file watchers

### Tertiary (LOW confidence)

- Windows case-insensitive path handling: the proposed lowercase-normalization approach for Windows is logically sound but not tested against the actual Windows VS Code runtime in this project. Flag for manual verification on Windows if relevant.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — uses existing Node built-ins and VS Code API already proven in codebase
- Architecture: HIGH — directly derived from reading existing `layoutPersistence.ts` and `agentManager.ts` patterns
- Pitfalls: MEDIUM — Windows path separator pitfall is well-known; Windows case-insensitivity nuance is LOW (untested in this project)

**Research date:** 2026-03-07
**Valid until:** 2026-04-07 (stable VS Code API and Node path module; no fast-moving dependencies)
