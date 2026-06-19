// LegacyAdapter port interface — all legacy system interactions go through this
// Never read CSV/Excel files directly from routes or domain services

export interface LegacySupplier {
  supplierCode: string;
  name: string;
  status: 'active' | 'inactive';
}

export interface LegacyBranch {
  branchCode: string;
  name: string;
  address?: string;
  status: 'active' | 'inactive';
}

export interface LegacyItem {
  itemCode: string;
  name: string;
  imageUrl?: string;
  barcode?: string;
  assortmentActive: boolean;
}

export interface LegacyTrustee {
  trusteeCode: string;
  name: string;
  phone?: string;
  imageUrl?: string;
  branchCode: string;
}

export interface LegacyCloseResult {
  canStartCount: boolean;
  stillOpen: number;
  message?: string;
}

export interface LegacyInventoryDelta {
  itemCode: string;
  branchCode: string;
  delta: number;
  occurredAt: string; // ISO date string
}

export interface LegacyInvoice {
  invoiceNumber: string;
  supplierCode: string;
  branchCode: string;
  date: string;
  totalAmount: string;
  lines: Array<{
    lineNumber: number;
    rawName: string;
    supplierItemCode?: string;
    qty: number;
    unitPrice: string;
    lineTotal: string;
  }>;
}

export interface LegacyAdapterCallOptions {
  correlationId?: string;
  logicalOperationKey?: string;
}

export interface LegacyAdapter {
  getSuppliers(opts?: LegacyAdapterCallOptions): Promise<LegacySupplier[]>;
  getBranches(opts?: LegacyAdapterCallOptions): Promise<LegacyBranch[]>;
  getItems(opts?: LegacyAdapterCallOptions): Promise<LegacyItem[]>;
  getTrustees(opts?: LegacyAdapterCallOptions): Promise<LegacyTrustee[]>;
  checkLegacyClose(branchCode: string, opts?: LegacyAdapterCallOptions): Promise<LegacyCloseResult>;
  getInventoryDeltas(
    branchCode: string,
    since: Date,
    opts?: LegacyAdapterCallOptions
  ): Promise<LegacyInventoryDelta[]>;
  getInvoice(invoiceNumber: string, supplierCode: string, opts?: LegacyAdapterCallOptions): Promise<LegacyInvoice | null>;
  pushTrusteeReward(
    trusteeCode: string,
    amount: string,
    deliveryReference: string,
    opts?: LegacyAdapterCallOptions
  ): Promise<{ operationKey: string; success: boolean }>;
}
