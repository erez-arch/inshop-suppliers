export interface ParsedInvoiceLine {
  rawName: string
  supplierItemCode?: string
  matchedItemCode?: string
  qty: number
  unitPrice?: number
  lineTotal?: number
  aiConfidence?: number
  needsMapping?: boolean
}

export interface ParsedInvoice {
  documentType: 'supplier_invoice' | 'credit_invoice' | 'payment_proof' | 'unknown'
  supplierCode?: string
  supplierName?: string
  supplierConfidence?: number
  branchCode?: string
  branchName?: string
  branchConfidence?: number
  invoiceNumber?: string
  invoiceDate?: string
  total?: number
  subtotal?: number
  vat?: number
  aiConfidence?: number
  lines: ParsedInvoiceLine[]
  warnings: Array<{
    type: string
    severity: string
    message?: string
    supplierItemCode?: string
    nameRaw?: string
  }>
  needsManualReview?: boolean
  // For credit invoices
  relatedInvoice?: string
  creditAmount?: number
  // For payment proofs
  paymentMethod?: string
  paymentDate?: string
  paidAmount?: number
}

// Deterministic outputs keyed by filename stem
const EXPECTED_OUTPUTS: Record<string, ParsedInvoice> = {
  'INV-TNV-12547': {
    documentType: 'supplier_invoice',
    supplierCode: 'TNUVA',
    supplierName: 'תנובה בע״מ',
    supplierConfidence: 0.96,
    branchCode: 'RAMAT_GAN',
    branchName: 'סניף רמת גן',
    branchConfidence: 0.93,
    invoiceNumber: 'INV-TNV-12547',
    invoiceDate: '2026-06-18',
    total: 4439.16,
    subtotal: 3762.0,
    vat: 677.16,
    aiConfidence: 0.94,
    lines: [
      { rawName: 'חלב תנובה 3% 1 ליטר', supplierItemCode: 'TN-10045', matchedItemCode: '7290012345678', qty: 240, unitPrice: 5.4, lineTotal: 1296.0, aiConfidence: 0.94 },
      { rawName: 'קוטג׳ תנובה 5% 250 גרם', supplierItemCode: 'TN-150-3', matchedItemCode: '7290012345679', qty: 180, unitPrice: 4.2, lineTotal: 756.0, aiConfidence: 0.94 },
      { rawName: 'עמק פרוס 200 גרם', supplierItemCode: 'CH-PR-20', matchedItemCode: '7290012345680', qty: 60, unitPrice: 12.0, lineTotal: 720.0, aiConfidence: 0.94 },
      { rawName: 'ביצים M 30 יח׳', supplierItemCode: 'EGG-M-30', matchedItemCode: '7290012345681', qty: 30, unitPrice: 33.0, lineTotal: 990.0, aiConfidence: 0.94 },
    ],
    warnings: [],
  },
  'INV-TNV-12548': {
    documentType: 'supplier_invoice',
    supplierCode: 'TNUVA',
    supplierName: 'תנובה בע״מ',
    supplierConfidence: 0.96,
    branchCode: 'RAMAT_GAN',
    branchName: 'סניף רמת גן',
    branchConfidence: 0.93,
    invoiceNumber: 'INV-TNV-12548',
    invoiceDate: '2026-06-18',
    total: 4439.16,
    subtotal: 3762.0,
    vat: 677.16,
    aiConfidence: 0.94,
    lines: [
      { rawName: 'חלב תנובה 3% 1 ליטר', supplierItemCode: 'TN-10045', matchedItemCode: '7290012345678', qty: 240, unitPrice: 5.4, lineTotal: 1296.0, aiConfidence: 0.94 },
      { rawName: 'קוטג׳ תנובה 5% 250 גרם', supplierItemCode: 'TN-150-3', matchedItemCode: '7290012345679', qty: 180, unitPrice: 4.2, lineTotal: 756.0, aiConfidence: 0.94 },
      { rawName: 'עמק פרוס 200 גרם', supplierItemCode: 'CH-PR-20', matchedItemCode: '7290012345680', qty: 60, unitPrice: 12.0, lineTotal: 720.0, aiConfidence: 0.94 },
      { rawName: 'ביצים M 30 יח׳', supplierItemCode: 'EGG-M-30', matchedItemCode: '7290012345681', qty: 30, unitPrice: 33.0, lineTotal: 990.0, aiConfidence: 0.94 },
    ],
    warnings: [],
  },
  'INV-TNV-12549': {
    documentType: 'supplier_invoice',
    supplierCode: 'TNUVA',
    supplierName: 'תנובה בע״מ',
    supplierConfidence: 0.96,
    branchCode: 'RAMAT_GAN',
    branchName: 'סניף רמת גן',
    branchConfidence: 0.93,
    invoiceNumber: 'INV-TNV-12549',
    invoiceDate: '2026-06-19',
    total: 2422.56,
    aiConfidence: 0.89,
    lines: [],
    warnings: [
      { type: 'branch_mismatch', severity: 'blocking', message: 'הספק בחר TEL_AVIV אך החשבונית מזוהה כ-RAMAT_GAN' },
    ],
  },
  'INV-STR-77821': {
    documentType: 'supplier_invoice',
    supplierCode: 'STRAUSS',
    supplierName: 'שטראוס גרופ בע״מ',
    supplierConfidence: 0.95,
    branchCode: 'TEL_AVIV',
    branchName: 'סניף תל אביב',
    branchConfidence: 0.92,
    invoiceNumber: 'INV-STR-77821',
    invoiceDate: '2026-06-19',
    total: 1963.52,
    aiConfidence: 0.88,
    lines: [
      { rawName: 'יוגורט 150 גרם', supplierItemCode: 'ST-YOG-150', matchedItemCode: '7290012345683', qty: 96, unitPrice: 3.5, lineTotal: 336.0, aiConfidence: 0.93 },
      { rawName: 'מים 500 מ״ל', supplierItemCode: 'ST-WTR-500', matchedItemCode: '7290012345684', qty: 144, unitPrice: 2.1, lineTotal: 302.4, aiConfidence: 0.95 },
      { rawName: 'חטיף חדש וניל 65 גרם', supplierItemCode: 'ST-NEW-65', qty: 60, unitPrice: 5.42, lineTotal: 325.2, aiConfidence: 0.72, needsMapping: true },
    ],
    warnings: [
      { type: 'unmatched_item', severity: 'needs_admin_mapping', supplierItemCode: 'ST-NEW-65', nameRaw: 'חטיף חדש וניל 65 גרם' },
    ],
  },
  'CN-TNV-80125': {
    documentType: 'credit_invoice',
    supplierCode: 'TNUVA',
    supplierName: 'תנובה בע״מ',
    branchCode: 'RAMAT_GAN',
    invoiceNumber: 'CN-TNV-80125',
    invoiceDate: '2026-06-20',
    relatedInvoice: 'INV-TNV-12548',
    creditAmount: 152.93,
    total: 152.93,
    aiConfidence: 0.95,
    lines: [],
    warnings: [],
  },
  'CN-TNV-80126': {
    documentType: 'credit_invoice',
    supplierCode: 'TNUVA',
    supplierName: 'תנובה בע״מ',
    branchCode: 'RAMAT_GAN',
    invoiceNumber: 'CN-TNV-80126',
    invoiceDate: '2026-06-20',
    relatedInvoice: 'INV-TNV-12548',
    creditAmount: 100.0,
    total: 100.0,
    aiConfidence: 0.91,
    lines: [],
    warnings: [{ type: 'amount_mismatch', severity: 'warning', message: 'סכום הזיכוי (100.00) נמוך מדרישת הזיכוי (152.93)' }],
  },
  'CN-STR-70005': {
    documentType: 'credit_invoice',
    supplierCode: 'STRAUSS',
    supplierName: 'שטראוס גרופ בע״מ',
    branchCode: 'TEL_AVIV',
    invoiceNumber: 'CN-STR-70005',
    invoiceDate: '2026-06-20',
    relatedInvoice: 'INV-TNV-12548',
    creditAmount: 152.93,
    total: 152.93,
    aiConfidence: 0.89,
    lines: [],
    warnings: [{ type: 'supplier_mismatch', severity: 'blocking', message: 'ספק הזיכוי (STRAUSS) אינו תואם לספק החשבונית (TNUVA)' }],
  },
  'PAY-BANK-33001': {
    documentType: 'payment_proof',
    paymentMethod: 'bank_transfer',
    paymentDate: '2026-06-25',
    paidAmount: 8725.39,
    aiConfidence: 0.97,
    lines: [],
    warnings: [],
  },
  'PAY-BANK-33002': {
    documentType: 'payment_proof',
    paymentMethod: 'bank_transfer',
    paymentDate: '2026-06-25',
    paidAmount: 8000.0,
    aiConfidence: 0.97,
    lines: [],
    warnings: [],
  },
  'PAY-BANK-33003': {
    documentType: 'payment_proof',
    paymentMethod: 'bank_transfer',
    paymentDate: '2026-06-25',
    paidAmount: 9000.0,
    aiConfidence: 0.97,
    lines: [],
    warnings: [],
  },
}

export class MockInvoiceParserAdapter {
  async parseDocument(filename: string, _fileBuffer?: Buffer): Promise<ParsedInvoice> {
    // Extract stem from filename (remove path and extension)
    const stem = filename
      .replace(/^.*[\\/]/, '')
      .replace(/\.[^.]+$/, '')
      .toUpperCase()

    const match = EXPECTED_OUTPUTS[stem]
    if (match) return match

    // Unknown file — return needs_manual_review
    return {
      documentType: 'unknown',
      aiConfidence: 0,
      lines: [],
      warnings: [{ type: 'unknown_document', severity: 'needs_manual_review', message: 'המסמך לא זוהה אוטומטית — נדרשת בדיקה ידנית' }],
      needsManualReview: true,
    }
  }
}
