# Technology Stack

**Analysis Date:** 2026-03-07

## Languages

**Primary:**
- TypeScript 5.9.x - Extension backend (`src/`) and webview UI (`webview-ui/src/`)

**Secondary:**
- JavaScript (CommonJS) - Build tooling (`esbuild.js`, `scripts/generate-walls.js`)
- CSS - Webview styling (`webview-ui/src/index.css`)

## Runtime

**Environment:**
- Node.js 22 (pinned via `.nvmrc`)
- Browser (Chromium, inside VS Code webview panel) for webview UI

**Package Manager:**
- npm
- Lockfiles: present (`package-lock.json`, `webview-ui/package-lock.json`)

## Frameworks

**Extension Host:**
- VS Code Extension API ^1.107.0 — `WebviewViewProvider`, terminal lifecycle, workspace state, commands. External to bundle (marked `external: ['vscode']` in esbuild).

**Webview UI:**
- React 19.2.0 — UI composition in `webview-ui/src/App.tsx` and `webview-ui/src/components/`
- React DOM 19.2.0 — DOM rendering

**Testing:**
- Not present — no test framework installed

**Build/Dev:**
- esbuild ^0.27.2 — bundles extension backend (`src/`) → `dist/extension.js` (CJS, Node platform). Config: `esbuild.js`
- Vite ^7.2.4 + `@vitejs/plugin-react` ^5.1.1 — builds webview UI → `dist/webview/`. Config: `webview-ui/vite.config.ts`
- tsx ^4.21.0 — runs asset pipeline scripts (`scripts/*.ts`) directly without pre-compile
- npm-run-all ^4.1.5 — parallel watch tasks (`npm run watch`)

## Key Dependencies

**Critical:**
- `pngjs` ^7.0.0 — PNG parsing for sprite/asset extraction in extension host. Used by `src/assetLoader.ts` to convert PNG buffers to `string[][]` SpriteData.
- `react` / `react-dom` ^19.2.0 — webview UI framework
- VS Code API ^1.107.0 — extension host runtime (terminals, webview, workspace state, commands)

**Dev-time Asset Pipeline:**
- `@anthropic-ai/sdk` ^0.74.0 — used exclusively by `scripts/3-vision-inspect.ts` to call Claude Vision API for auto-tagging furniture assets during the tileset import pipeline. Requires `ANTHROPIC_API_KEY` env var. Not used at runtime.

**Git Hooks:**
- `husky` ^9.1.7 — pre-commit hook runner
- `lint-staged` ^16.3.2 — runs ESLint + Prettier on staged files

## Configuration

**TypeScript (Extension Backend):**
- `tsconfig.json` — `module: Node16`, `target: ES2022`, `strict: true`, `rootDir: src`
- No `enum` allowed (`erasableSyntaxOnly` on webview tsconfig; enforced by CLAUDE.md convention on both)
- `import type` required for type-only imports (`verbatimModuleSyntax` on webview tsconfig)

**TypeScript (Webview UI):**
- `webview-ui/tsconfig.app.json` — `module: ESNext`, `target: ES2022`, `jsx: react-jsx`, `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`, `erasableSyntaxOnly: true`

**Formatting:**
- `.prettierrc.json` — `singleQuote: true`, `tabWidth: 2`, `printWidth: 100`, `trailingComma: all`, `endOfLine: lf`

**Linting:**
- `eslint.config.mjs` (extension) — `typescript-eslint`, `eslint-plugin-simple-import-sort`, `eslint-config-prettier`
- `webview-ui/eslint.config.js` (webview) — adds `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`

**Environment:**
- No `.env` file required at runtime; the extension reads no environment variables
- `ANTHROPIC_API_KEY` required only when running `scripts/3-vision-inspect.ts` (dev-time only)

**Build:**
- `esbuild.js` — entry: `src/extension.ts` → `dist/extension.js` (CJS); also copies `webview-ui/public/assets/` → `dist/assets/`
- `webview-ui/vite.config.ts` — `outDir: ../dist/webview`, `base: ./`

## Platform Requirements

**Development:**
- Node.js 22
- VS Code ^1.107.0
- `npm install` in root and `webview-ui/` separately
- Build: `npm run build` (type-check → lint → esbuild → vite)
- Dev: F5 in VS Code launches Extension Development Host

**Production:**
- Packaged as `.vsix` via `vsce` (`npm run package`)
- Runs in VS Code Extension Host process (Node.js)
- Webview runs in Chromium sandbox within VS Code panel
- No external server, no network requirements at runtime
- Layout stored at `~/.pixel-agents/layout.json` (user home dir)
- Claude transcripts read from `~/.claude/projects/<project-hash>/*.jsonl`

---

*Stack analysis: 2026-03-07*
