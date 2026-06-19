import Anthropic from '@anthropic-ai/sdk'
import type { ParsedInvoice } from './MockInvoiceParserAdapter'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `אתה מערכת OCR לחשבוניות ספקים של רשת סופרמרקטים בישראל.
קרא את המסמך והחזר JSON בלבד (ללא markdown, ללא הסברים).

מבנה JSON נדרש:
{
  "documentType": "supplier_invoice" | "credit_invoice" | "payment_proof" | "unknown",
  "supplierName": "שם הספק",
  "invoiceNumber": "מספר חשבונית",
  "invoiceDate": "YYYY-MM-DD",
  "total": 0.00,
  "subtotal": 0.00,
  "vat": 0.00,
  "aiConfidence": 0.0-1.0,
  "lines": [
    {
      "rawName": "שם הפריט כפי שמופיע",
      "supplierItemCode": "קוד פריט ספק",
      "qty": 0,
      "unitPrice": 0.00,
      "lineTotal": 0.00,
      "aiConfidence": 0.0-1.0
    }
  ],
  "warnings": [],
  "needsManualReview": false
}

כללים:
- החזר ONLY JSON תקני
- אם שדה לא קיים — השמט אותו (אל תכתוב null)
- תאריך בפורמט ISO: YYYY-MM-DD
- מספרים ללא פסיקות אלפים
- aiConfidence: 0.0 עד 1.0`

export class ClaudeInvoiceParserAdapter {
  async parseDocument(filename: string, fileBuffer: Buffer): Promise<ParsedInvoice> {
    try {
      const base64 = fileBuffer.toString('base64')
      const ext = filename.split('.').pop()?.toLowerCase() || 'jpg'
      const mediaType = ext === 'pdf' ? 'application/pdf'
        : ext === 'png' ? 'image/png'
        : 'image/jpeg'

      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType as 'image/jpeg' | 'image/png', data: base64 },
            },
            { type: 'text', text: 'נתח את החשבונית והחזר JSON.' },
          ],
        }],
      })

      const text = response.content[0].type === 'text' ? response.content[0].text : ''
      const json = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const parsed = JSON.parse(json)

      return {
        documentType: parsed.documentType || 'unknown',
        supplierName: parsed.supplierName,
        invoiceNumber: parsed.invoiceNumber,
        invoiceDate: parsed.invoiceDate,
        total: parsed.total,
        subtotal: parsed.subtotal,
        vat: parsed.vat,
        aiConfidence: parsed.aiConfidence || 0.8,
        lines: parsed.lines || [],
        warnings: parsed.warnings || [],
        needsManualReview: parsed.needsManualReview || false,
      }
    } catch (err) {
      console.error('Claude parse error:', err)
      return {
        documentType: 'unknown',
        aiConfidence: 0,
        lines: [],
        warnings: [{ type: 'parse_error', severity: 'needs_manual_review', message: 'שגיאה בניתוח המסמך' }],
        needsManualReview: true,
      }
    }
  }
}
