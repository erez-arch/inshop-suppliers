// Typed API client — all server communication goes through here
const BASE = '/api/v1';

class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  headers?: Record<string, string>
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let json: { error?: string; message?: string } = {};
    try {
      json = await res.json();
    } catch {}
    throw new ApiError(res.status, json.error ?? 'UNKNOWN_ERROR', json.message ?? res.statusText);
  }

  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

async function upload<T>(
  path: string,
  formData: FormData,
  idempotencyKey?: string
): Promise<T> {
  const headers: Record<string, string> = {};
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: formData,
  });
  if (!res.ok) {
    let json: { error?: string; message?: string } = {};
    try {
      json = await res.json();
    } catch {}
    throw new ApiError(res.status, json.error ?? 'UNKNOWN_ERROR', json.message ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

export { ApiError };

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Supplier {
  id: string;
  supplierCode: string;
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Branch {
  id: string;
  branchCode: string;
  name: string;
  address?: string;
  status: string;
}

export interface Item {
  id: string;
  itemCode: string;
  name: string;
  imageUrl?: string;
  barcode?: string;
  assortmentActive: boolean;
  status: string;
}

export interface Trustee {
  id: string;
  trusteeCode: string;
  name: string;
  phone?: string;
  imageUrl?: string;
  primaryBranchId?: string;
  primaryBranch?: Branch;
  status: string;
}

export interface Delivery {
  id: string;
  reference: string;
  supplierId?: string;
  branchId?: string;
  status: string;
  creditState: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  supplier?: Supplier;
  branch?: Branch;
  contact?: DeliveryContact;
  invoices?: Invoice[];
  deliveryLines?: DeliveryLine[];
  media?: DeliveryMedia[];
}

export interface DeliveryContact {
  contactName: string;
  contactPhone: string;
  note?: string;
}

export interface Invoice {
  id: string;
  deliveryId: string;
  source: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  totalAmount?: string;
  aiStatus?: string;
  isPrimary: boolean;
  invoiceLines?: InvoiceLine[];
}

export interface InvoiceLine {
  id: string;
  rawName: string;
  qty: number;
  unitPrice?: string;
  lineTotal?: string;
}

export interface DeliveryLine {
  id: string;
  rawName: string;
  itemId?: string;
  item?: Item;
  qtyInvoice: number;
  qtyReceived: number;
  qtyInventory: number;
  unitPrice?: string;
  confirmedByTrustee: boolean;
  confirmedByAdmin: boolean;
  version: number;
}

export interface DeliveryMedia {
  deliveryId: string;
  mediaId: string;
  sortOrder: number;
  media: MediaObject;
}

export interface MediaObject {
  id: string;
  mediaType: string;
  status: string;
  storageKey?: string;
  originalFilename?: string;
  contentType?: string;
}

export interface InventoryBalance {
  branchId: string;
  itemId: string;
  quantity: number;
  branch?: Branch;
  item?: Item;
}

export interface InventoryCount {
  id: string;
  reference: string;
  branchId: string;
  status: string;
  version: number;
  createdAt: string;
  branch?: Branch;
  lines?: InventoryCountLine[];
}

export interface InventoryCountLine {
  id: string;
  countId: string;
  itemId: string;
  item?: Item;
  balanceAtStart: number;
  countedQty: number;
  saved: boolean;
  version: number;
}

export interface OrderRule {
  id: string;
  branchId: string;
  supplierId: string;
  status: string;
  deliveryWeekdays: string; // JSON string
  averageLeadTimeDays: number;
  minimumOrderAmount: string;
  version: number;
  branch?: Branch;
  supplier?: Supplier;
  items?: OrderRuleItem[];
}

export interface OrderRuleItem {
  id: string;
  itemId: string;
  targetInventoryQty: number;
  packagingQty: number;
  item?: Item;
}

export interface Payment {
  id: string;
  reference: string;
  supplierId: string;
  status: string;
  expectedAmount: string;
  confirmedAmount: string;
  method?: string;
  paymentDate?: string;
  version: number;
  supplier?: Supplier;
}

export interface LedgerEntry {
  id: string;
  supplierId: string;
  entryType: string;
  amountSigned: string;
  sourceType: string;
  occurredAt: string;
}

export interface AuthUser {
  id: string;
  email?: string;
  displayName: string;
  roles: string[];
}

// ─── API methods ──────────────────────────────────────────────────────────────

export const auth = {
  login: (email: string, password: string) =>
    request<AuthUser>('POST', '/auth/login', { email, password }),
  logout: () => request<{ ok: boolean }>('POST', '/auth/logout'),
  me: () => request<AuthUser>('GET', '/auth/me'),
};

export const suppliers = {
  list: () => request<Supplier[]>('GET', '/suppliers'),
  get: (id: string) => request<Supplier>('GET', `/suppliers/${id}`),
  create: (data: Partial<Supplier>) => request<Supplier>('POST', '/suppliers', data),
  update: (id: string, data: Partial<Supplier>) =>
    request<Supplier>('PUT', `/suppliers/${id}`, data),
  delete: (id: string) => request<{ ok: boolean }>('DELETE', `/suppliers/${id}`),
};

export const branches = {
  list: () => request<Branch[]>('GET', '/branches'),
  get: (id: string) => request<Branch>('GET', `/branches/${id}`),
  create: (data: Partial<Branch>) => request<Branch>('POST', '/branches', data),
  update: (id: string, data: Partial<Branch>) =>
    request<Branch>('PUT', `/branches/${id}`, data),
  delete: (id: string) => request<{ ok: boolean }>('DELETE', `/branches/${id}`),
};

export const items = {
  list: (activeOnly?: boolean) =>
    request<Item[]>('GET', `/items${activeOnly ? '?activeOnly=true' : ''}`),
  get: (id: string) => request<Item>('GET', `/items/${id}`),
  create: (data: Partial<Item>) => request<Item>('POST', '/items', data),
  update: (id: string, data: Partial<Item>) => request<Item>('PUT', `/items/${id}`, data),
  delete: (id: string) => request<{ ok: boolean }>('DELETE', `/items/${id}`),
};

export const trustees = {
  list: () => request<Trustee[]>('GET', '/trustees'),
  get: (id: string) => request<Trustee>('GET', `/trustees/${id}`),
  create: (data: Partial<Trustee>) => request<Trustee>('POST', '/trustees', data),
  update: (id: string, data: Partial<Trustee>) =>
    request<Trustee>('PUT', `/trustees/${id}`, data),
  delete: (id: string) => request<{ ok: boolean }>('DELETE', `/trustees/${id}`),
};

export const deliveries = {
  list: (params?: { status?: string; supplierId?: string; branchId?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.supplierId) q.set('supplierId', params.supplierId);
    if (params?.branchId) q.set('branchId', params.branchId);
    return request<Delivery[]>('GET', `/deliveries?${q}`);
  },
  get: (id: string) => request<Delivery>('GET', `/deliveries/${id}`),
  createPublic: () => request<Delivery>('POST', '/deliveries/public/supplier-reports'),
  getPublic: (id: string) => request<Delivery>('GET', `/deliveries/public/supplier-reports/${id}`),
  updateDraft: (id: string, data: Record<string, unknown>) =>
    request<Delivery>('PATCH', `/deliveries/public/supplier-reports/${id}`, data),
  uploadMedia: (id: string, formData: FormData) =>
    upload<{ media: MediaObject; invoice?: Invoice; ocrResult?: unknown }>(
      `/deliveries/public/supplier-reports/${id}/media`,
      formData
    ),
  submit: (id: string, version: number) =>
    request<Delivery>('POST', `/deliveries/public/supplier-reports/${id}/submit`, {
      version,
      confirmGoodsLeftAtBranch: true,
    }),
  moveToAdminReview: (id: string) =>
    request<Delivery>('POST', `/deliveries/${id}/admin-review`),
  approveToInventory: (
    id: string,
    data: { version: number; lines: Array<{ deliveryLineId: string; qtyInventory: number; adminChangeReason?: string }> }
  ) => request<unknown>('POST', `/deliveries/${id}/approve-inventory`, data),
  cancel: (id: string, reason?: string) =>
    request<Delivery>('POST', `/deliveries/${id}/cancel`, { reason }),
  updateLine: (
    deliveryId: string,
    lineId: string,
    data: { qtyInventory: number; adminChangeReason?: string; version: number }
  ) => request<DeliveryLine>('PATCH', `/deliveries/${deliveryId}/lines/${lineId}`, data),
};

export const inventory = {
  balances: (branchId?: string) =>
    request<InventoryBalance[]>('GET', `/inventory/balances${branchId ? `?branchId=${branchId}` : ''}`),
  counts: (branchId?: string) =>
    request<InventoryCount[]>('GET', `/inventory/counts${branchId ? `?branchId=${branchId}` : ''}`),
  getCount: (id: string) => request<InventoryCount>('GET', `/inventory/counts/${id}`),
  startCount: (branchId: string) =>
    request<InventoryCount>('POST', '/inventory/counts', { branchId }),
  beginCount: (id: string) =>
    request<InventoryCount>('POST', `/inventory/counts/${id}/begin`),
  saveLine: (countId: string, lineId: string, countedQty: number, version: number) =>
    request<InventoryCountLine>('PUT', `/inventory/counts/${countId}/lines/${lineId}`, {
      countedQty,
      version,
    }),
  completeCount: (id: string, version: number) =>
    request<InventoryCount>('POST', `/inventory/counts/${id}/complete`, { version }),
  cancelCount: (id: string, reason?: string) =>
    request<InventoryCount>('POST', `/inventory/counts/${id}/cancel`, { reason }),
};

export const orderRules = {
  list: (params?: { branchId?: string; supplierId?: string }) => {
    const q = new URLSearchParams();
    if (params?.branchId) q.set('branchId', params.branchId);
    if (params?.supplierId) q.set('supplierId', params.supplierId);
    return request<OrderRule[]>('GET', `/order-rules?${q}`);
  },
  get: (id: string) => request<OrderRule>('GET', `/order-rules/${id}`),
  create: (data: Record<string, unknown>) => request<OrderRule>('POST', '/order-rules', data),
  update: (id: string, data: Record<string, unknown>) =>
    request<OrderRule>('PUT', `/order-rules/${id}`, data),
  addItem: (ruleId: string, data: Record<string, unknown>) =>
    request<OrderRuleItem>('POST', `/order-rules/${ruleId}/items`, data),
  removeItem: (ruleId: string, itemId: string) =>
    request<{ ok: boolean }>('DELETE', `/order-rules/${ruleId}/items/${itemId}`),
};

export const payments = {
  list: (supplierId?: string) =>
    request<Payment[]>('GET', `/payments${supplierId ? `?supplierId=${supplierId}` : ''}`),
  get: (id: string) => request<Payment>('GET', `/payments/${id}`),
  create: (data: Record<string, unknown>) => request<Payment>('POST', '/payments', data),
  confirm: (id: string, data: Record<string, unknown>) =>
    request<Payment>('POST', `/payments/${id}/confirm`, data),
  post: (id: string, version: number) =>
    request<Payment>('POST', `/payments/${id}/post`, { version }),
  cancel: (id: string) => request<Payment>('POST', `/payments/${id}/cancel`),
  ledger: (supplierId: string) =>
    request<{ entries: LedgerEntry[]; balance: string }>('GET', `/payments/ledger/${supplierId}`),
};

export const legacy = {
  syncSuppliers: () =>
    request<{ created: number; updated: number; total: number }>('POST', '/legacy/sync/suppliers'),
  syncBranches: () =>
    request<{ created: number; updated: number; total: number }>('POST', '/legacy/sync/branches'),
  syncItems: () =>
    request<{ created: number; updated: number; total: number }>('POST', '/legacy/sync/items'),
  syncTrustees: () =>
    request<{ created: number; updated: number; total: number }>('POST', '/legacy/sync/trustees'),
};
