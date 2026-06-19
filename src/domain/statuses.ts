export const DeliveryStatus = {
  DRAFT: 'draft',
  SUPPLIER_REPORTED: 'supplier_reported',
  TRUSTEE_IN_PROGRESS: 'trustee_in_progress',
  TRUSTEE_COMPLETED: 'trustee_completed',
  ADMIN_REVIEW: 'admin_review',
  ADMIN_APPROVED: 'admin_approved',
  CREDIT_REQUESTED: 'credit_requested',
  CLOSED: 'closed',
} as const

export const CreditStatus = {
  REQUESTED: 'requested',
  SENT_TO_SUPPLIER: 'sent_to_supplier',
  SUPPLIER_UPLOADED: 'supplier_uploaded',
  ADMIN_APPROVED: 'admin_approved',
  ADMIN_REJECTED: 'admin_rejected',
  OFFSET_IN_PAYMENT: 'offset_in_payment',
  CLOSED: 'closed',
} as const

export const PaymentStatus = {
  DRAFT: 'draft',
  PENDING_CREDIT: 'pending_credit',
  READY_TO_PAY: 'ready_to_pay',
  PAID: 'paid',
  PARTIALLY_PAID: 'partially_paid',
  OVERPAID: 'overpaid',
} as const

export const InventoryCountStatus = {
  WAITING_LEGACY_CLOSE: 'waiting_legacy_close',
  READY_TO_COUNT: 'ready_to_count',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  LOCKED: 'locked',
} as const

export const DELIVERY_STATUS_LABELS: Record<string, string> = {
  draft: 'טיוטה',
  supplier_reported: 'דווח ע"י ספק',
  trustee_in_progress: 'נאמן בתהליך',
  trustee_completed: 'נאמן השלים',
  admin_review: 'בסקירת אדמין',
  admin_approved: 'אושר ע"י אדמין',
  credit_requested: 'דרישת זיכוי',
  closed: 'סגור',
}

export const CREDIT_STATUS_LABELS: Record<string, string> = {
  requested: 'נדרש',
  sent_to_supplier: 'נשלח לספק',
  supplier_uploaded: 'ספק העלה',
  admin_approved: 'אושר',
  admin_rejected: 'נדחה',
  offset_in_payment: 'קוזז',
  closed: 'סגור',
}

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  draft: 'טיוטה',
  pending_credit: 'ממתין לזיכוי',
  ready_to_pay: 'מוכן לתשלום',
  paid: 'שולם',
  partially_paid: 'שולם חלקי',
  overpaid: 'תשלום יתר',
}

export const INVENTORY_COUNT_STATUS_LABELS: Record<string, string> = {
  waiting_legacy_close: 'ממתין לסגירת חשבוניות',
  ready_to_count: 'מוכן לספירה',
  in_progress: 'בתהליך',
  completed: 'הושלם',
  locked: 'נעול',
}
