# Delta Spec: runtime-boundaries (001-bootstrap-shell)

## ADDED Requirements

### Requirement: Runtime Mode Guard
The system MUST validate `APP_RUNTIME_MODE` (`local` | `hosted_demo` | `protected_pilot`) at startup/request time and gate demo-only controls accordingly.

#### Scenario: Demo endpoints blocked in protected_pilot
- **WHEN** `APP_RUNTIME_MODE` is `protected_pilot`
- **AND** a client calls `POST /api/demo/session` or `POST /api/demo/reset`
- **THEN** the server responds with HTTP `403` and performs no mutation.

#### Scenario: Demo role switcher works in local and hosted_demo
- **WHEN** `APP_RUNTIME_MODE` is `local` or `hosted_demo`
- **AND** a user switches role from `tech` to `office` via `POST /api/demo/session`
- **THEN** the session cookie updates to the seeded `office` user and subsequent server requests resolve `role === 'office'` scoped to the seeded tenant.

### Requirement: Idempotent Synthetic Demo Seed & Reset
The system MUST seed 100% fictional trade contractor data (*Northstar Mechanical & Plumbing*) and allow resetting to a clean baseline in `local` and `hosted_demo` modes.

#### Scenario: Reset Demo Data restores baseline
- **WHEN** a user triggers `POST /api/demo/reset` in `local` or `hosted_demo`
- **THEN** existing demo tenant records are cleared and re-seeded with the canonical 6 catalog items, 4 jobs, and 3 sample change orders.

### Requirement: Exact Integer-Cents Money Utilities
All monetary math helpers MUST operate strictly on integer cents and reject non-integer values.

#### Scenario: Integer-cents formatting and line total math
- **WHEN** `computeLineTotalCents(quantity, unitPriceCents)` is called with `(2, 18000)`
- **THEN** it returns `36000` and `formatCents(36000)` returns `"$360.00"`.
- **WHEN** a floating-point number such as `180.5` is passed as `unitPriceCents`
- **THEN** it throws an error.
