# Tasks: Spec Kit and OpenCode development workflow

**Spec:** [spec.md](./spec.md) · **Plan:** [plan.md](./plan.md)

- [X] T001 Run Spec Kit v1.4.4 init with the OpenCode integration — verify: `.opencode/commands/speckit.*.md` present
- [X] T002 Add Yorkstead override templates — verify: `resolve-template.sh spec-template` prints the override
- [X] T003 Constitution: Commit a constitution v1.0.0 (shared principles I–VI plus VII, exact money and immutable records) restating `AGENTS.md`. — verify: file present
- [X] T004 Add OpenCode agents, `docs/dev-workflow.md`, PR template, `CLAUDE.md` — verify: files present
- [X] T005 Create `specs/INDEX.md` and `CLAUDE.md`; update `AGENTS.md` (source of truth), `docs/developer-start-here.md`, `docs/prompts/*` (superseded notes), `docs/handoffs/CURRENT.md`. — verify: `git diff`
- [X] T006 Write `verification.md` — verify: AC1–AC4 recorded
- [ ] T007 On the ThinkPad: `opencode agent list` and `/speckit.specify` smoke test — verify: both agents and commands listed

## Handoff state
- Current task: T007 (needs the ThinkPad)
- Next action: Brandon reviews and merges the PR; then run T007.
- Blockers: none
