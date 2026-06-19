-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "vatId" TEXT,
    "phone" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "branches" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT,
    "barcode" TEXT,
    "assortmentActive" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "trustees" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "imageUrl" TEXT,
    "branchId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "trustees_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "supplier_item_codes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "supplierId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "supplierItemCode" TEXT NOT NULL,
    "supplierItemName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "supplier_item_codes_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "supplier_item_codes_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "deliveries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reference" TEXT NOT NULL,
    "supplierId" TEXT,
    "branchId" TEXT,
    "aiDetectedBranch" TEXT,
    "trusteeId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "supplierName" TEXT,
    "supplierPhone" TEXT,
    "supplierNote" TEXT,
    "invoiceNumber" TEXT,
    "invoiceDate" TEXT,
    "invoiceTotal" DECIMAL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "supplierReportedAt" DATETIME,
    "trusteeCompletedAt" DATETIME,
    "adminApprovedAt" DATETIME,
    "closedAt" DATETIME,
    CONSTRAINT "deliveries_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "deliveries_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "deliveries_trusteeId_fkey" FOREIGN KEY ("trusteeId") REFERENCES "trustees" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deliveryId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "invoiceNumber" TEXT,
    "invoiceDate" TEXT,
    "total" DECIMAL,
    "subtotal" DECIMAL,
    "vat" DECIMAL,
    "aiConfidence" REAL,
    "aiRaw" TEXT,
    "warnings" TEXT,
    "filePath" TEXT,
    "originalName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "invoices_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "deliveries" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "invoice_lines" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceId" TEXT NOT NULL,
    "lineNo" INTEGER NOT NULL,
    "rawName" TEXT NOT NULL,
    "supplierItemCode" TEXT,
    "itemId" TEXT,
    "qty" INTEGER NOT NULL,
    "unitPrice" DECIMAL,
    "lineTotal" DECIMAL,
    "aiConfidence" REAL,
    "needsMapping" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "invoice_lines_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "delivery_lines" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deliveryId" TEXT NOT NULL,
    "rawName" TEXT NOT NULL,
    "supplierItemCode" TEXT,
    "itemId" TEXT,
    "qtyInvoice" INTEGER NOT NULL,
    "qtyReceived" INTEGER NOT NULL DEFAULT 0,
    "qtyInventory" INTEGER NOT NULL DEFAULT 0,
    "unitPrice" DECIMAL,
    "isMissing" BOOLEAN NOT NULL DEFAULT false,
    "adminOverrideReason" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "delivery_lines_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "deliveries" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "delivery_lines_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "delivery_photos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deliveryId" TEXT NOT NULL,
    "photoType" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "originalName" TEXT,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "delivery_photos_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "deliveries" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "credit_requests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reference" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'requested',
    "requestedAmount" DECIMAL NOT NULL,
    "approvedAmount" DECIMAL,
    "rejectionReason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "sentAt" DATETIME,
    "supplierUploadedAt" DATETIME,
    "adminReviewedAt" DATETIME,
    CONSTRAINT "credit_requests_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "deliveries" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "credit_requests_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "credit_request_lines" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "creditRequestId" TEXT NOT NULL,
    "deliveryLineId" TEXT NOT NULL,
    "itemId" TEXT,
    "rawName" TEXT NOT NULL,
    "qtyInvoice" INTEGER NOT NULL,
    "qtyReceived" INTEGER NOT NULL,
    "qtyShortage" INTEGER NOT NULL,
    "unitPrice" DECIMAL NOT NULL,
    "lineAmount" DECIMAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "credit_request_lines_creditRequestId_fkey" FOREIGN KEY ("creditRequestId") REFERENCES "credit_requests" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "credit_request_lines_deliveryLineId_fkey" FOREIGN KEY ("deliveryLineId") REFERENCES "delivery_lines" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "credit_request_lines_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "credit_invoices" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "creditRequestId" TEXT NOT NULL,
    "creditNumber" TEXT,
    "creditDate" TEXT,
    "amount" DECIMAL,
    "supplierId" TEXT,
    "branchCode" TEXT,
    "relatedInvoice" TEXT,
    "aiConfidence" REAL,
    "aiRaw" TEXT,
    "status" TEXT NOT NULL DEFAULT 'uploaded',
    "rejectionReason" TEXT,
    "filePath" TEXT,
    "originalName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "credit_invoices_creditRequestId_fkey" FOREIGN KEY ("creditRequestId") REFERENCES "credit_requests" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reference" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "grossAmount" DECIMAL NOT NULL DEFAULT 0,
    "creditsOffset" DECIMAL NOT NULL DEFAULT 0,
    "netAmount" DECIMAL NOT NULL DEFAULT 0,
    "paidAmount" DECIMAL NOT NULL DEFAULT 0,
    "balanceAmount" DECIMAL NOT NULL DEFAULT 0,
    "paymentMethod" TEXT,
    "paymentDate" TEXT,
    "proofFilePath" TEXT,
    "proofOrigName" TEXT,
    "notes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "payments_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "payment_invoices" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "paymentId" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "invoiceAmount" DECIMAL NOT NULL,
    "creditOffset" DECIMAL NOT NULL DEFAULT 0,
    "netPaid" DECIMAL NOT NULL,
    CONSTRAINT "payment_invoices_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ledger_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "supplierId" TEXT NOT NULL,
    "paymentId" TEXT,
    "entryType" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ledger_entries_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ledger_entries_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "inventory_counts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reference" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'waiting_legacy_close',
    "legacyCheckResult" TEXT,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "lockedAt" DATETIME,
    "createdBy" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "inventory_counts_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "inventory_count_lines" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "countId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "balanceAtStart" INTEGER NOT NULL DEFAULT 0,
    "countedQty" INTEGER,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "inventory_count_lines_countId_fkey" FOREIGN KEY ("countId") REFERENCES "inventory_counts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "inventory_count_lines_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "inventory_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "branchId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "inventory_items_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "inventory_items_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "inventory_movements" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "branchId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "movementType" TEXT NOT NULL,
    "qtyDelta" INTEGER NOT NULL,
    "reference" TEXT,
    "deliveryId" TEXT,
    "countId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    CONSTRAINT "inventory_movements_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "order_rules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "branchId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "deliveryWeekdays" TEXT NOT NULL DEFAULT '[]',
    "avgLeadTimeDays" INTEGER NOT NULL DEFAULT 2,
    "minOrderAmount" DECIMAL NOT NULL DEFAULT 0,
    "whatsappOrders" TEXT,
    "whatsappCredits" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "order_rules_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "order_rule_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderRuleId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "targetInventoryQty" INTEGER NOT NULL DEFAULT 0,
    "packageQty" INTEGER NOT NULL DEFAULT 1,
    "supplierItemCode" TEXT,
    "supplierItemName" TEXT,
    CONSTRAINT "order_rule_items_orderRuleId_fkey" FOREIGN KEY ("orderRuleId") REFERENCES "order_rules" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "order_rule_items_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "before" TEXT,
    "after" TEXT,
    "reason" TEXT,
    "deliveryId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "deliveries" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "legacy_sync_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "adapter" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "request" TEXT,
    "response" TEXT,
    "durationMs" INTEGER,
    "status" TEXT NOT NULL,
    "errorMsg" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "supplier_item_mappings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "supplierId" TEXT NOT NULL,
    "supplierItemCode" TEXT NOT NULL,
    "supplierItemName" TEXT,
    "itemId" TEXT NOT NULL,
    "mappedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_code_key" ON "suppliers"("code");

-- CreateIndex
CREATE UNIQUE INDEX "branches_code_key" ON "branches"("code");

-- CreateIndex
CREATE UNIQUE INDEX "items_code_key" ON "items"("code");

-- CreateIndex
CREATE UNIQUE INDEX "trustees_code_key" ON "trustees"("code");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_item_codes_supplierId_supplierItemCode_key" ON "supplier_item_codes"("supplierId", "supplierItemCode");

-- CreateIndex
CREATE UNIQUE INDEX "deliveries_reference_key" ON "deliveries"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "credit_requests_reference_key" ON "credit_requests"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "credit_requests_deliveryId_key" ON "credit_requests"("deliveryId");

-- CreateIndex
CREATE UNIQUE INDEX "credit_request_lines_deliveryLineId_key" ON "credit_request_lines"("deliveryLineId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_reference_key" ON "payments"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_counts_reference_key" ON "inventory_counts"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_count_lines_countId_itemId_key" ON "inventory_count_lines"("countId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_items_branchId_itemId_key" ON "inventory_items"("branchId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "order_rules_branchId_supplierId_key" ON "order_rules"("branchId", "supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_item_mappings_supplierId_supplierItemCode_key" ON "supplier_item_mappings"("supplierId", "supplierItemCode");
