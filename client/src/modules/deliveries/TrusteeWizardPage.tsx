import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MobileShell } from '../../components/MobileLayout/MobileShell';
import { Stepper } from '../../components/ui/Stepper';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
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
      // Update each line with received quantity
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

  if (loading) {
    return (
      <div className="trustee-loading">
        <div className="trustee-spinner" />
        <p>טוען פרטי אספקה...</p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="trustee-done">
        <div className="trustee-done__icon">✅</div>
        <h1 className="trustee-done__title">האספקה אושרה!</h1>
        <p className="trustee-done__sub">הקבלה נרשמה בהצלחה. תודה!</p>
        {delivery && <p className="trustee-done__ref">אספקה: <strong>{delivery.reference}</strong></p>}
      </div>
    );
  }

  if (!delivery) {
    return (
      <div className="trustee-error">
        <Alert type="error">לא נמצאה אספקה. נא לבדוק את הקישור.</Alert>
      </div>
    );
  }

  return (
    <MobileShell
      header={
        <div className="trustee-header">
          <h1 className="trustee-header__title">קבלת אספקה — נאמן</h1>
          <div className="trustee-header__meta">
            <span className="trustee-header__ref">{delivery.reference}</span>
            <StatusChip status={delivery.status} />
          </div>
          <Stepper steps={STEPS} currentStep={step} />
        </div>
      }
      footer={
        <div className="trustee-footer">
          {step > 0 && (
            <Button variant="secondary" onClick={() => setStep((s) => s - 1)} disabled={submitting}>
              הקודם
            </Button>
          )}
          <div style={{ flex: 1 }} />
          {step === 0 && (
            <Button onClick={() => setStep(1)}>
              הבא — אישור קבלה
            </Button>
          )}
          {step === 1 && (
            <Button variant="primary" onClick={handleSubmit} loading={submitting}>
              אשר קבלה
            </Button>
          )}
        </div>
      }
    >
      {error && (
        <div style={{ marginBottom: '1rem' }}>
          <Alert type="error" onClose={() => setError('')}>{error}</Alert>
        </div>
      )}

      {/* Step 0: Review items */}
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
                <a href={`tel:${delivery.contact.contactPhone}`}>{delivery.contact.contactPhone}</a>
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
            <p style={{ color: 'var(--color-text-secondary)' }}>אין פריטים בדיווח זה.</p>
          ) : (
            <div className="trustee-lines">
              {(delivery.deliveryLines ?? []).map((line) => (
                <div key={line.id} className="trustee-line">
                  <div className="trustee-line__name">{line.rawName}</div>
                  <div className="trustee-line__qty">
                    <span className="trustee-line__qty-label">חשבונית:</span>
                    <span className="trustee-line__qty-val">{line.qtyInvoice}</span>
                  </div>
                  <div className="trustee-line__qty">
                    <span className="trustee-line__qty-label">לספירת מלאי:</span>
                    <input
                      type="number"
                      min={0}
                      className="trustee-line__input"
                      value={qtyMap[line.id] ?? 0}
                      onChange={(e) => setQtyMap((p) => ({ ...p, [line.id]: Number(e.target.value) }))}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Show invoices / media if present */}
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
                      <div className="trustee-media-placeholder">📄 {dm.media.originalFilename}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 1: Confirm receipt */}
      {step === 1 && (
        <div className="trustee-step">
          <h2 className="trustee-step__title">אישור קבלה</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
            בדוק את הכמויות שנספרו ואשר את קבלת הסחורה.
          </p>

          <div className="trustee-summary-table">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>פריט</th>
                  <th style={{ padding: '0.5rem', textAlign: 'center' }}>חשבונית</th>
                  <th style={{ padding: '0.5rem', textAlign: 'center' }}>נספר</th>
                </tr>
              </thead>
              <tbody>
                {(delivery.deliveryLines ?? []).map((line) => {
                  const diff = (qtyMap[line.id] ?? 0) - line.qtyInvoice;
                  return (
                    <tr key={line.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '0.5rem' }}>{line.rawName}</td>
                      <td style={{ padding: '0.5rem', textAlign: 'center' }}>{line.qtyInvoice}</td>
                      <td style={{ padding: '0.5rem', textAlign: 'center', color: diff < 0 ? 'var(--color-danger)' : diff > 0 ? 'var(--color-warning)' : 'inherit' }}>
                        {qtyMap[line.id] ?? 0}
                        {diff !== 0 && (
                          <span style={{ fontSize: '0.75rem', marginRight: '0.25rem' }}>
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

          <div style={{ marginTop: '1.5rem' }}>
            <Alert type="info">
              לאחר האישור, הנתונים יועברו למנהל לבדיקה סופית.
            </Alert>
          </div>
        </div>
      )}
    </MobileShell>
  );
}
