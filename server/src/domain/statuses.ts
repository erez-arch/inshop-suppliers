// Centralized status constants — never scatter string comparisons across routes/UI

export const DeliveryStatus = {
  DRAFT: 'draft',
  SUPPLIER_REPORTED: 'supplier_reported',
  TRUSTEE_PENDING: 'trustee_pending',
  TRUSTEE_IN_PROGRESS: 'trustee_in_progress',
  TRUSTEE_RECEIVED: 'trustee_received',
  ADMIN_REVIEW: 'admin_review',
  APPROVED_TO_INVENTORY: 'approved_to_inventory',
  CLOSED: 'closed',
  CANCELLED: 'cancelled',
} as const;
export type DeliveryStatus = (typeof DeliveryStatus)[keyof typeof DeliveryStatus];

export const DeliveryCreditState = {
  NONE: 'none',
  IDENTIFIED: 'identified',
  REQUEST_CREATED: 'request_created',
  AWAITING_SUPPLIER: 'awaiting_supplier',
  CREDIT_UPLOADED: 'credit_uploaded',
  PARTIALLY_APPROVED: 'partially_approved',
  APPROVED: 'approved',
  CLOSED: 'closed',
  CANCELLED: 'cancelled',
} as const;
export type DeliveryCreditState = (typeof DeliveryCreditState)[keyof typeof DeliveryCreditState];

export const CreditStatus = {
  DRAFT: 'draft',
  SENT_TO_SUPPLIER: 'sent_to_supplier',
  WAITING_FOR_CREDIT_INVOICE: 'waiting_for_credit_invoice',
  CREDIT_UPLOADED: 'credit_uploaded',
  WAITING_ADMIN_APPROVAL: 'waiting_admin_approval',
  PARTIALLY_APPROVED: 'partially_approved',
  APPROVED: 'approved',
  REJECTED_DOCUMENT: 'rejected_document',
  CLOSED: 'closed',
  CANCELLED: 'cancelled',
} as const;
export type CreditStatus = (typeof CreditStatus)[keyof typeof CreditStatus];

export const CountStatus = {
  WAITING_FOR_LEGACY_CLOSE: 'waiting_for_legacy_close',
  READY_TO_COUNT: 'ready_to_count',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  LOCKED: 'locked',
  CANCELLED: 'cancelled',
  FAILED: 'failed',
} as const;
export type CountStatus = (typeof CountStatus)[keyof typeof CountStatus];

export const PaymentStatus = {
  DRAFT: 'draft',
  AWAITING_DOCUMENT: 'awaiting_document',
  UNDER_REVIEW: 'under_review',
  READY_TO_POST: 'ready_to_post',
  POSTED: 'posted',
  PARTIALLY_REVERSED: 'partially_reversed',
  REVERSED: 'reversed',
  CANCELLED: 'cancelled',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const RewardStatus = {
  CALCULATED_PENDING_APPROVAL: 'calculated_pending_approval',
  APPROVED: 'approved',
  PUSH_PENDING: 'push_pending',
  PUSHED: 'pushed',
  PUSH_FAILED: 'push_failed',
  CANCELLED: 'cancelled',
  REVERSED: 'reversed',
} as const;
export type RewardStatus = (typeof RewardStatus)[keyof typeof RewardStatus];

export const AiStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  PROCESSED: 'processed',
  WARNING: 'warning',
  FAILED: 'failed',
  APPROVED_BY_USER: 'approved_by_user',
  OVERRIDDEN_BY_USER: 'overridden_by_user',
  SUPERSEDED: 'superseded',
} as const;
export type AiStatus = (typeof AiStatus)[keyof typeof AiStatus];

export const MediaStatus = {
  PENDING_UPLOAD: 'pending_upload',
  UPLOADED: 'uploaded',
  PROCESSING: 'processing',
  READY: 'ready',
  REJECTED: 'rejected',
  DELETED_LOGICALLY: 'deleted_logically',
} as const;
export type MediaStatus = (typeof MediaStatus)[keyof typeof MediaStatus];

export const RecordStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ARCHIVED: 'archived',
} as const;
export type RecordStatus = (typeof RecordStatus)[keyof typeof RecordStatus];

export const UserRole = {
  ADMIN: 'admin',
  INVENTORY_COUNTER: 'inventory_counter',
  SUPPLIER_ACCOUNTANT: 'supplier_accountant',
  INTEGRATION_SERVICE: 'integration_service',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const MatchSource = {
  SUPPLIER_ITEM_CODE: 'supplier_item_code',
  SUPPLIER_ITEM_NAME: 'supplier_item_name',
  ITEM_NAME_SIMILARITY: 'item_name_similarity',
  AI_VISUAL_TEXT: 'ai_visual_text',
  MANUAL: 'manual',
  UNMATCHED: 'unmatched',
} as const;
export type MatchSource = (typeof MatchSource)[keyof typeof MatchSource];

export const OrderRuleStatus = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ARCHIVED: 'archived',
} as const;
export type OrderRuleStatus = (typeof OrderRuleStatus)[keyof typeof OrderRuleStatus];

export const InventoryMovementType = {
  DELIVERY_RECEIPT: 'delivery_receipt',
  LEGACY_SALE: 'legacy_sale',
  COUNT_ADJUSTMENT: 'count_adjustment',
  ADMIN_CORRECTION: 'admin_correction',
  REVERSAL: 'reversal',
} as const;
export type InventoryMovementType = (typeof InventoryMovementType)[keyof typeof InventoryMovementType];

export const LedgerEntryType = {
  INVOICE_LIABILITY: 'invoice_liability',
  APPROVED_CREDIT: 'approved_credit',
  PAYMENT: 'payment',
  REVERSAL: 'reversal',
  MANUAL_ADJUSTMENT: 'manual_adjustment',
  OPENING_BALANCE: 'opening_balance',
} as const;
export type LedgerEntryType = (typeof LedgerEntryType)[keyof typeof LedgerEntryType];
