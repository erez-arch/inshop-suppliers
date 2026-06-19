# תוספת חובה לקלוד קוד - Standalone Demo + Full End-to-End Flow

Build this system as a fully standalone runnable demo before any real legacy integration.

## Critical requirement
The app must work end-to-end with seeded mock data and mock documents, without any connection to the old INSHOP system.
All legacy calls must go through `LegacyAdapter`.
For now implement `ExcelLegacyAdapter` / `MockLegacyAdapter` over the CSV/XLSX files in this test pack.
Do not read CSV/XLSX directly from React screens or business logic.

## Demo roles
Create a demo role switcher or seeded demo logins:
- Supplier / Driver
- Trustee
- INSHOP Admin
- Supplier Accountant

## Full flow that must close with real-looking values
1. Supplier scans/uploads a debit invoice and delivery photo.
2. AI/OCR extracts supplier, branch, invoice number, date, total and line items.
3. Supplier manually selects branch; if AI branch != selected branch, block normal save and show a clear dissonance.
4. Save Delivery as `supplier_reported` and create a trustee receiving link.
5. Trustee opens the link, sees the same delivery, scans/uploads the invoice again, confirms or changes quantities, and can flag unknown items.
6. Trustee must be able to see invoice lines, change quantities, mark item as missing, and send to admin. Final inventory update is not done here.
7. Admin screen must show supplier photos, trustee photos, supplier invoice, trustee invoice, AI result, invoice lines, received quantities, inventory quantities to enter, and discrepancies.
8. Admin can add an item via INSHOP item search, remove a wrong item, change quantities, and map an unknown supplier item code/name to an INSHOP item. Approved mapping must be stored as `SupplierItemMapping` so next OCR run recognizes it automatically.
9. Admin approves inventory update. Only this action updates counted/operational inventory in the new system.
10. If received quantity is lower than invoice quantity, create `CreditRequest` with item-level shortage and gross amount.
11. Supplier Accountant portal shows credit request, original invoice, trustee photo and item-level shortages. Supplier uploads/scans credit invoice.
12. Admin validates credit invoice amount, supplier, branch and related original invoice. If valid, close the credit request; if partial or mismatched, leave open with a clear reason.
13. Payments screen lets INSHOP Admin select multiple approved debit invoices and approved credit invoices, calculates net amount, uploads/scans payment proof, compares detected payment amount to expected amount, and marks paid / partially_paid / overpaid.
14. Every step must write AuditLog entries and status transitions.

## Required demo scenarios from this pack
- `INV-TNV-12547` - valid full receiving.
- `INV-TNV-12548` - shortage: 24 milk units missing; required credit 152.93 NIS.
- `CN-TNV-80125` - exact valid credit.
- `CN-TNV-80126` - wrong/partial credit amount.
- `CN-STR-70005` - wrong supplier credit.
- `INV-TNV-12549` - branch mismatch: invoice says RAMAT_GAN, supplier selects TEL_AVIV.
- `INV-STR-77821` - unknown supplier item `ST-NEW-65` requiring manual mapping.
- `PAY-BANK-33001` - exact payment after credit offset.
- `PAY-BANK-33002` - partial payment.
- `PAY-BANK-33003` - overpayment.

## Acceptance test
Add a single admin QA page: `/admin/demo-scenarios`.
It should let the tester reset demo data and launch each scenario above.
The scenario must show expected status, actual status, expected amount, actual amount and pass/fail.
