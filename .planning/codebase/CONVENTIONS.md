# Coding Conventions

## Language & Tooling

- **TypeScript** throughout (strict mode)
- **Prettier** for formatting
- **ESLint** with plugins: `typescript-eslint`, `react-hooks`, `simple-import-sort`
- No `enum` — use `as const` objects (enforced by `erasableSyntaxOnly` tsconfig flag)
- `import type` required for type-only imports (`verbatimModuleSyntax`)

## Naming

- Files: `camelCase.ts` for modules, `PascalCase.tsx` for React components
- Interfaces/types: PascalCase (e.g., `AgentState`, `OfficeLayout`)
- Constants: SCREAMING_SNAKE_CASE in constants files
- Functions: camelCase

## Constants

All magic numbers and strings are centralized — **never add inline constants to source files**:
- **Extension backend**: `src/constants.ts`
- **Webview**: `webview-ui/src/constants.ts`
- **CSS styling**: `webview-ui/src/index.css` `:root` block (`--pixel-*` custom properties)

## Logging

All console.log calls use `[Pixel Agents]` prefix:
```ts
console.log('[Pixel Agents] agent created:', id);
```

## State Patterns

- **Pure immutable functions** for layout operations (`editorActions.ts`)
- **Imperative class-based state** for game loop and editor (`officeState.ts`, `editorState.ts`)
- React state used only at component boundary; game state is imperative `OfficeState` class

## Exports

- Named exports everywhere
- Default export only for root `App` component

## Error Handling

- Extension backend: try/catch with `console.error` + `[Pixel Agents]` prefix
- Webview: defensive checks, fallbacks for missing data

## Import Order

Managed by `simple-import-sort` ESLint plugin — run lint to auto-fix.

## TypeScript Constraints

- No `enum` (`erasableSyntaxOnly`) — use `as const` objects
- `import type` required for type-only imports (`verbatimModuleSyntax`)
- `noUnusedLocals` / `noUnusedParameters` enforced
