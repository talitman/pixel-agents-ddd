# Roadmap: pixel-agents-ddd

## Overview

Extend the existing pixel-agents VS Code extension with a multi-domain office model. Three phases
deliver this end-to-end: Phase 1 lays the configuration and domain detection foundation, Phase 2
wires agent state to domain tracking in the extension backend, and Phase 3 renders the multi-office
grid in the webview so agents visually live where their work lives.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - Config loader and domain detection utility
- [ ] **Phase 2: Agent Domain Tracking** - Backend state and domain-change events
- [ ] **Phase 3: Multi-Office UI** - Webview grid of rooms, one per active domain

## Phase Details

### Phase 1: Foundation
**Goal**: The extension can read optional config and resolve any file path to a domain name
**Depends on**: Nothing (first phase)
**Requirements**: CFG-01, CFG-02, CFG-03, CFG-04, DOM-01, DOM-02, DOM-03, DOM-04
**Success Criteria** (what must be TRUE):
  1. Extension starts without error in a workspace that has no `pixel-agents.config.json`
  2. Extension starts without error in a workspace that has a valid `pixel-agents.config.json` with `domainsRoot` and `defaultDomain`
  3. `detectDomain("packages/api/src/index.ts")` returns `"api"` (case-preserved folder name)
  4. `detectDomain("src/utils/helpers.ts")` (file outside domainsRoot) returns the configured `defaultDomain`
**Plans**: 2 plans

Plans:
- [x] 01-01-PLAN.md — Config loader + domain detection (TDD): types/constants, configLoader.ts, full test suite
- [ ] 01-02-PLAN.md — Wire configLoader into PixelAgentsViewProvider: loadConfig at webviewReady, live-reload watcher

### Phase 2: Agent Domain Tracking
**Goal**: Every agent has a current domain that updates as it accesses files, and changes reach the webview
**Depends on**: Phase 1
**Requirements**: AGT-01, AGT-02, AGT-03, AGT-04
**Success Criteria** (what must be TRUE):
  1. Each agent's state object carries a `currentDomain` field (visible in debug view)
  2. When an agent reads or writes a file in `packages/api/`, its domain updates to `"api"`
  3. An agent that switches from working in `packages/api/` to `packages/web/` changes domain without error
  4. A `agentDomainChanged` message arrives in the webview whenever an agent's domain changes
**Plans**: TBD

Plans:
- [ ] 02-01: Extend agent state — add `currentDomain` field, wire domain updates from file-access events
- [ ] 02-02: Domain-change messaging — emit `agentDomainChanged` postMessage to webview on every domain transition

### Phase 3: Multi-Office UI
**Goal**: The webview renders one office room per active domain and agents appear in the correct room
**Depends on**: Phase 2
**Requirements**: UI-01, UI-02, UI-03, UI-04, UI-05, UI-06, UI-07
**Success Criteria** (what must be TRUE):
  1. A monorepo workspace with `packages/api` and `packages/web` active shows two labeled office rooms side by side
  2. Each room's label matches its domain name (`"api"`, `"web"`, `"workspace"`)
  3. An agent working in `packages/api/` appears as a character inside the `"api"` room, not the `"web"` room
  4. When an agent's domain changes, its character disappears from the old room and appears in the new room
  5. Typing, reading, idle wander, sub-agents, and permission bubbles all work correctly inside each room
  6. A single-workspace project (no `packages/` folder) shows exactly one office room — identical to current behavior
**Plans**: TBD

Plans:
- [ ] 03-01: Room container — multi-room layout component, one `OfficeState` + canvas per domain, domain label
- [ ] 03-02: Agent routing — place/move agent character into correct room canvas on domain change; dynamic room creation; single-workspace fallback

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 1/2 | In progress | - |
| 2. Agent Domain Tracking | 0/2 | Not started | - |
| 3. Multi-Office UI | 0/2 | Not started | - |
