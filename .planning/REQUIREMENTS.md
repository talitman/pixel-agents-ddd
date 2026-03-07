# Requirements: pixel-agents-ddd

**Defined:** 2026-03-07
**Core Value:** Every domain gets its own office — agents live where their work lives, every room is fully functional.

## v1 Requirements

### Configuration

- [ ] **CFG-01**: Extension reads optional `pixel-agents.config.json` from workspace root
- [ ] **CFG-02**: Config supports `domainsRoot` field (default: `"packages"`) to specify which folder contains domain subdirectories
- [ ] **CFG-03**: Config supports `defaultDomain` field (default: `"workspace"`) for files outside the domains root
- [ ] **CFG-04**: Extension works with zero config — auto-detects `packages/` at workspace root

### Domain Detection

- [ ] **DOM-01**: `detectDomain(filePath)` returns the domain name for any file path
- [ ] **DOM-02**: Files inside `<domainsRoot>/<domain>/...` return `<domain>` as their domain
- [ ] **DOM-03**: Files outside the domains root return the `defaultDomain` value
- [ ] **DOM-04**: Domain detection is case-preserving (folder name = domain name)

### Agent Domain Tracking

- [ ] **AGT-01**: Each agent has a current domain field in state
- [ ] **AGT-02**: When an agent accesses a file (read, write, open), its domain is updated via `detectDomain()`
- [ ] **AGT-03**: Agents can move freely between domains — not locked to one room
- [ ] **AGT-04**: Domain change events are communicated from extension backend to webview

### Multi-Office UI

- [ ] **UI-01**: Webview renders a grid of office rooms — one room per active domain
- [ ] **UI-02**: Each room displays the domain name as a label
- [ ] **UI-03**: Agent sprites appear in the room matching their current domain
- [ ] **UI-04**: When an agent's domain changes, their sprite moves to the corresponding room
- [ ] **UI-05**: All existing agent actions (typing, reading, idle wander, sub-agents, permission bubbles) work inside each room
- [ ] **UI-06**: Rooms appear dynamically as new domains become active
- [ ] **UI-07**: Single-workspace (no packages folder) falls back to one office — existing behavior preserved

## v2 Requirements

### Polish

- **POL-01**: Animated agent transition effect when moving between rooms
- **POL-02**: Per-domain layout customization (different furniture per room)
- **POL-03**: Room labels are user-editable
- **POL-04**: Collapse/expand individual rooms

## Out of Scope

| Feature | Reason |
|---------|--------|
| Rewriting the canvas renderer | Domain layer sits above existing engine — renderer reused per room |
| Per-room persistent layouts | v1 uses shared layout schema; domain instance variation is v2 |
| Real-time multi-user collaboration | Out of scope for this milestone |
| Detecting domain from git blame/ownership | File path is sufficient signal; git integration is over-engineering |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CFG-01 | Phase 1 | Pending |
| CFG-02 | Phase 1 | Pending |
| CFG-03 | Phase 1 | Pending |
| CFG-04 | Phase 1 | Pending |
| DOM-01 | Phase 1 | Pending |
| DOM-02 | Phase 1 | Pending |
| DOM-03 | Phase 1 | Pending |
| DOM-04 | Phase 1 | Pending |
| AGT-01 | Phase 2 | Pending |
| AGT-02 | Phase 2 | Pending |
| AGT-03 | Phase 2 | Pending |
| AGT-04 | Phase 2 | Pending |
| UI-01 | Phase 3 | Pending |
| UI-02 | Phase 3 | Pending |
| UI-03 | Phase 3 | Pending |
| UI-04 | Phase 3 | Pending |
| UI-05 | Phase 3 | Pending |
| UI-06 | Phase 3 | Pending |
| UI-07 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 19 total
- Mapped to phases: 19
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-07*
*Last updated: 2026-03-07 after roadmap creation*
