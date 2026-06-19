// MockAiService — deterministic mock for development and testing
import { AiService, OcrResult } from './AiService';

export class MockAiService implements AiService {
  async extractInvoiceData(_mediaStorageKey: string): Promise<OcrResult> {
    // Return a plausible mock OCR result
    return {
      invoiceNumber: `INV-${Math.floor(Math.random() * 90000) + 10000}`,
      invoiceDate: new Date().toISOString().split('T')[0],
      supplierCode: 'TNUVA',
      branchCode: 'RAMAT_GAN',
      totalAmount: '1500.00',
      lines: [
        {
          rawName: 'חלב 3% ליטר',
          supplierItemCode: '7290012345678',
          qty: 10,
          unitPrice: '5.90',
          lineTotal: '59.00',
        },
        {
          rawName: 'יוגורט 3% 150 גרם',
          supplierItemCode: '7290012345679',
          qty: 24,
          unitPrice: '3.50',
          lineTotal: '84.00',
        },
      ],
      confidence: 0.87,
      rawText: '[Mock OCR text — replace with real provider output]',
      warnings: ['זוהה כ-mock — יש להחליף ב-OCR אמיתי'],
    };
  }

  async matchItemsByText(
    rawNames: string[],
    _supplierCode: string
  ): Promise<
    Array<{ rawName: string; matchedItemCode?: string; confidence: number; source: string }>
  > {
    return rawNames.map((rawName) => ({
      rawName,
      matchedItemCode: undefined,
      confidence: 0,
      source: 'mock',
    }));
  }
}
