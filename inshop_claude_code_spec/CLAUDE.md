# CLAUDE.md - INSHOP Supplier, Inventory, Delivery, Credit and Payment System

## Mission

Build a production-grade, responsive, Hebrew RTL web application that manages the full lifecycle of supplier deliveries, trustee receiving, operational inventory, inventory counts, order rules, supplier credits, supplier payments, trustee rewards and the supplier accountant portal.

The product must work manually and deterministically before any AI automation is introduced.

## Read these files before coding

1. `docs/01_PRODUCT_SPEC_HE.md`
2. `docs/02_UI_UX_SPEC_HE.md`
3. `docs/03_TECHNICAL_ARCHITECTURE.md`
4. `docs/04_STATE_MACHINES.md`
5. `docs/05_API_CONTRACT.yaml`
6. `docs/06_DATABASE_SCHEMA.sql`
7. `docs/07_TEST_PLAN_HE.md`
8. `docs/08_IMPLEMENTATION_PLAN_HE.md`
9. `docs/09_DECISIONS_AND_ASSUMPTIONS_HE.md`

When documents conflict, use this priority:

1. Non-negotiable rules in this file.
2. State-machine guards and financial/inventory invariants.
3. Product specification.
4. API and data-model details.
5. UI text and visual examples.

Do not silently resolve a contradiction. Record it in `docs/09_DECISIONS_AND_ASSUMPTIONS_HE.md` and choose the safest reversible implementation.

## Non-negotiable architecture rules

### Legacy integration

- Every read or write to the old INSHOP system goes through the `LegacyAdapter` interface.
- Screens, route handlers, domain services and repositories must never read Excel/CSV files directly.
- First implement `ExcelLegacyAdapter` for mock files.
- Later implement `RealLegacyApiAdapter` without changing domain services or UI behavior.
- Log every adapter call in `LegacySyncLog` with request, response, duration, status and error.
- All side-effecting adapter operations must be idempotent.

### AI safety

- AI is an assistive service only.
- AI may extract, match, compare, score confidence and propose actions.
- AI must never finalize inventory, approve a credit, post a payment or send a trustee reward without an explicit authorized user action.
- Every AI suggestion shown to a user must include confidence, source and warnings.
- A complete manual fallback must exist for every AI capability.

### Inventory integrity

- Inventory is changed only through immutable `InventoryMovement` records.
- Never update a balance without creating the corresponding movement in the same database transaction.
- Delivery approval, legacy sales deltas and inventory-count completion must be idempotent.
- One active inventory count per branch.
- A completed count is locked; corrections use an audited admin action or a new correction count.

### Financial integrity

- Use fixed-precision decimal types for money. Never use floating point.
- Supplier balances are derived from immutable ledger entries.
- A credit is offset only after its document is approved.
- A payment is posted only after an authorized user confirms the recognized or manually entered amount.
- Posted payments are immutable; corrections use a reversal entry.

### Security and tenancy

- Supplier portal users can access only their own supplier data.
- Trustee links and supplier links are signed, hashed at rest, time-limited and scoped to the exact action.
- Uploads are validated by type, size and content; original files are private.
- All privileged changes require authentication, role checks and audit logs.
- Never expose internal storage paths, secrets, prompts, raw provider tokens or adapter credentials to the browser.

### UX

- All user-facing screens are Hebrew and `dir="rtl"`.
- Supplier, trustee and inventory-count flows are mobile-first.
- Admin delivery review, order rules and payments are desktop-first.
- Supplier portal is fully responsive.
- Every asynchronous operation needs loading, success, retry and failure states.
- Color must not be the only status indicator.
- Minimum interactive target: 44x44 px.

## Reference implementation defaults

Use the existing repository stack if one already exists. For a greenfield implementation, the preferred default is:

- TypeScript full-stack web application.
- React-based UI with server-side route handling.
- PostgreSQL.
- ORM with migrations and transactions.
- Schema validation at every API boundary.
- S3-compatible private object storage for images and documents.
- Background job abstraction for OCR, notifications, retries and legacy synchronization.
- Unit tests, integration tests and browser end-to-end tests.

Do not hard-code provider-specific services into domain logic. Use interfaces for object storage, notifications, AI and legacy integration.

## Suggested repository structure

```text
apps/
  web/
packages/
  domain/              # entities, value objects, state machines, policies
  application/         # use cases and transaction orchestration
  persistence/         # repositories and migrations
  integrations/
    legacy/
    ai/
    notifications/
    storage/
  ui/                  # reusable RTL components and tokens
docs/
mock-data/
tests/
  unit/
  integration/
  e2e/
```

A single application repository is acceptable, but preserve the same dependency direction:

`UI/API -> application use cases -> domain -> ports/interfaces <- infrastructure adapters`

## Required domain modules

1. Master data: suppliers, branches, items, trustees and supplier item aliases.
2. Supplier delivery reporting wizard.
3. Trustee receiving wizard.
4. Admin delivery review and inventory approval.
5. Inventory balances, movements and counts.
6. Supplier order rules.
7. Credit requests and credit documents.
8. Supplier payments, allocations and ledger.
9. Supplier accountant portal.
10. Trustee rewards.
11. AI analysis abstraction.
12. Legacy adapter and mock-data management.
13. Notifications and access links.
14. Audit, observability and retry jobs.

## Coding rules

- Centralize statuses and transition guards; do not scatter string comparisons across screens.
- Use explicit use cases, for example:
  - `SubmitSupplierDeliveryReport`
  - `CompleteTrusteeReceiving`
  - `ApproveDeliveryToInventory`
  - `StartInventoryCount`
  - `SaveInventoryCountLine`
  - `CompleteInventoryCount`
  - `CreateCreditRequest`
  - `ApproveCreditDocument`
  - `PostSupplierPayment`
- Use database transactions for every use case that writes more than one business record.
- Every side-effecting endpoint accepts an idempotency key.
- Return machine-readable error codes plus Hebrew display messages.
- Store timestamps in UTC; render in the configured Israel timezone.
- Store quantities in units as integers unless a future item explicitly supports fractional units.
- Preserve original OCR text and user-corrected values separately.
- Never overwrite an uploaded document; create a new version and retain the audit trail.

## Required test behavior

Before marking a feature complete:

- Unit tests cover all calculations and transition guards.
- Integration tests cover transactions, idempotency and adapter failure.
- E2E tests cover the happy path and at least one failure path.
- The exact acceptance cases in `docs/07_TEST_PLAN_HE.md` pass.
- There is no route that can bypass the domain use case and mutate inventory or money directly.

## Definition of done for each vertical slice

A slice is done only when it includes:

- Data migration.
- Domain rules and use case.
- API endpoint.
- Authorized UI.
- Loading, empty, validation and error states.
- Audit log.
- Unit/integration/E2E tests.
- Updated documentation.
- Seed/mock data.

## Build order

Follow `docs/08_IMPLEMENTATION_PLAN_HE.md`. The mandatory order is:

1. Foundation, auth, RTL design system and audit.
2. Master data and `ExcelLegacyAdapter`.
3. Supplier delivery report.
4. Trustee receiving.
5. Admin delivery approval and inventory ledger.
6. Inventory count and legacy close gate.
7. Order rules.
8. Credits and supplier portal.
9. Payments and supplier ledger.
10. AI services.
11. `RealLegacyApiAdapter`.

Do not begin real AI integration before the manual end-to-end delivery, credit and payment flows pass their acceptance tests.
