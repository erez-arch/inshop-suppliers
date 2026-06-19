// ExcelLegacyAdapter — reads mock-data CSV files to simulate legacy INSHOP system
// All calls are logged in LegacySyncLog per the non-negotiable architecture rules

import { parse } from 'csv-parse/sync';
import * as fs from 'fs';
import * as path from 'path';
import {
  LegacyAdapter,
  LegacyAdapterCallOptions,
  LegacyBranch,
  LegacyCloseResult,
  LegacyInventoryDelta,
  LegacyInvoice,
  LegacyItem,
  LegacySupplier,
  LegacyTrustee,
} from './LegacyAdapter';
import prisma from '../../db';

const MOCK_DATA_DIR = process.env.MOCK_DATA_DIR || path.join(process.cwd(), '..', 'mock-data');

function readCsv<T>(filename: string): T[] {
  const filePath = path.join(MOCK_DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`[ExcelLegacyAdapter] Mock data file not found: ${filePath}`);
    return [];
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
  }) as T[];
}

async function logCall(
  method: string,
  requestPayload: unknown,
  responsePayload: unknown,
  status: 'success' | 'warning' | 'failure',
  durationMs: number,
  opts?: LegacyAdapterCallOptions,
  errorMessage?: string
): Promise<void> {
  try {
    await prisma.legacySyncLog.create({
      data: {
        adapterType: 'ExcelLegacyAdapter',
        method,
        logicalOperationKey: opts?.logicalOperationKey,
        requestPayload: JSON.stringify(requestPayload),
        responsePayload: JSON.stringify(responsePayload),
        status,
        durationMs,
        errorMessage: errorMessage ?? null,
        correlationId: opts?.correlationId ?? null,
      },
    });
  } catch (err) {
    // Log failures must never crash the application
    console.error('[ExcelLegacyAdapter] Failed to write sync log:', err);
  }
}

export class ExcelLegacyAdapter implements LegacyAdapter {
  async getSuppliers(opts?: LegacyAdapterCallOptions): Promise<LegacySupplier[]> {
    const start = Date.now();
    try {
      const rows = readCsv<{ supplier_code: string; supplier_name: string; status: string }>(
        'suppliers.csv'
      );
      const result: LegacySupplier[] = rows.map((r) => ({
        supplierCode: r.supplier_code,
        name: r.supplier_name,
        status: r.status as 'active' | 'inactive',
      }));
      await logCall('getSuppliers', {}, result, 'success', Date.now() - start, opts);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await logCall('getSuppliers', {}, null, 'failure', Date.now() - start, opts, msg);
      throw err;
    }
  }

  async getBranches(opts?: LegacyAdapterCallOptions): Promise<LegacyBranch[]> {
    const start = Date.now();
    try {
      const rows = readCsv<{
        branch_code: string;
        branch_name: string;
        address: string;
        status: string;
      }>('branches.csv');
      const result: LegacyBranch[] = rows.map((r) => ({
        branchCode: r.branch_code,
        name: r.branch_name,
        address: r.address || undefined,
        status: r.status as 'active' | 'inactive',
      }));
      await logCall('getBranches', {}, result, 'success', Date.now() - start, opts);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await logCall('getBranches', {}, null, 'failure', Date.now() - start, opts, msg);
      throw err;
    }
  }

  async getItems(opts?: LegacyAdapterCallOptions): Promise<LegacyItem[]> {
    const start = Date.now();
    try {
      const rows = readCsv<{
        item_code: string;
        item_name: string;
        image_url: string;
        barcode: string;
        assortment_active: string;
      }>('items.csv');
      const result: LegacyItem[] = rows.map((r) => ({
        itemCode: r.item_code,
        name: r.item_name,
        imageUrl: r.image_url || undefined,
        barcode: r.barcode || undefined,
        assortmentActive: r.assortment_active === 'true',
      }));
      await logCall('getItems', {}, result, 'success', Date.now() - start, opts);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await logCall('getItems', {}, null, 'failure', Date.now() - start, opts, msg);
      throw err;
    }
  }

  async getTrustees(opts?: LegacyAdapterCallOptions): Promise<LegacyTrustee[]> {
    const start = Date.now();
    try {
      const rows = readCsv<{
        trustee_code: string;
        trustee_name: string;
        phone: string;
        image_url: string;
        branch_code: string;
      }>('trustees.csv');
      const result: LegacyTrustee[] = rows.map((r) => ({
        trusteeCode: r.trustee_code,
        name: r.trustee_name,
        phone: r.phone || undefined,
        imageUrl: r.image_url || undefined,
        branchCode: r.branch_code,
      }));
      await logCall('getTrustees', {}, result, 'success', Date.now() - start, opts);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await logCall('getTrustees', {}, null, 'failure', Date.now() - start, opts, msg);
      throw err;
    }
  }

  async checkLegacyClose(
    branchCode: string,
    opts?: LegacyAdapterCallOptions
  ): Promise<LegacyCloseResult> {
    const start = Date.now();
    try {
      const rows = readCsv<{ branch_code: string; can_start_count: string; still_open: string }>(
        'close_invoice_results.csv'
      );
      const row = rows.find((r) => r.branch_code === branchCode);
      const result: LegacyCloseResult = row
        ? {
            canStartCount: row.can_start_count === 'true',
            stillOpen: parseInt(row.still_open, 10) || 0,
          }
        : { canStartCount: true, stillOpen: 0 };
      await logCall(
        'checkLegacyClose',
        { branchCode },
        result,
        'success',
        Date.now() - start,
        opts
      );
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await logCall('checkLegacyClose', { branchCode }, null, 'failure', Date.now() - start, opts, msg);
      throw err;
    }
  }

  async getInventoryDeltas(
    branchCode: string,
    since: Date,
    opts?: LegacyAdapterCallOptions
  ): Promise<LegacyInventoryDelta[]> {
    const start = Date.now();
    try {
      const rows = readCsv<{
        item_code: string;
        branch_code: string;
        qty_delta: string;
        transaction_date: string;
        should_update_inventory: string;
      }>('inventory_deltas.csv');
      const result: LegacyInventoryDelta[] = rows
        .filter(
          (r) =>
            r.branch_code === branchCode &&
            r.should_update_inventory === 'true' &&
            new Date(r.transaction_date) >= since
        )
        .map((r) => ({
          itemCode: r.item_code,
          branchCode: r.branch_code,
          delta: parseInt(r.qty_delta, 10),
          occurredAt: r.transaction_date,
        }));
      await logCall(
        'getInventoryDeltas',
        { branchCode, since: since.toISOString() },
        result,
        'success',
        Date.now() - start,
        opts
      );
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await logCall(
        'getInventoryDeltas',
        { branchCode },
        null,
        'failure',
        Date.now() - start,
        opts,
        msg
      );
      throw err;
    }
  }

  async getInvoice(
    invoiceNumber: string,
    supplierCode: string,
    opts?: LegacyAdapterCallOptions
  ): Promise<LegacyInvoice | null> {
    const start = Date.now();
    try {
      const invoices = readCsv<{
        invoice_number: string;
        supplier_code: string;
        branch_code: string;
        date: string;
        total_amount: string;
      }>('sample_invoices.csv');
      const header = invoices.find(
        (r) => r.invoice_number === invoiceNumber && r.supplier_code === supplierCode
      );
      if (!header) {
        await logCall(
          'getInvoice',
          { invoiceNumber, supplierCode },
          null,
          'success',
          Date.now() - start,
          opts
        );
        return null;
      }
      const allLines = readCsv<{
        invoice_number: string;
        line_number: string;
        raw_name: string;
        supplier_item_code: string;
        qty: string;
        unit_price: string;
        line_total: string;
      }>('sample_invoice_lines.csv');
      const lines = allLines
        .filter((l) => l.invoice_number === invoiceNumber)
        .map((l) => ({
          lineNumber: parseInt(l.line_number, 10),
          rawName: l.raw_name,
          supplierItemCode: l.supplier_item_code || undefined,
          qty: parseInt(l.qty, 10),
          unitPrice: l.unit_price,
          lineTotal: l.line_total,
        }));
      const result: LegacyInvoice = {
        invoiceNumber: header.invoice_number,
        supplierCode: header.supplier_code,
        branchCode: header.branch_code,
        date: header.date,
        totalAmount: header.total_amount,
        lines,
      };
      await logCall(
        'getInvoice',
        { invoiceNumber, supplierCode },
        result,
        'success',
        Date.now() - start,
        opts
      );
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await logCall(
        'getInvoice',
        { invoiceNumber, supplierCode },
        null,
        'failure',
        Date.now() - start,
        opts,
        msg
      );
      throw err;
    }
  }

  async pushTrusteeReward(
    trusteeCode: string,
    amount: string,
    deliveryReference: string,
    opts?: LegacyAdapterCallOptions
  ): Promise<{ operationKey: string; success: boolean }> {
    const start = Date.now();
    // Mock: always succeed in dev/test
    const operationKey = `reward-${trusteeCode}-${deliveryReference}-${Date.now()}`;
    const result = { operationKey, success: true };
    await logCall(
      'pushTrusteeReward',
      { trusteeCode, amount, deliveryReference },
      result,
      'success',
      Date.now() - start,
      opts
    );
    return result;
  }
}
