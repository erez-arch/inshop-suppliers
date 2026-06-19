import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as api from '../../services/api';
import { Delivery, DeliveryLine } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { StatusChip } from '../../components/ui/StatusChip';
import { Alert } from '../../components/ui/Alert';
import { Dialog } from '../../components/ui/Dialog';

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface LineEdit {
  qtyInventory: number;
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const sectionSpacing: React.CSSProperties = { marginBottom: 'var(--spacing-4)' };

const thStyle: React.CSSProperties = {
  padding: '0.5rem 0.75rem',
  textAlign: 'right',
  borderBottom: '2px solid var(--color-border)',
  fontWeight: 600,
  fontSize: '0.875rem',
  color: 'var(--color-text-secondary)',
  backgroundColor: 'var(--color-surface)',
};

const tdStyle: React.CSSProperties = {
  padding: '0.5rem 0.75rem',
  borderBottom: '1px solid var(--color-border)',
  fontSize: '0.9375rem',
};

// ── Component ──────────────────────────────────────────────────────────────────

export default function DeliveryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Per-line qty edits: lineId → qtyInventory
  const [lineEdits, setLineEdits] = useState<Record<string, LineEdit>>({});

  // Action states
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  // Cancel dialog
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const loadDelivery = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.deliveries.get(id);
      setDelivery(data);
      // Seed line edits with current qtyInventory values
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

  useEffect(() => {
    loadDelivery();
  }, [loadDelivery]);

  function updateLineQty(lineId: string, value: number) {
    setLineEdits((prev: Record<string, LineEdit>) => ({
      ...prev,
      [lineId]: { qtyInventory: value },
    }));
  }

  // ── Actions ────────────────────────────────────────────────────────────────

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
      await api.deliveries.approveToInventory(delivery.id, {
        version: delivery.version,
        lines,
      });
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

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '4rem',
          gap: '0.75rem',
          fontSize: '1rem',
          color: 'var(--color-text-secondary)',
        }}
      >
        <div className="spinner" />
        טוען אספקה...
      </div>
    );
  }

  if (error && !delivery) {
    return (
      <div style={{ padding: 'var(--spacing-6)' }}>
        <Alert type="error">{error}</Alert>
        <Button variant="ghost" onClick={() => navigate(-1)} style={{ marginTop: '1rem' }}>
          ← חזרה
        </Button>
      </div>
    );
  }

  if (!delivery) return null;

  const isClosed =
    delivery.status === 'closed' || delivery.status === 'cancelled';

  const lines: DeliveryLine[] = delivery.deliveryLines ?? [];

  return (
    <div style={{ padding: 'var(--spacing-6)', maxWidth: '1100px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 'var(--spacing-6)',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-primary)',
              fontSize: '0.9rem',
              padding: 0,
              marginBottom: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            ← חזרה לרשימה
          </button>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>
            אספקה: {delivery.reference}
          </h1>
        </div>
        <StatusChip status={delivery.status} />
      </div>

      {/* Errors */}
      {(error || actionError) && (
        <div style={sectionSpacing}>
          <Alert
            type="error"
            onClose={() => { setError(''); setActionError(''); }}
          >
            {error || actionError}
          </Alert>
        </div>
      )}

      {/* Metadata */}
      <div style={sectionSpacing}>
        <Card title="פרטי אספקה">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '1rem',
            }}
          >
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', display: 'block' }}>
                ספק
              </span>
              <strong>{delivery.supplier?.name ?? '—'}</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', display: 'block' }}>
                סניף
              </span>
              <strong>{delivery.branch?.name ?? '—'}</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', display: 'block' }}>
                מצב קרדיט
              </span>
              <strong>{delivery.creditState ?? '—'}</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', display: 'block' }}>
                תאריך יצירה
              </span>
              <strong>{formatDate(delivery.createdAt)}</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', display: 'block' }}>
                עדכון אחרון
              </span>
              <strong>{formatDate(delivery.updatedAt)}</strong>
            </div>
            {delivery.contact && (
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', display: 'block' }}>
                  איש קשר
                </span>
                <strong>
                  {delivery.contact.contactName}{' '}
                  {delivery.contact.contactPhone ? `(${delivery.contact.contactPhone})` : ''}
                </strong>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Action buttons */}
      {!isClosed && (
        <div
          style={{
            display: 'flex',
            gap: '0.75rem',
            flexWrap: 'wrap',
            marginBottom: 'var(--spacing-4)',
          }}
        >
          {delivery.status === 'supplier_reported' && (
            <Button
              variant="primary"
              onClick={handleMoveToAdminReview}
              loading={actionLoading}
            >
              העבר לסקירת מנהל
            </Button>
          )}
          {delivery.status === 'admin_review' && (
            <Button
              variant="primary"
              onClick={handleApproveToInventory}
              loading={actionLoading}
            >
              אשר למלאי
            </Button>
          )}
          <Button
            variant="danger"
            onClick={() => setCancelDialogOpen(true)}
            disabled={actionLoading}
          >
            בטל אספקה
          </Button>
        </div>
      )}

      {/* Delivery lines */}
      <div style={sectionSpacing}>
        <Card title="שורות אספקה" noPadding>
          {lines.length === 0 ? (
            <div style={{ padding: '1.5rem', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
              אין שורות אספקה
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>שם פריט</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>כמות בחשבונית</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>כמות שהתקבלה</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>כמות למלאי</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>מחיר יחידה</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line: DeliveryLine) => {
                    const editableQty =
                      lineEdits[line.id]?.qtyInventory ?? line.qtyInventory;
                    const canEdit =
                      delivery.status === 'admin_review' && !isClosed;
                    return (
                      <tr key={line.id}>
                        <td style={tdStyle}>
                          {line.item?.name ?? line.rawName}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          {line.qtyInvoice}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          {line.qtyReceived}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          {canEdit ? (
                            <input
                              type="number"
                              value={editableQty}
                              min={0}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                updateLineQty(line.id, Number(e.target.value))
                              }
                              style={{
                                width: '80px',
                                padding: '0.25rem 0.5rem',
                                border: '1.5px solid var(--color-primary)',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '0.9375rem',
                                textAlign: 'center',
                              }}
                            />
                          ) : (
                            editableQty
                          )}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          {line.unitPrice != null
                            ? `₪${Number(line.unitPrice).toFixed(2)}`
                            : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Invoices section */}
      {delivery.invoices && delivery.invoices.length > 0 && (
        <div style={sectionSpacing}>
          <Card title="חשבוניות" noPadding>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>מקור</th>
                    <th style={thStyle}>מספר חשבונית</th>
                    <th style={thStyle}>תאריך</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>סכום</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>סטטוס OCR</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>ראשית</th>
                  </tr>
                </thead>
                <tbody>
                  {delivery.invoices.map((inv) => (
                    <tr key={inv.id}>
                      <td style={tdStyle}>{inv.source}</td>
                      <td style={tdStyle}>{inv.invoiceNumber ?? '—'}</td>
                      <td style={tdStyle}>{formatDate(inv.invoiceDate)}</td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        {inv.totalAmount != null
                          ? `₪${Number(inv.totalAmount).toFixed(2)}`
                          : '—'}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        {inv.aiStatus ? <StatusChip status={inv.aiStatus} /> : '—'}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        {inv.isPrimary ? (
                          <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>✓</span>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Media section */}
      {delivery.media && delivery.media.length > 0 && (
        <div style={sectionSpacing}>
          <Card title="מדיה">
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {delivery.media.map((m) => {
                const isImage = m.media.contentType?.startsWith('image/');
                const src = m.media.storageKey
                  ? `/api/v1/media/${m.media.id}`
                  : undefined;
                return (
                  <div
                    key={m.mediaId}
                    style={{
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      overflow: 'hidden',
                      width: '120px',
                    }}
                  >
                    {isImage && src ? (
                      <a href={src} target="_blank" rel="noopener noreferrer">
                        <img
                          src={src}
                          alt={m.media.originalFilename ?? 'תמונה'}
                          style={{
                            width: '120px',
                            height: '90px',
                            objectFit: 'cover',
                            display: 'block',
                          }}
                        />
                      </a>
                    ) : (
                      <div
                        style={{
                          width: '120px',
                          height: '90px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: 'var(--color-surface)',
                          color: 'var(--color-text-secondary)',
                          fontSize: '0.8rem',
                          textAlign: 'center',
                          padding: '0.25rem',
                        }}
                      >
                        {m.media.originalFilename ?? 'קובץ'}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* Cancel Dialog */}
      <Dialog
        open={cancelDialogOpen}
        onClose={() => {
          setCancelDialogOpen(false);
          setCancelReason('');
        }}
        title="ביטול אספקה"
        size="sm"
        actions={
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Button
              variant="secondary"
              onClick={() => {
                setCancelDialogOpen(false);
                setCancelReason('');
              }}
              disabled={actionLoading}
            >
              ביטול
            </Button>
            <Button variant="danger" onClick={handleCancel} loading={actionLoading}>
              אשר ביטול
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ margin: 0 }}>
            האם לבטל את האספקה <strong>{delivery.reference}</strong>?
          </p>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>
              סיבת ביטול (אופציונלי)
            </label>
            <input
              type="text"
              value={cancelReason}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setCancelReason(e.target.value)
              }
              placeholder="הזן סיבה..."
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                border: '1.5px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                fontSize: '1rem',
                boxSizing: 'border-box',
              }}
              disabled={actionLoading}
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
