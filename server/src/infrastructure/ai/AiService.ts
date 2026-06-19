// AI Service port interface — AI is assistive only, never finalizes business decisions

export interface OcrResult {
  invoiceNumber?: string;
  invoiceDate?: string;
  supplierCode?: string;
  branchCode?: string;
  totalAmount?: string;
  lines: Array<{
    rawName: string;
    supplierItemCode?: string;
    qty?: number;
    unitPrice?: string;
    lineTotal?: string;
  }>;
  confidence: number; // 0-1
  rawText: string;
  warnings: string[];
}

export interface AiService {
  extractInvoiceData(mediaStorageKey: string): Promise<OcrResult>;
  matchItemsByText(rawNames: string[], supplierCode: string): Promise<
    Array<{
      rawName: string;
      matchedItemCode?: string;
      confidence: number;
      source: string;
    }>
  >;
}
