# Backlog & TODOs

Single source of truth for open work. Keep tight, prioritized, and linked to code.

Legend: [P1]=urgent/next, [P2]=soon, [P3]=later

## Next Up
- [P1] Capture current decisions from codebase and routes (link: `docs/DECISIONS.md`).
- [P1] Validate HCPCS loader input and add dry-run/logging (`scripts/load-hcpcs.js`).

## Backlog
- [P1] Define/validate workflows API contracts, add clear error paths (`src/routes/workflows.js`).
- [P2] Add basic tests for loader and routes (fixtures + happy/error paths).
- [P2] Improve `index.ejs` UX: empty states, basic filter/search, pagination.
- [P2] Add `.env.example` and centralize config loading.
- [P3] Developer ergonomics: lint/format scripts and pre-commit hook.

## Notes
- Keep items actionable and small; split big efforts.
- When a decision is made, add it to `docs/DECISIONS.md` and link here.
- Close the loop with commits referencing TODO items.

