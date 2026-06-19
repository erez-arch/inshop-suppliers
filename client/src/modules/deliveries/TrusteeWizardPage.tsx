import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MobileShell } from '../../components/MobileLayout/MobileShell';
import { Stepper } from '../../components/ui/Stepper';
import { Button } from '../../components/ui/Button';
import { StatusChip } from '../../components/ui/StatusChip';
import * as api from '../../services/api';
import './trustee-wizard.css';

const STEPS = [
  { label: 'סקירת פריטים' },
  { label: 'אישור קבלה' },
];

export default function TrusteeWizardPage() {
  const { deliveryId } = useParams<{ deliveryId: string }>();
  const [delivery, setDelivery] = useState<api.Delivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [step, setStep] = useState(0);
  const [qtyMap, setQtyMap] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!deliveryId) return;
    api.deliveries.getPublic(deliveryId)
      .then((d) => {
        setDelivery(d);
        const init: Record<string, number> = {};
        (d.deliveryLines ?? []).forEach((l) => { init[l.id] = l.qtyReceived; });
        setQtyMap(init);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'שגיאה בטעינת אספקה'))
      .finally(() => setLoading(false));
  }, [deliveryId]);

  const handleSubmit = async () => {
    if (!delivery || !deliveryId) return;
    setSubmitting(true);
    setError('');
    try {
      for (const line of delivery.deliveryLines ?? []) {
        if (qtyMap[line.id] !== line.qtyReceived) {
          await api.deliveries.updateLine(deliveryId, line.id, {
            qtyInventory: qtyMap[line.id] ?? 0,
            version: line.version,
          });
        }
      }
      setDone(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'שגיאה באישור קבלה');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="trustee-loading">
        <div className="trustee-spinner" />
        <p style={{ color: 'var(--color-muted)', fontSize: 'var(--font-size-sm)' }}>טוען פרטי אספקה...</p>
      </div>
    );
  }

  // ── Done ──
  if (done) {
    return (
      <div className="trustee-done">
        <div className="trustee-done__check">✅</div>
        <h1 className="trustee-done__title">האספקה אושרה!</h1>
        <p className="trustee-done__sub">הקבלה נרשמה בהצלחה. תודה על עבודתך!</p>
        {delivery && (
          <div className="trustee-done__ref">
            <span>אספקה:</span>
            <strong dir="ltr">{delivery.reference}</strong>
          </div>
        )}
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-muted)', marginTop: '0.25rem' }}>
          ניתן לסגור את החלון
        </p>
      </div>
    );
  }

  // ── Not found ──
  if (!delivery) {
    return (
      <div className="trustee-error">
        <span style={{ fontSize: '3rem' }}>⚠️</span>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text)' }}>אספקה לא נמצאה</h2>
        <p style={{ color: 'var(--color-muted)', fontSize: 'var(--font-size-sm)' }}>
          {error || 'לא נמצאה אספקה. נא לבדוק את הקישור.'}
        </p>
      </div>
    );
  }

  return (
    <MobileShell
      header={
        <div className="trustee-header">
          <h1 className="trustee-header__title">
            🏷️ קבלת אספקה — נאמן
          </h1>
          <div className="trustee-header__meta">
            <span className="trustee-header__ref" dir="ltr">{delivery.reference}</span>
            <StatusChip status={delivery.status} />
          </div>
          <Stepper steps={STEPS} currentStep={step} />
        </div>
      }
      footer={
        <div className="trustee-footer">
          {step > 0 && (
            <Button variant="secondary" onClick={() => setStep((s) => s - 1)} disabled={submitting}>
              → הקודם
            </Button>
          )}
          <div style={{ flex: 1 }} />
          {step === 0 && (
            <Button variant="primary" onClick={() => setStep(1)}>
              הבא — אישור קבלה ←
            </Button>
          )}
          {step === 1 && (
            <Button variant="primary" onClick={handleSubmit} loading={submitting}>
              אשר קבלה ✓
            </Button>
          )}
        </div>
      }
    >
      {/* Error */}
      {error && (
        <div style={{ padding: '0.75rem 1rem', background: 'var(--color-danger-100)', border: '1px solid rgba(220,56,56,.2)', borderRadius: 'var(--radius-md)', color: 'var(--color-danger-700)', fontSize: 'var(--font-size-sm)', marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
          <span style={{ flexShrink: 0 }}>⚠️</span>
          <span style={{ flex: 1 }}>{error}</span>
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, color: 'inherit', minHeight: 'auto', minWidth: 'auto', padding: 0 }}>✕</button>
        </div>
      )}

      {/* ── STEP 0: Review items ── */}
      {step === 0 && (
        <div className="trustee-step">
          <h2 className="trustee-step__title">פרטי הספק</h2>

          {delivery.contact && (
            <div className="trustee-contact-card">
              <div className="trustee-contact-row">
                <span className="trustee-contact-label">איש קשר:</span>
                <span>{delivery.contact.contactName}</span>
              </div>
              <div className="trustee-contact-row">
                <span className="trustee-contact-label">טלפון:</span>
                <a href={`tel:${delivery.contact.contactPhone}`} style={{ color: 'var(--color-primary-600)' }}>
                  {delivery.contact.contactPhone}
                </a>
              </div>
              {delivery.contact.note && (
                <div className="trustee-contact-row">
                  <span className="trustee-contact-label">הערה:</span>
                  <span>{delivery.contact.note}</span>
                </div>
              )}
            </div>
          )}

          <h2 className="trustee-step__title" style={{ marginTop: '1.5rem' }}>פריטים שהוזמנו</h2>

          {(delivery.deliveryLines ?? []).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-muted)', fontSize: 'var(--font-size-sm)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
              אין פריטים בדיווח זה
            </div>
          ) : (
            <div className="trustee-lines">
              {(delivery.deliveryLines ?? []).map((line) => (
                <div key={line.id} className="trustee-line">
                  <div className="trustee-line__name">{line.rawName}</div>
                  <div className="trustee-line__qty">
                    <span className="trustee-line__qty-label">לפי חשבונית:</span>
                    <span className="trustee-line__qty-val">{line.qtyInvoice}</span>
                  </div>
                  <div className="trustee-line__qty">
                    <span className="trustee-line__qty-label">כמות שנספרה:</span>
                    <input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      className="trustee-line__input"
                      value={qtyMap[line.id] ?? 0}
                      onChange={(e) => setQtyMap((p) => ({ ...p, [line.id]: Number(e.target.value) }))}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Invoice media */}
          {(delivery.media ?? []).length > 0 && (
            <div style={{ marginTop: '1.5rem' }}>
              <h2 className="trustee-step__title">תמונות חשבונית</h2>
              <div className="trustee-media-grid">
                {(delivery.media ?? []).map((dm) => (
                  <div key={dm.mediaId} className="trustee-media-item">
                    {dm.media.storageKey ? (
                      <a href={`/uploads/${dm.media.storageKey}`} target="_blank" rel="noopener noreferrer">
                        <img src={`/uploads/${dm.media.storageKey}`} alt="חשבונית" className="trustee-media-img" />
                      </a>
                    ) : (
                      <div className="trustee-media-placeholder">
                        <span>📄</span>
                        <span>{dm.media.originalFilename}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 1: Confirm receipt ── */}
      {step === 1 && (
        <div className="trustee-step">
          <h2 className="trustee-step__title">אישור קבלה</h2>
          <p style={{ color: 'var(--color-muted)', marginBottom: '1.25rem', fontSize: 'var(--font-size-sm)' }}>
            בדוק את הכמויות שנספרו ואשר את קבלת הסחורה.
          </p>

          <div className="trustee-summary-table">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)', background: 'var(--color-surface-2)' }}>
                  <th style={{ padding: '0.625rem 0.875rem', textAlign: 'right', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-muted)' }}>פריט</th>
                  <th style={{ padding: '0.625rem 0.875rem', textAlign: 'center', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-muted)' }}>חשבונית</th>
                  <th style={{ padding: '0.625rem 0.875rem', textAlign: 'center', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-muted)' }}>נספר</th>
                </tr>
              </thead>
              <tbody>
                {(delivery.deliveryLines ?? []).map((line) => {
                  const counted = qtyMap[line.id] ?? 0;
                  const diff = counted - line.qtyInvoice;
                  return (
                    <tr key={line.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '0.625rem 0.875rem', fontWeight: 500 }}>{line.rawName}</td>
                      <td style={{ padding: '0.625rem 0.875rem', textAlign: 'center', color: 'var(--color-muted)' }}>{line.qtyInvoice}</td>
                      <td style={{ padding: '0.625rem 0.875rem', textAlign: 'center', fontWeight: 700, color: diff < 0 ? 'var(--color-danger-600)' : diff > 0 ? 'var(--color-warning-600)' : 'var(--color-success-600)' }}>
                        {counted}
                        {diff !== 0 && (
                          <span style={{ fontSize: '0.75rem', marginRight: '0.25rem', opacity: 0.75 }}>
                            ({diff > 0 ? '+' : ''}{diff})
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Info note */}
          <div style={{ marginTop: '1.25rem', padding: '0.875rem 1rem', background: 'var(--color-info-100)', border: '1px solid rgba(46,114,210,.15)', borderRadius: 'var(--radius-md)', color: 'var(--color-info-700)', fontSize: 'var(--font-size-sm)', display: 'flex', gap: '0.5rem' }}>
            <span style={{ flexShrink: 0 }}>ℹ️</span>
            <span>לאחר האישור, הנתונים יועברו למנהל לבדיקה סופית.</span>
          </div>
        </div>
      )}
    </MobileShell>
  );
}
