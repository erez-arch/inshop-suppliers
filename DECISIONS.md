# Architecture Decisions

## Stack
- **Next.js 16** (App Router) + **TypeScript** + **Tailwind CSS 4** + **Prisma 5** + **SQLite**
- Rationale: standalone demo, no external DB required, fast setup

## Authentication
- Simple base64-encoded JSON session cookie (`inshop_session`)
- No OAuth/JWT — this is a demo system
- Login page at `/login` (outside `/admin/*` route to avoid redirect loop)

## Public Routes
- `/supplier` — delivery wizard, no auth. Any supplier can use the link
- `/trustee/[deliveryId]` — trustee receives via direct delivery link
- `/portal` — read-only view for suppliers/accountants, filtered by supplierId

## Master Data
- Comes from legacy system only. Not created in this system
- ExcelLegacyAdapter reads CSVs from `TEST_PACK/csv/`
- Suppliers, branches, items, trustees seeded once at startup

## Invoices
- Never created in this system — only photographed
- MockInvoiceParserAdapter returns deterministic results by filename (e.g., `INV-TNV-12547.jpg`)
- Unknown files → `needsManualReview: true`

## Item Mapping
- When OCR returns unknown item code → `needsMapping: true` on DeliveryLine
- Admin maps via delivery detail page → stored in SupplierItemMapping
- Auto-applied on next OCR for same supplier+itemCode

## Delivery Status Machine
`draft → supplier_reported → trustee_in_progress → trustee_completed → admin_review → admin_approved | credit_requested → closed`

## Credit Flow
- Created automatically when admin approves with shortages (qtyInventory < qtyInvoice)
- Supplier uploads credit invoice via portal or admin uploads on behalf
- AI validates: supplier match, amount match, reference to original invoice

## Payment Logic
- Auto-gathers all approved deliveries not yet in a payment
- Auto-gathers all approved credit requests and offsets them
- `netAmount = grossAmount - creditsOffset`
- Status: ready_to_pay → paid | partially_paid | overpaid (based on uploaded payment proof)

## Inventory
- Updated only after admin approval
- Formula: last locked count base + admin-approved received quantities - legacy sales deltas
- InventoryCount requires no open legacy invoices for the branch

## Optimistic Locking
- `version` field on Delivery; checked on PATCH
- Submit action skips version check (idempotency guard via status check)
- Trustee complete skips version check (simpler mobile UX)

## File Upload
- Files saved to `/public/uploads/invoices/` with unique timestamped names
- Public URL at `/uploads/invoices/{filename}`
