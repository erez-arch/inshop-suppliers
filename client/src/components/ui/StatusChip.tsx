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
  waiting_for_legacy_close: 'ממתין לסגירה',
  ready_to_count: 'מוכן לספירה',
  in_progress: 'בתהליך',
  completed: 'הושלם',
  locked: 'נעול',
  failed: 'נכשל',
};

// Status color map per design spec
const STATUS_VARIANTS: Record<string, string> = {
  draft:                  'neutral',
  supplier_reported:      'info',
  trustee_pending:        'warning',
  trustee_in_progress:    'yellow',
  trustee_received:       'purple',
  admin_review:           'indigo',
  approved_to_inventory:  'success',
  closed:                 'neutral',
  cancelled:              'danger',
  active:                 'success',
  inactive:               'neutral',
  archived:               'neutral',
  posted:                 'success',
  ready_to_post:          'info',
  under_review:           'warning',
  awaiting_document:      'warning',
  waiting_for_legacy_close: 'warning',
  ready_to_count:         'info',
  in_progress:            'warning',
  completed:              'success',
  locked:                 'neutral',
  failed:                 'danger',
};

const STATUS_DOT: Record<string, string> = {
  neutral:  '#9ca3af',
  info:     '#2e72d2',
  success:  '#1a9c62',
  warning:  '#b86d00',
  danger:   '#dc3838',
  purple:   '#5133d6',
  indigo:   '#4338ca',
  yellow:   '#ca8a04',
};

interface StatusChipProps {
  status: string;
  label?: string;
}

export function StatusChip({ status, label }: StatusChipProps) {
  const variant = STATUS_VARIANTS[status] ?? 'neutral';
  const text = label ?? STATUS_LABELS[status] ?? status;
  const dotColor = STATUS_DOT[variant] ?? STATUS_DOT.neutral;
  return (
    <span
      className={`status-chip status-chip--${variant}`}
      role="status"
      aria-label={text}
    >
      <span
        aria-hidden="true"
        style={{
          display: 'inline-block',
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: dotColor,
          flexShrink: 0,
        }}
      />
      {text}
    </span>
  );
}
