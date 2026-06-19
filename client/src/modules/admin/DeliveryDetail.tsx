import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as api from '../../services/api';
import { Delivery, DeliveryLine } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { StatusChip } from '../../components/ui/StatusChip';
import { Dialog } from '../../components/ui/Dialog';

function formatDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '5rem 2rem', flexDirection: 'column', gap: '0.75rem', color: 'var(--color-muted)' }}>
        <div className="spinner" style={{ width: 36, height: 36 }} />
        <span style={{ fontSize: 'var(--font-size-sm)' }}>טוען אספקה...</span>
      </div>
    );
  }

  if (error && !delivery) {
    return (
      <div style={{ padding: '2rem' }}>
        <div style={{ padding: '1rem', background: 'var(--color-danger-100)', borderRadius: 'var(--radius-md)', color: 'var(--color-danger-700)', marginBottom: '1rem' }}>
          ⚠️ {error}
        </div>
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

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* ── Page header ── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <button
          onClick={() => navigate(-1)}
          className="back-link"
        >
          → חזרה לרשימה
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, marginBottom: '0.25rem' }}>
              אספקה{' '}
              <span style={{ fontFamily: 'monospace', color: 'var(--color-primary-700)' }} dir="ltr">
                {delivery.reference}
              </span>
            </h1>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', fontSize: 'var(--font-size-sm)', color: 'var(--color-muted)' }}>
              <span>📅 {formatDate(delivery.createdAt)}</span>
              {delivery.supplier?.name && <span>🏭 {delivery.supplier.name}</span>}
              {delivery.branch?.name   && <span>🏪 {delivery.branch.name}</span>}
            </div>
          </div>
          <StatusChip status={delivery.status} />
        </div>
      </div>

      {/* ── Error ── */}
      {(error || actionError) && (
        <div style={{ padding: '0.875rem 1rem', background: 'var(--color-danger-100)', border: '1px solid rgba(220,56,56,.2)', borderRadius: 'var(--radius-md)', color: 'var(--color-danger-700)', fontSize: 'var(--font-size-sm)', marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          ⚠️ {error || actionError}
          <button onClick={() => { setError(''); setActionError(''); }} style={{ marginRight: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', minHeight: 'auto', minWidth: 'auto', fontWeight: 700 }}>✕</button>
        </div>
      )}

      {/* ── Financial summary strip ── */}
      {(supplierTotal != null || trusteeTotal != null) && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1px',
          background: 'var(--color-border)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          marginBottom: '1.25rem',
          border: '1px solid var(--color-border)',
        }}>
          {[
            { label: 'סכום ספק', value: supplierTotal, icon: '🏭' },
            { label: 'סכום נאמן', value: trusteeTotal, icon: '👤' },
            {
              label: 'הפרש',
              value: diff,
              icon: diff == null ? '—' : diff < 0 ? '⬇️' : diff > 0 ? '⬆️' : '✓',
              color: diff == null ? undefined : diff < 0 ? 'var(--color-danger-600)' : diff > 0 ? 'var(--color-warning-600)' : 'var(--color-success-600)',
            },
          ].map((item, i) => (
            <div key={i} style={{ background: 'var(--color-surface)', padding: '1rem 1.25rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                {item.icon} {item.label}
              </div>
              <div style={{ fontSize: '1.375rem', fontWeight: 700, color: item.color ?? 'var(--color-text)' }}>
                {item.value != null ? `₪${item.value.toFixed(2)}` : '—'}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Action buttons ── */}
      {!isClosed && !isApproved && (
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem', padding: '1rem 1.25rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-muted)', alignSelf: 'center' }}>פעולות:</span>
          {delivery.status === 'supplier_reported' && (
            <Button variant="primary" onClick={handleMoveToAdminReview} loading={actionLoading}>
              העבר לסקירת מנהל
            </Button>
          )}
          {delivery.status === 'admin_review' && (
            <Button variant="primary" onClick={handleApproveToInventory} loading={actionLoading}>
              ✅ שמור ועדכן מלאי
            </Button>
          )}
          <Button variant="danger" onClick={() => setCancelDialogOpen(true)} disabled={actionLoading}>
            בטל אספקה
          </Button>
        </div>
      )}

      {isApproved && (
        <div style={{ padding: '0.875rem 1rem', background: 'var(--color-success-100)', border: '1px solid rgba(26,156,98,.2)', borderRadius: 'var(--radius-md)', color: 'var(--color-success-700)', fontSize: 'var(--font-size-sm)', marginBottom: '1.25rem', fontWeight: 500 }}>
          ✅ האספקה אושרה למלאי והמלאי עודכן בהצלחה
        </div>
      )}

      {/* ── Two-column layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>

        {/* Delivery info card */}
        <div className="card">
          <div className="card__header">
            <h3 className="card__title">📋 פרטי אספקה</h3>
          </div>
          <div className="card__body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
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
                <div key={i}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                    {field.label}
                  </div>
                  <div style={{ fontWeight: 500, color: 'var(--color-text)' }}>
                    {field.value || '—'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Evidence gallery */}
        {delivery.media && delivery.media.length > 0 && (
          <div className="card">
            <div className="card__header">
              <h3 className="card__title">📸 גלריית ראיות</h3>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-muted)' }}>
                {delivery.media.length} קבצים
              </span>
            </div>
            <div className="card__body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem' }}>
                {delivery.media.map((m) => {
                  const isImage = m.media.contentType?.startsWith('image/');
                  const src = m.media.storageKey ? `/api/v1/media/${m.media.id}` : undefined;
                  return (
                    <div
                      key={m.mediaId}
                      style={{
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        overflow: 'hidden',
                        background: 'var(--color-surface-2)',
                        position: 'relative',
                      }}
                    >
                      {isImage && src ? (
                        <a href={src} target="_blank" rel="noopener noreferrer" style={{ display: 'block' }}>
                          <img
                            src={src}
                            alt={m.media.originalFilename ?? 'תמונה'}
                            style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }}
                          />
                          <div style={{ padding: '0.375rem 0.5rem', fontSize: '0.75rem', color: 'var(--color-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {m.media.originalFilename ?? 'תמונה'}
                          </div>
                        </a>
                      ) : (
                        <div style={{ width: '100%', height: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', color: 'var(--color-muted)', fontSize: '0.8125rem' }}>
                          <span style={{ fontSize: '2rem' }}>📄</span>
                          <span style={{ fontSize: '0.75rem', padding: '0 0.5rem', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', wordBreak: 'break-all', maxWidth: '100%' }}>
                            {m.media.originalFilename ?? 'קובץ'}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Invoices */}
        {delivery.invoices && delivery.invoices.length > 0 && (
          <div className="card">
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
                      <th style={{ textAlign: 'center' }}>סטטוס OCR</th>
                      <th style={{ textAlign: 'center' }}>ראשית</th>
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
                        <td style={{ textAlign: 'center' }}>
                          {inv.isPrimary ? <span style={{ color: 'var(--color-success-600)', fontWeight: 700 }}>✓</span> : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Reconciliation table */}
        <div className="card">
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
                    const diff = editableQty - line.qtyInvoice;
                    const hasShortage = diff < 0;
                    return (
                      <tr
                        key={line.id}
                        style={hasShortage ? { background: 'rgba(220,56,56,0.03)' } : undefined}
                      >
                        <td style={{ color: 'var(--color-muted)', fontSize: '0.8125rem' }}>{idx + 1}</td>
                        <td style={{ fontWeight: 500 }}>
                          {line.item?.name ?? line.rawName ?? '—'}
                          {!line.item && (
                            <span className="badge badge-orange" style={{ marginRight: '0.5rem', fontSize: '10px' }}>
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
                              style={{
                                width: 72,
                                padding: '0.25rem 0.375rem',
                                border: `1.5px solid ${hasShortage ? 'var(--color-danger-600)' : 'var(--color-primary-500)'}`,
                                borderRadius: 'var(--radius-sm)',
                                fontSize: 'var(--font-size-sm)',
                                textAlign: 'center',
                                fontWeight: 600,
                              }}
                            />
                          ) : (
                            <span style={{ fontWeight: 600 }}>{editableQty}</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {diff !== 0 ? (
                            <span style={{
                              fontWeight: 700,
                              color: hasShortage ? 'var(--color-danger-600)' : 'var(--color-warning-600)',
                              fontSize: 'var(--font-size-sm)',
                            }}>
                              {diff > 0 ? '+' : ''}{diff}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--color-success-600)', fontWeight: 600 }}>✓</span>
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
                    <tr style={{ background: 'var(--color-surface-2)', borderTop: '2px solid var(--color-border)' }}>
                      <td colSpan={2} style={{ padding: '12px 16px', fontWeight: 700, fontSize: 'var(--font-size-sm)' }}>
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

      {/* Sticky bottom action bar for admin_review */}
      {delivery.status === 'admin_review' && !isClosed && (
        <div style={{
          position: 'sticky',
          bottom: 0,
          background: 'var(--color-surface)',
          borderTop: '1px solid var(--color-border)',
          padding: '1rem 1.25rem',
          display: 'flex',
          gap: '0.75rem',
          justifyContent: 'flex-end',
          marginTop: '1.5rem',
          marginLeft: '-2rem',
          marginRight: '-2rem',
          boxShadow: '0 -4px 16px rgba(0,0,0,0.06)',
          zIndex: 5,
        }}>
          <Button variant="secondary" onClick={() => navigate(-1)} disabled={actionLoading}>
            ביטול
          </Button>
          <Button variant="primary" onClick={handleApproveToInventory} loading={actionLoading}>
            ✅ שמור ועדכן מלאי
          </Button>
        </div>
      )}

      {/* Cancel Dialog */}
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
