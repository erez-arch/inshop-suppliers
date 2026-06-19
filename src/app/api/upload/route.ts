import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import prisma from '@/lib/prisma'
import { MockInvoiceParserAdapter } from '@/adapters/invoice-parser/MockInvoiceParserAdapter'
import { Decimal } from '@prisma/client/runtime/library'

const parser = new MockInvoiceParserAdapter()

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File
  const deliveryId = formData.get('deliveryId') as string
  const photoType = formData.get('photoType') as string

  if (!file || !deliveryId || !photoType) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const delivery = await prisma.delivery.findUnique({ where: { id: deliveryId } })
  if (!delivery) return NextResponse.json({ error: 'Delivery not found' }, { status: 404 })

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const filename = file.name
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'invoices')
  await mkdir(uploadDir, { recursive: true })

  const uniqueName = `${Date.now()}-${filename}`
  const filePath = path.join(uploadDir, uniqueName)
  await writeFile(filePath, buffer)
  const publicPath = `/uploads/invoices/${uniqueName}`

  // Save photo record
  const photo = await prisma.deliveryPhoto.create({
    data: { deliveryId, photoType, filePath: publicPath, originalName: filename, uploadedBy: photoType.startsWith('trustee') ? 'trustee' : 'supplier' },
  })

  // Parse invoice if it's an invoice photo
  let parsedResult = null
  if (photoType === 'supplier_invoice' || photoType === 'trustee_invoice') {
    parsedResult = await parser.parseDocument(filename, buffer)

    // Create invoice record
    const invoice = await prisma.invoice.create({
      data: {
        deliveryId,
        source: photoType === 'supplier_invoice' ? 'supplier' : 'trustee',
        invoiceNumber: parsedResult.invoiceNumber || null,
        invoiceDate: parsedResult.invoiceDate || null,
        total: parsedResult.total ? new Decimal(parsedResult.total) : null,
        subtotal: parsedResult.subtotal ? new Decimal(parsedResult.subtotal) : null,
        vat: parsedResult.vat ? new Decimal(parsedResult.vat) : null,
        aiConfidence: parsedResult.aiConfidence || null,
        aiRaw: JSON.stringify(parsedResult),
        warnings: JSON.stringify(parsedResult.warnings),
        filePath: publicPath,
        originalName: filename,
      },
    })

    // Create invoice lines and delivery lines
    if (parsedResult.lines.length > 0 && photoType === 'supplier_invoice') {
      // Look up items by supplier item code
      for (let i = 0; i < parsedResult.lines.length; i++) {
        const l = parsedResult.lines[i]
        let itemId: string | null = null

        if (l.matchedItemCode) {
          const item = await prisma.item.findUnique({ where: { code: l.matchedItemCode } })
          itemId = item?.id || null
        } else if (l.supplierItemCode && parsedResult.supplierCode) {
          // Check SupplierItemMapping
          const supplier = await prisma.supplier.findUnique({ where: { code: parsedResult.supplierCode } })
          if (supplier) {
            const mapping = await prisma.supplierItemMapping.findUnique({
              where: { supplierId_supplierItemCode: { supplierId: supplier.id, supplierItemCode: l.supplierItemCode } },
            })
            if (mapping) itemId = mapping.itemId
            else {
              const sic = await prisma.supplierItemCode.findFirst({ where: { supplierId: supplier.id, supplierItemCode: l.supplierItemCode } })
              if (sic) itemId = sic.itemId
            }
          }
        }

        await prisma.invoiceLine.create({
          data: {
            invoiceId: invoice.id,
            lineNo: i + 1,
            rawName: l.rawName,
            supplierItemCode: l.supplierItemCode || null,
            itemId,
            qty: l.qty,
            unitPrice: l.unitPrice ? new Decimal(l.unitPrice) : null,
            lineTotal: l.lineTotal ? new Decimal(l.lineTotal) : null,
            aiConfidence: l.aiConfidence || null,
            needsMapping: l.needsMapping || !itemId,
          },
        })

        await prisma.deliveryLine.create({
          data: {
            deliveryId,
            rawName: l.rawName,
            supplierItemCode: l.supplierItemCode || null,
            itemId,
            qtyInvoice: l.qty,
            qtyReceived: l.qty,
            qtyInventory: l.qty,
            unitPrice: l.unitPrice ? new Decimal(l.unitPrice) : null,
            sortOrder: i,
          },
        })
      }
    }

    // Auto-link supplier and branch from AI result
    const updates: Record<string, unknown> = {}
    if (parsedResult.supplierCode) {
      const supplier = await prisma.supplier.findUnique({ where: { code: parsedResult.supplierCode } })
      if (supplier) updates.supplierId = supplier.id
    }
    if (parsedResult.branchCode) {
      updates.aiDetectedBranch = parsedResult.branchCode
    }
    if (parsedResult.invoiceNumber) updates.invoiceNumber = parsedResult.invoiceNumber
    if (parsedResult.invoiceDate) updates.invoiceDate = parsedResult.invoiceDate
    if (parsedResult.total) updates.invoiceTotal = new Decimal(parsedResult.total)
    if (Object.keys(updates).length > 0) {
      await prisma.delivery.update({ where: { id: deliveryId }, data: updates })
    }

    return NextResponse.json({ photo, invoice, parsedResult }, { status: 201 })
  }

  return NextResponse.json({ photo }, { status: 201 })
}
