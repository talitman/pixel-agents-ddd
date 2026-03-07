---
phase: 1
slug: foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-07
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node 22 built-in `node:test` + `node:assert` |
| **Config file** | `src/test/configLoader.test.ts` — Wave 0 creates |
| **Quick run command** | `node --import tsx --test src/test/configLoader.test.ts` |
| **Full suite command** | `node --import tsx --test src/test/**/*.test.ts` |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --import tsx --test src/test/configLoader.test.ts`
- **After every plan wave:** Run `node --import tsx --test src/test/**/*.test.ts`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 1 | CFG-01, CFG-04 | unit | `node --import tsx --test src/test/configLoader.test.ts` | ❌ W0 | ⬜ pending |
| 1-01-02 | 01 | 1 | CFG-02, CFG-03 | unit | `node --import tsx --test src/test/configLoader.test.ts` | ❌ W0 | ⬜ pending |
| 1-01-03 | 01 | 1 | CFG-01 integration | manual | F5 → open workspace with/without config | n/a | ⬜ pending |
| 1-02-01 | 02 | 1 | DOM-01, DOM-02 | unit | `node --import tsx --test src/test/configLoader.test.ts` | ❌ W0 | ⬜ pending |
| 1-02-02 | 02 | 1 | DOM-03, DOM-04 | unit | `node --import tsx --test src/test/configLoader.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/test/configLoader.test.ts` — stubs for CFG-01 through CFG-04 and DOM-01 through DOM-04
- [ ] `src/test/` directory — create if not exists

*No framework install needed — `node:test` is built into Node 22.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Extension starts without error (no config file) | CFG-01, CFG-04 | Requires live VS Code Extension Dev Host | F5 → open workspace with no `pixel-agents.config.json` → check Output panel for `[Pixel Agents]` errors |
| Extension starts without error (valid config) | CFG-01, CFG-02, CFG-03 | Requires live VS Code Extension Dev Host | F5 → open workspace with valid config → verify no errors |
| Config live-reload (file watcher) | CFG-01 | Requires running extension | Open workspace → create/edit config file → verify reload log in Output panel |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
