import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import prisma from '@/lib/prisma'
import { MockInvoiceParserAdapter } from '@/adapters/invoice-parser/MockInvoiceParserAdapter'
import { CreditStatus } from '@/domain/statuses'
import { Decimal } from '@prisma/client/runtime/library'

const parser = new MockInvoiceParserAdapter()

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const credit = await prisma.creditRequest.findUnique({ where: { id }, include: { delivery: true, supplier: true } })
  if (!credit) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const formData = await req.formData()
  const file = formData.get('file') as File
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'invoices')
  await mkdir(uploadDir, { recursive: true })
  const uniqueName = `${Date.now()}-${file.name}`
  await writeFile(path.join(uploadDir, uniqueName), buffer)
  const publicPath = `/uploads/invoices/${uniqueName}`

  const parsed = await parser.parseDocument(file.name, buffer)

  // Validate: supplier must match
  let validationStatus = 'uploaded'
  let validationWarnings = [...parsed.warnings]

  if (parsed.supplierCode && credit.supplier?.code !== parsed.supplierCode) {
    validationWarnings.push({ type: 'supplier_mismatch', severity: 'blocking', message: `ספק הזיכוי (${parsed.supplierCode}) אינו תואם לספק החשבונית (${credit.supplier?.code})` })
    validationStatus = 'admin_rejected'
  }

  const creditInvoice = await prisma.creditInvoice.create({
    data: {
      creditRequestId: id,
      creditNumber: parsed.invoiceNumber || null,
      creditDate: parsed.invoiceDate || null,
      amount: parsed.creditAmount ? new Decimal(parsed.creditAmount) : parsed.total ? new Decimal(parsed.total) : null,
      supplierId: credit.supplierId,
      branchCode: parsed.branchCode || null,
      relatedInvoice: parsed.relatedInvoice || null,
      aiConfidence: parsed.aiConfidence || null,
      aiRaw: JSON.stringify(parsed),
      status: validationStatus,
      filePath: publicPath,
      originalName: file.name,
    },
  })

  // Update credit request status
  await prisma.creditRequest.update({
    where: { id },
    data: {
      status: validationStatus === 'admin_rejected' ? CreditStatus.ADMIN_REJECTED : CreditStatus.SUPPLIER_UPLOADED,
      supplierUploadedAt: new Date(),
    },
  })

  return NextResponse.json({ creditInvoice, parsedResult: parsed, warnings: validationWarnings }, { status: 201 })
}
