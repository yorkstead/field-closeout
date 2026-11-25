# Field Closeout Constitution

**Version:** 1.0.0 | **Ratified:** 2026-11-25 | **Shared core:** Yorkstead engineering constitution (same principles I–VI in every Yorkstead repo; principle VII is repo-specific)

## Principles

### I. Behavior before implementation
Every material change begins with a spec under `specs/` (OpenSpec history stays in `openspec/`) covering user value, scope, non-goals, and testable acceptance criteria. Brandon approves the spec before implementation starts.

### II. Preserve existing behavior
Preserve current architecture, the Phase 1 boundary, the living domain specs in `openspec/specs/`, and every rule in `AGENTS.md` unless the active spec explicitly authorizes a change. Prefer additive, reversible changes.

### III. Verification is part of the change
No task is complete until `bun run verify` and task-specific checks pass on the tested revision, and `verification.md` records what was verified, what was not, and why.

### IV. Small slices, resumable state
Tasks are independently verifiable and safely pausable. Specs, tasks, commits, `verification.md`, and `docs/handoffs/CURRENT.md` carry state, never chat history.

### V. Least privilege and safe data handling
Secrets stay out of source control. No real customer records in code, fixtures, logs, or screenshots. Production, migrations against hosted databases, credentials, and external writes require explicit owner authorization.

### VI. Defined roles, one record
Claude is project manager and spec owner; OpenCode agents implement (`.opencode/agents/developer.md`) and review (`.opencode/agents/reviewer.md`, on a different model); Brandon owns every merge to `main`, deploy, and production gate. The repository is the shared control plane. See `docs/dev-workflow.md`.

### VII. Exact money and immutable records
Money is integer cents, computed server-side; client totals are never trusted. Approved, declined, or reconciled change orders are immutable and every transition appends an `approval_events` row. Tenant, role, and threshold checks run on the server. `APP_RUNTIME_MODE` boundaries hold.

## Governance
Changes to these principles require a dated pull request, rationale, and version increment. Principles I–VI change together across all Yorkstead repos.
