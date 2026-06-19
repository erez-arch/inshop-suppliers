import fs from 'fs'
import path from 'path'
import prisma from '@/lib/prisma'

// Reads CSV files from TEST_PACK/csv and syncs to DB
// This is the only place that reads CSV/XLSX — all other code uses Prisma

const CSV_DIR = path.join(process.cwd(), 'INSHOP_CLAUDE_CODE_START_FROM_SCRATCH_PACKAGE', 'TEST_PACK', 'csv')

function readCsv(filename: string): Record<string, string>[] {
  const filePath = path.join(CSV_DIR, filename)
  if (!fs.existsSync(filePath)) return []
  const content = fs.readFileSync(filePath, 'utf-8').replace(/^﻿/, '') // strip BOM
  const lines = content.split('\n').filter(l => l.trim())
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
  return lines.slice(1).map(line => {
    const values = parseCsvLine(line)
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = (values[i] ?? '').trim().replace(/"/g, '') })
    return row
  })
}

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      inQuotes = !inQuotes
    } else if (line[i] === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += line[i]
    }
  }
  result.push(current)
  return result
}

export class ExcelLegacyAdapter {
  async syncSuppliers(): Promise<{ created: number; updated: number }> {
    const rows = readCsv('suppliers.csv')
    let created = 0, updated = 0
    for (const row of rows) {
      const existing = await prisma.supplier.findUnique({ where: { code: row.supplier_code } })
      if (existing) {
        await prisma.supplier.update({
          where: { code: row.supplier_code },
          data: { name: row.supplier_name, status: row.status, vatId: row.vat_id, phone: row.phone },
        })
        updated++
      } else {
        await prisma.supplier.create({
          data: { code: row.supplier_code, name: row.supplier_name, status: row.status, vatId: row.vat_id, phone: row.phone },
        })
        created++
      }
    }
    return { created, updated }
  }

  async syncBranches(): Promise<{ created: number; updated: number }> {
    const rows = readCsv('branches.csv')
    let created = 0, updated = 0
    for (const row of rows) {
      const existing = await prisma.branch.findUnique({ where: { code: row.branch_code } })
      if (existing) {
        await prisma.branch.update({ where: { code: row.branch_code }, data: { name: row.branch_name, address: row.address, status: row.status } })
        updated++
      } else {
        await prisma.branch.create({ data: { code: row.branch_code, name: row.branch_name, address: row.address, status: row.status } })
        created++
      }
    }
    return { created, updated }
  }

  async syncItems(): Promise<{ created: number; updated: number }> {
    const rows = readCsv('items.csv')
    let created = 0, updated = 0
    for (const row of rows) {
      const existing = await prisma.item.findUnique({ where: { code: row.item_code } })
      if (existing) {
        await prisma.item.update({ where: { code: row.item_code }, data: { name: row.item_name, imageUrl: row.image_url || null, barcode: row.barcode || null, assortmentActive: row.assortment_active === 'True' } })
        updated++
      } else {
        await prisma.item.create({ data: { code: row.item_code, name: row.item_name, imageUrl: row.image_url || null, barcode: row.barcode || null, assortmentActive: row.assortment_active === 'True' } })
        created++
      }
    }
    return { created, updated }
  }

  async syncTrustees(): Promise<{ created: number; updated: number }> {
    const rows = readCsv('trustees.csv')
    let created = 0, updated = 0
    for (const row of rows) {
      const branch = row.branch_code ? await prisma.branch.findUnique({ where: { code: row.branch_code } }) : null
      const existing = await prisma.trustee.findUnique({ where: { code: row.trustee_code } })
      if (existing) {
        await prisma.trustee.update({ where: { code: row.trustee_code }, data: { name: row.trustee_name, phone: row.phone, imageUrl: row.image_url || null, branchId: branch?.id || null } })
        updated++
      } else {
        await prisma.trustee.create({ data: { code: row.trustee_code, name: row.trustee_name, phone: row.phone, imageUrl: row.image_url || null, branchId: branch?.id || null } })
        created++
      }
    }
    return { created, updated }
  }

  async syncSupplierItemCodes(): Promise<{ created: number; updated: number }> {
    const rows = readCsv('supplier_item_codes.csv')
    let created = 0, updated = 0
    for (const row of rows) {
      const supplier = await prisma.supplier.findUnique({ where: { code: row.supplier_code } })
      const item = await prisma.item.findUnique({ where: { code: row.item_code } })
      if (!supplier || !item) continue
      const existing = await prisma.supplierItemCode.findUnique({ where: { supplierId_supplierItemCode: { supplierId: supplier.id, supplierItemCode: row.supplier_item_code } } })
      if (existing) {
        await prisma.supplierItemCode.update({ where: { id: existing.id }, data: { supplierItemName: row.supplier_item_name, status: row.status } })
        updated++
      } else {
        await prisma.supplierItemCode.create({ data: { supplierId: supplier.id, itemId: item.id, supplierItemCode: row.supplier_item_code, supplierItemName: row.supplier_item_name, status: row.status } })
        created++
      }
    }
    return { created, updated }
  }

  async getInventoryDeltas(): Promise<Array<{ branchCode: string; itemCode: string; qtyDelta: number; source: string }>> {
    return readCsv('inventory_deltas.csv')
      .filter(r => r.should_update_inventory === 'True')
      .map(r => ({ branchCode: r.branch_code, itemCode: r.item_code, qtyDelta: parseInt(r.qty_delta), source: r.source }))
  }

  async checkLegacyInvoicesOpen(branchCode: string): Promise<{ canProceed: boolean; openCount: number; message: string }> {
    // Mock: simulate legacy invoice check
    const results = readCsv('close_invoice_results.csv')
    const row = results.find(r => r.branch_code === branchCode)
    if (row) {
      return { canProceed: row.can_proceed === 'True', openCount: parseInt(row.open_count || '0'), message: row.message || '' }
    }
    return { canProceed: true, openCount: 0, message: 'אין חשבוניות פתוחות' }
  }
}
