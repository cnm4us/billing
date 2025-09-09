# Decisions Log

This log records key technical and product decisions with short context and rationale. Keep entries concise and link code where possible.

## How to use
- Add a new entry at the top when making a decision.
- Prefer small, incremental decisions over long essays.
- Link to PRs/commits, files, and related TODO items.

---

### 2025-09-09 — Adopt lightweight docs and plan
- Context: Local CLI-based collaboration with Codex; need durable context beyond chat threads.
- Decision: Track decisions in `docs/DECISIONS.md` and operational backlog in `docs/TODO.md`; maintain a live plan via the CLI plan tool.
- Rationale: Avoid context loss from long chats; keep the source of truth in-repo.
- Implications: Contributors should update docs alongside code changes.
- Links: `docs/TODO.md`

<!-- Add new decisions above this line -->

