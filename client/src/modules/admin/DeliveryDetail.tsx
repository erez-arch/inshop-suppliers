import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as api from '../../services/api';
import { Delivery, DeliveryLine } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { StatusChip } from '../../components/ui/StatusChip';
import { Dialog } from '../../components/ui/Dialog';
import './delivery-detail.css';

function formatDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatCurrency(val: number | null): string {
  if (val == null) return '—';
  return `₪${val.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface LineEdit { qtyInventory: number; }

export default function DeliveryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lineEdits, setLineEdits] = useState<Record<string, LineEdit>>({});
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const loadDelivery = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.deliveries.get(id);
      setDelivery(data);
      const edits: Record<string, LineEdit> = {};
      (data.deliveryLines ?? []).forEach((line: DeliveryLine) => {
        edits[line.id] = { qtyInventory: line.qtyInventory };
      });
      setLineEdits(edits);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת אספקה');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadDelivery(); }, [loadDelivery]);

  function updateLineQty(lineId: string, value: number) {
    setLineEdits((prev) => ({ ...prev, [lineId]: { qtyInventory: value } }));
  }

  async function handleMoveToAdminReview() {
    if (!delivery) return;
    setActionLoading(true);
    setActionError('');
    try {
      await api.deliveries.moveToAdminReview(delivery.id);
      await loadDelivery();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'שגיאה בהעברה לסקירת מנהל');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleApproveToInventory() {
    if (!delivery) return;
    setActionLoading(true);
    setActionError('');
    try {
      const lines = (delivery.deliveryLines ?? []).map((line: DeliveryLine) => ({
        deliveryLineId: line.id,
        qtyInventory: lineEdits[line.id]?.qtyInventory ?? line.qtyInventory,
      }));
      await api.deliveries.approveToInventory(delivery.id, { version: delivery.version, lines });
      await loadDelivery();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'שגיאה באישור למלאי');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancel() {
    if (!delivery) return;
    setActionLoading(true);
    setActionError('');
    try {
      await api.deliveries.cancel(delivery.id, cancelReason || undefined);
      setCancelDialogOpen(false);
      setCancelReason('');
      await loadDelivery();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'שגיאה בביטול אספקה');
    } finally {
      setActionLoading(false);
    }
  }

  // ── Loading ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="dd-loading">
        <div className="spinner" style={{ width: 36, height: 36 }} />
        <span>טוען אספקה...</span>
      </div>
    );
  }

  if (error && !delivery) {
    return (
      <div style={{ padding: '2rem' }}>
        <div className="dd-error-box">⚠️ {error}</div>
        <Button variant="secondary" onClick={() => navigate(-1)}>→ חזרה</Button>
      </div>
    );
  }

  if (!delivery) return null;

  const isClosed = delivery.status === 'closed' || delivery.status === 'cancelled';
  const isApproved = delivery.status === 'approved_to_inventory';
  const lines: DeliveryLine[] = delivery.deliveryLines ?? [];
  const canEdit = delivery.status === 'admin_review' && !isClosed;

  // Financial summary
  const supplierInvoice = delivery.invoices?.find((inv) => inv.source === 'supplier');
  const trusteeInvoice  = delivery.invoices?.find((inv) => inv.source === 'trustee');
  const supplierTotal   = supplierInvoice?.totalAmount ? Number(supplierInvoice.totalAmount) : null;
  const trusteeTotal    = trusteeInvoice?.totalAmount  ? Number(trusteeInvoice.totalAmount)  : null;
  const diff            = supplierTotal != null && trusteeTotal != null ? trusteeTotal - supplierTotal : null;

  // AI comparison status
  const hasDiff = diff != null && Math.abs(diff) > 0.01;
  const aiStatus = hasDiff
    ? (Math.abs(diff!) > 100 ? 'danger' : 'warning')
    : (diff != null ? 'success' : null);

  return (
    <div className="dd-page">
      {/* ── Page Header ─────────────────────────────────────── */}
      <div className="dd-page-header">
        <button onClick={() => navigate(-1)} className="back-link">
          → חזרה לרשימה
        </button>
        <div className="dd-header-row">
          <div className="dd-header-main">
            <div className="dd-title-row">
              <h1 className="dd-title">
                אספקה{' '}
                <span className="dd-ref" dir="ltr">{delivery.reference}</span>
              </h1>
              <StatusChip status={delivery.status} />
            </div>
            <div className="dd-meta">
              <span>📅 {formatDate(delivery.createdAt)}</span>
              {delivery.supplier?.name && <span>🏭 {delivery.supplier.name}</span>}
              {delivery.branch?.name   && <span>🏪 {delivery.branch.name}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* ── Error ───────────────────────────────────────────── */}
      {(error || actionError) && (
        <div className="dd-error-box" role="alert">
          ⚠️ {error || actionError}
          <button
            onClick={() => { setError(''); setActionError(''); }}
            className="dd-error-close"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Financial Summary Strip ──────────────────────────── */}
      {(supplierTotal != null || trusteeTotal != null) && (
        <div className="dd-financial-strip">
          <div className="dd-financial-item">
            <div className="dd-financial-label">סכום חשבונית ספק</div>
            <div className="dd-financial-value">{formatCurrency(supplierTotal)}</div>
          </div>
          <div className="dd-financial-divider" aria-hidden="true" />
          <div className="dd-financial-item">
            <div className="dd-financial-label">סכום חשבונית נאמן</div>
            <div className="dd-financial-value">{formatCurrency(trusteeTotal)}</div>
          </div>
          <div className="dd-financial-divider" aria-hidden="true" />
          <div className="dd-financial-item">
            <div className="dd-financial-label">הפרש</div>
            <div
              className="dd-financial-value"
              style={{
                color: diff == null
                  ? undefined
                  : Math.abs(diff) < 0.01
                    ? 'var(--color-success-700)'
                    : diff > 0 ? 'var(--color-warning-700)' : 'var(--color-danger-700)',
              }}
            >
              {diff == null ? '—' : formatCurrency(diff)}
              {diff != null && Math.abs(diff) < 0.01 && (
                <span className="dd-match-check"> ✓</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── AI Comparison Banner ─────────────────────────────── */}
      {aiStatus && (
        <div className={`dd-ai-banner dd-ai-banner--${aiStatus}`}>
          {aiStatus === 'success' && '✅ החשבוניות תואמות — אין הפרשים'}
          {aiStatus === 'warning' && '⚠️ ישנו הפרש קל בין חשבוניות הספק והנאמן'}
          {aiStatus === 'danger'  && '🔴 הפרש משמעותי בין חשבוניות — נדרשת בדיקה'}
        </div>
      )}

      {/* ── Approved Banner ─────────────────────────────────── */}
      {isApproved && (
        <div className="dd-approved-banner">
          ✅ האספקה אושרה למלאי והמלאי עודכן בהצלחה
        </div>
      )}

      {/* ── Action buttons (non-admin-review statuses) ──────── */}
      {!isClosed && !isApproved && delivery.status !== 'admin_review' && (
        <div className="dd-actions-bar">
          <span className="dd-actions-label">פעולות:</span>
          {delivery.status === 'supplier_reported' && (
            <Button variant="primary" onClick={handleMoveToAdminReview} loading={actionLoading}>
              העבר לסקירת מנהל
            </Button>
          )}
          <Button variant="danger" onClick={() => setCancelDialogOpen(true)} disabled={actionLoading}>
            בטל אספקה
          </Button>
        </div>
      )}

      {/* ── Evidence Gallery ─────────────────────────────────── */}
      {delivery.media && delivery.media.length > 0 && (
        <div className="card dd-section">
          <div className="card__header">
            <h3 className="card__title">📸 גלריית ראיות</h3>
            <span className="dd-media-count">{delivery.media.length} קבצים</span>
          </div>
          <div className="card__body">
            <div className="dd-media-grid">
              {delivery.media.map((m) => {
                const isImage = m.media.contentType?.startsWith('image/');
                const src = m.media.storageKey ? `/api/v1/media/${m.media.id}` : undefined;
                const roleLabel = m.media.originalFilename ?? 'קובץ';

                return (
                  <div key={m.mediaId} className="dd-media-card">
                    <div className="dd-media-card__label">{roleLabel}</div>
                    <div className="dd-media-card__img-wrap">
                      {isImage && src ? (
                        <a href={src} target="_blank" rel="noopener noreferrer" className="dd-media-card__link">
                          <img
                            src={src}
                            alt={m.media.originalFilename ?? 'תמונה'}
                            className="dd-media-card__img"
                          />
                          <div className="dd-media-card__zoom" aria-hidden="true">🔍</div>
                        </a>
                      ) : (
                        <div className="dd-media-card__placeholder">
                          <span style={{ fontSize: '2rem' }}>📄</span>
                          <span className="dd-media-card__filename">
                            {m.media.originalFilename ?? 'קובץ'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Main + Side Panel Layout ─────────────────────────── */}
      <div className="dd-content-layout">
        {/* Main: Reconciliation Table */}
        <div className="dd-main">
          {/* Delivery Info */}
          <div className="card dd-section">
            <div className="card__header">
              <h3 className="card__title">📋 פרטי אספקה</h3>
            </div>
            <div className="card__body">
              <div className="dd-info-grid">
                {[
                  { label: 'ספק', value: delivery.supplier?.name },
                  { label: 'סניף', value: delivery.branch?.name },
                  { label: 'מצב קרדיט', value: delivery.creditState },
                  { label: 'תאריך יצירה', value: formatDate(delivery.createdAt) },
                  { label: 'עדכון אחרון', value: formatDate(delivery.updatedAt) },
                  ...(delivery.contact ? [
                    { label: 'איש קשר', value: delivery.contact.contactName },
                    { label: 'טלפון', value: delivery.contact.contactPhone },
                  ] : []),
                ].map((field, i) => (
                  <div key={i} className="dd-info-field">
                    <div className="dd-info-field__label">{field.label}</div>
                    <div className="dd-info-field__value">{field.value || '—'}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Invoices */}
          {delivery.invoices && delivery.invoices.length > 0 && (
            <div className="card dd-section">
              <div className="card__header">
                <h3 className="card__title">🧾 חשבוניות</h3>
              </div>
              <div className="card__body--no-padding">
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>מקור</th>
                        <th>מספר חשבונית</th>
                        <th>תאריך</th>
                        <th style={{ textAlign: 'center' }}>סכום</th>
                        <th style={{ textAlign: 'center' }}>OCR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {delivery.invoices.map((inv) => (
                        <tr key={inv.id}>
                          <td>
                            <span className={`badge ${inv.source === 'supplier' ? 'badge-blue' : 'badge-purple'}`}>
                              {inv.source === 'supplier' ? '🏭 ספק' : '👤 נאמן'}
                            </span>
                          </td>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.875rem' }} dir="ltr">
                            {inv.invoiceNumber ?? '—'}
                          </td>
                          <td style={{ color: 'var(--color-muted)' }}>
                            {inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString('he-IL') : '—'}
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 600 }}>
                            {inv.totalAmount != null ? `₪${Number(inv.totalAmount).toFixed(2)}` : '—'}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {inv.aiStatus ? <StatusChip status={inv.aiStatus} /> : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Reconciliation Table */}
          <div className="card dd-section">
            <div className="card__header">
              <h3 className="card__title">📊 טבלת שורות — Reconciliation</h3>
              {canEdit && (
                <span className="badge badge-indigo" style={{ fontSize: '11px' }}>מצב עריכה</span>
              )}
            </div>
            {lines.length === 0 ? (
              <div className="card__body">
                <div className="empty-state">
                  <span className="empty-state__icon">📭</span>
                  <span className="empty-state__title">אין שורות אספקה</span>
                </div>
              </div>
            ) : (
              <div className="card__body--no-padding" style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>פריט</th>
                      <th style={{ textAlign: 'center' }}>כמות חשבונית</th>
                      <th style={{ textAlign: 'center' }}>כמות שהתקבלה</th>
                      <th style={{ textAlign: 'center' }}>כמות למלאי</th>
                      <th style={{ textAlign: 'center' }}>הפרש</th>
                      <th style={{ textAlign: 'center' }}>מחיר יחידה</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line: DeliveryLine, idx) => {
                      const editableQty = lineEdits[line.id]?.qtyInventory ?? line.qtyInventory;
                      const lineDiff = editableQty - line.qtyInvoice;
                      const hasShortage = lineDiff < 0;
                      return (
                        <tr
                          key={line.id}
                          className={hasShortage ? 'dd-row--shortage' : undefined}
                        >
                          <td className="dd-row-num">{idx + 1}</td>
                          <td>
                            <span className="dd-item-name">
                              {line.item?.name ?? line.rawName ?? '—'}
                            </span>
                            {!line.item && (
                              <span className="badge badge-orange dd-unmatched-badge">
                                לא מזוהה
                              </span>
                            )}
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 500 }}>{line.qtyInvoice}</td>
                          <td style={{ textAlign: 'center' }}>{line.qtyReceived}</td>
                          <td style={{ textAlign: 'center' }}>
                            {canEdit ? (
                              <input
                                type="number"
                                value={editableQty}
                                min={0}
                                onChange={(e) => updateLineQty(line.id, Number(e.target.value))}
                                className={`dd-qty-input ${hasShortage ? 'dd-qty-input--shortage' : ''}`}
                              />
                            ) : (
                              <span style={{ fontWeight: 600 }}>{editableQty}</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {lineDiff !== 0 ? (
                              <span
                                className={`dd-diff ${hasShortage ? 'dd-diff--negative' : 'dd-diff--positive'}`}
                              >
                                {lineDiff > 0 ? '+' : ''}{lineDiff}
                              </span>
                            ) : (
                              <span className="dd-diff-ok">✓</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'center', color: 'var(--color-muted)', fontSize: '0.875rem' }}>
                            {line.unitPrice != null ? `₪${Number(line.unitPrice).toFixed(2)}` : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {lines.length > 0 && (
                    <tfoot>
                      <tr className="dd-tfoot-row">
                        <td colSpan={2} className="dd-tfoot-label">
                          סה"כ ({lines.length} שורות)
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 700, padding: '12px 16px' }}>
                          {lines.reduce((s, l) => s + l.qtyInvoice, 0)}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 700, padding: '12px 16px' }}>
                          {lines.reduce((s, l) => s + l.qtyReceived, 0)}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 700, padding: '12px 16px' }}>
                          {lines.reduce((s, l) => s + (lineEdits[l.id]?.qtyInventory ?? l.qtyInventory), 0)}
                        </td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Side Panel */}
        {!isClosed && !isApproved && (
          <div className="dd-side">
            <div className="card dd-credit-card">
              <div className="card__header">
                <h3 className="card__title">💰 פעולות זמינות</h3>
              </div>
              <div className="card__body dd-side-body">
                {delivery.status === 'supplier_reported' && (
                  <div className="dd-side-action">
                    <p className="dd-side-hint">האספקה דווחה על ידי הספק וממתינה לסקירה.</p>
                    <Button
                      variant="primary"
                      style={{ width: '100%' }}
                      onClick={handleMoveToAdminReview}
                      loading={actionLoading}
                    >
                      העבר לסקירת מנהל
                    </Button>
                  </div>
                )}
                {delivery.status === 'admin_review' && (
                  <div className="dd-side-action">
                    <p className="dd-side-hint">עדכן כמויות למלאי ולחץ שמור כדי לאשר.</p>
                    <Button
                      variant="primary"
                      style={{ width: '100%' }}
                      onClick={handleApproveToInventory}
                      loading={actionLoading}
                    >
                      ✅ שמור ועדכן מלאי
                    </Button>
                  </div>
                )}
                <Button
                  variant="danger"
                  style={{ width: '100%', marginTop: '0.75rem' }}
                  onClick={() => setCancelDialogOpen(true)}
                  disabled={actionLoading}
                >
                  בטל אספקה
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Sticky Bottom Bar (admin_review only) ───────────── */}
      {delivery.status === 'admin_review' && !isClosed && (
        <div className="dd-sticky-bar">
          <Button variant="secondary" onClick={() => navigate(-1)} disabled={actionLoading}>
            ביטול
          </Button>
          <Button variant="primary" onClick={handleApproveToInventory} loading={actionLoading}>
            ✅ שמור ועדכן מלאי
          </Button>
        </div>
      )}

      {/* ── Cancel Dialog ─────────────────────────────────── */}
      <Dialog
        open={cancelDialogOpen}
        onClose={() => { setCancelDialogOpen(false); setCancelReason(''); }}
        title="ביטול אספקה"
        size="sm"
        actions={
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => { setCancelDialogOpen(false); setCancelReason(''); }} disabled={actionLoading}>
              ביטול
            </Button>
            <Button variant="danger" onClick={handleCancel} loading={actionLoading}>
              אשר ביטול
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p>האם לבטל את האספקה <strong>{delivery.reference}</strong>? פעולה זו אינה הפיכה.</p>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.375rem', fontSize: 'var(--font-size-sm)' }}>
              סיבת ביטול (אופציונלי)
            </label>
            <input
              type="text"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="הזן סיבה..."
              className="form-input"
              disabled={actionLoading}
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
