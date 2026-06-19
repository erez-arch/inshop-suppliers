# תכנית פיתוח מומלצת ל-Claude Code

העיקרון: לבנות vertical slices עובדות, עם DB + domain + API + UI + tests, ולא שכבות ענק אופקיות שאינן ניתנות להדגמה.

---

## שלב 0 - Bootstrap והחלטות

### תוצרים

- repository ותשתית build.
- lint, format, typecheck, test runners.
- PostgreSQL + migrations.
- configuration validation.
- CI בסיסי.
- החלטה/תיעוד stack.
- העתקת `CLAUDE.md` ו-`docs/` לריפוזיטורי.

### Acceptance

- build נקי.
- migration ריקה עולה ויורדת בסביבת dev.
- test smoke רץ ב-CI.
- README כולל פקודות setup.

---

## שלב 1 - Design system, RTL, Auth ו-Audit

### תוצרים

- RTL root layout.
- design tokens ורכיבים בסיסיים.
- admin login/session.
- RBAC middleware.
- access link service.
- audit service.
- error envelope/correlation id.

### Demo

- כניסת אדמין.
- דף מוגן.
- יצירת link חתום ופתיחתו.
- Audit event מופיע.

### Tests

- role denied/allowed.
- expired/revoked link.
- RTL visual smoke.

---

## שלב 2 - Master data ו-ExcelLegacyAdapter

### תוצרים

- tables: supplier, branch, item, trustee, aliases.
- `LegacyAdapter` interface.
- `ExcelLegacyAdapter`.
- mock import screen מינימלי.
- seed CSV.
- CRUD/read-only admin views.

### Demo

- העלאת suppliers/branches/items/trustees.
- preview + validation + activate.
- UI מציג מאסטר.

### Acceptance

- אף מסך אינו קורא CSV ישירות.
- invalid schema נחסם.
- adapter contract tests.

---

## שלב 3 - Supplier mobile delivery report

### Vertical slice

- create public session.
- upload invoice/goods.
- branch selection.
- contact form.
- manual/mock AI result.
- mismatch issue.
- submit/idempotency.
- notification job mock.
- success receipt.

### Demo

דיווח מלא מטלפון עד `trustee_pending`.

### Acceptance

תרחישים SUP-001 עד SUP-012.

---

## שלב 4 - Trustee receiving

### תוצרים

- signed trustee link.
- claim semantics.
- trustee media.
- sample OCR lines from MockAiService.
- matching priority.
- quantity edits/Audit.
- pantry before/after.
- reward preview.
- completion to `admin_review`.

### Demo

נאמן משלים 8 שלבים, כולל חוסר בכמות.

### Acceptance

תרחישים TRU-001 עד TRU-012.

---

## שלב 5 - Admin delivery review + inventory ledger

### תוצרים

- admin queue.
- full evidence view.
- line edit/add/delete/match.
- issue override.
- inventory balance/movement model.
- approval transaction.
- liability ledger entry.
- reward approval + mock push job.

### Demo

אדמין מאשר אספקה; היתרה עולה; ledger supplier נוצר; reward push נרשם.

### Acceptance

ADM-001..014 ו-INV-001..008.

---

## שלב 6 - Inventory deltas and counts

### תוצרים

- scheduled mock delta sync.
- legacy close gate.
- count item snapshot.
- mobile count list.
- per-item save + accessible alternative to swipe.
- completion transaction and lock.
- correction policy.

### Demo

ספירה חסומה, retry, אישור, ספירה מלאה ועדכון מלאי.

### Acceptance

CNT-001..013.

---

## שלב 7 - Order rules and supplier aliases

### תוצרים

- branch+supplier rule.
- weekdays, lead time, minimum.
- item target/packaging.
- aliases and primary code.
- WhatsApp destinations.
- unsaved change protection.

### Demo

שמירת כלל מלא, שימוש ב-target כברירת מחדל בספירה חדשה.

### Acceptance

RUL-001..008.

---

## שלב 8 - Credits and supplier portal

### תוצרים

- create/send credit request.
- supplier portal auth/tenancy.
- portal dashboard.
- request detail and upload.
- document versions.
- admin approve/reject/partial.
- ledger credit entry.
- deliveries list.

### Demo

חוסר באספקה -> דרישה -> upload ספק -> approval -> יתרה משתנה.

### Acceptance

CR-001..011 ו-PORT-001..007.

---

## שלב 9 - Payments and supplier ledger UI

### תוצרים

- payment draft from open ledger entries.
- expected amount calculation.
- payment document upload.
- manual recognition result.
- allocations.
- post/reverse.
- supplier balance view.
- portal payment history.

### Demo

שלוש אספקות, זיכוי, תשלום חלקי/מלא/יתר.

### Acceptance

PAY-001..012.

---

## שלב 10 - Real AI services

### סדר יישום

1. Invoice OCR.
2. Supplier/branch recognition.
3. Invoice line extraction.
4. Item matching.
5. Invoice comparison.
6. Payment recognition.
7. Anomaly scoring.

### כל capability חייב לכלול

- port interface.
- async job.
- normalized schema.
- mock fixture.
- failure/manual fallback.
- confidence UI.
- approval/override audit.
- provider timeout/retry.

### Acceptance

AI-001..007. כל ה-E2E הידניים חייבים לעבור גם כאשר AI provider כבוי.

---

## שלב 11 - RealLegacyApiAdapter

### תוצרים

- auth/connection.
- field mapping.
- pagination/cursors.
- sandbox contract tests.
- write idempotency.
- error mapping.
- dual-read comparison report.
- feature flag adapter selection.

### Cutover

- shadow reads.
- compare master/deltas.
- pilot branch.
- rollback to Excel adapter.

### Acceptance

LEG-001..008 מול sandbox/fixtures.

---

## שלב 12 - Hardening and go-live

### אבטחה

- threat model.
- upload malware checks.
- rate limits.
- session hardening.
- supplier tenancy penetration tests.
- secret rotation.

### Reliability

- backup/restore.
- projection rebuild.
- dead-letter dashboard.
- alerting.
- load tests.

### Operations

- runbooks.
- support correlation ids.
- data reconciliation reports.
- training/help text.

---

# מבנה עבודה לכל משימת Claude Code

Claude Code צריך לעבוד כך:

1. לציין את סעיפי האפיון הרלוונטיים.
2. לכתוב plan קצר וקבצים שיושפעו.
3. ליצור migration קודם כאשר צריך.
4. ליישם domain/use case לפני UI.
5. להוסיף tests באותה משימה.
6. להריץ typecheck, unit, integration ו-E2E רלוונטי.
7. לעדכן docs/decision log אם נוצרה הנחה חדשה.
8. לסכם מה הושלם ומה לא.

## Template לפרומפט משימה

```text
Implement vertical slice: <name>.
Read CLAUDE.md and these sections: <links>.
Do not bypass state machines, inventory movements, supplier ledger, LegacyAdapter or AI approval rules.
Deliver migration, domain use case, API, RTL UI, audit, tests and seed fixture.
Run all relevant checks and report any unresolved decision before inventing behavior.
```

---

# Definition of Ready

משימה מוכנה לפיתוח כאשר:

- actor ו-permission ידועים.
- state transition ידוע.
- required fields/validation ידועים.
- side effects ידועים.
- error states ידועים.
- acceptance tests קיימים.
- החלטות פתוחות אינן חוסמות או שקיבלו default.

# Definition of Done

- migration + rollback.
- use case transaction.
- API validated.
- UI RTL responsive.
- audit.
- idempotency.
- unit/integration/E2E.
- no direct legacy/AI provider call from UI/domain.
- docs updated.
