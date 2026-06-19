import React from 'react';
import './StatusChip.css';

const STATUS_LABELS: Record<string, string> = {
  draft: 'טיוטה',
  supplier_reported: 'דווח ע"י ספק',
  trustee_pending: 'ממתין לנאמן',
  trustee_in_progress: 'נאמן בתהליך',
  trustee_received: 'התקבל ע"י נאמן',
  admin_review: 'בבדיקת מנהל',
  approved_to_inventory: 'אושר למלאי',
  closed: 'סגור',
  cancelled: 'בוטל',
  active: 'פעיל',
  inactive: 'לא פעיל',
  archived: 'בארכיון',
  posted: 'פורסם',
  ready_to_post: 'מוכן לפרסום',
  under_review: 'בבדיקה',
  awaiting_document: 'ממתין למסמך',
  waiting_for_legacy_close: 'ממתין לסגירת מערכת',
  ready_to_count: 'מוכן לספירה',
  in_progress: 'בתהליך',
  completed: 'הושלם',
  locked: 'נעול',
  failed: 'נכשל',
};

const STATUS_VARIANTS: Record<string, string> = {
  draft: 'neutral',
  supplier_reported: 'info',
  trustee_pending: 'warning',
  trustee_in_progress: 'warning',
  trustee_received: 'info',
  admin_review: 'warning',
  approved_to_inventory: 'success',
  closed: 'neutral',
  cancelled: 'danger',
  active: 'success',
  inactive: 'neutral',
  archived: 'neutral',
  posted: 'success',
  ready_to_post: 'info',
  under_review: 'warning',
  awaiting_document: 'warning',
  waiting_for_legacy_close: 'warning',
  ready_to_count: 'info',
  in_progress: 'warning',
  completed: 'success',
  locked: 'neutral',
  failed: 'danger',
};

interface StatusChipProps {
  status: string;
  label?: string;
}

export function StatusChip({ status, label }: StatusChipProps) {
  const variant = STATUS_VARIANTS[status] ?? 'neutral';
  const text = label ?? STATUS_LABELS[status] ?? status;
  return (
    <span className={`status-chip status-chip--${variant}`} role="status" aria-label={text}>
      {text}
    </span>
  );
}
