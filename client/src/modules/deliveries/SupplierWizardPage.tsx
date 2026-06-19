import React, { useState, useRef } from 'react';
import { MobileShell } from '../../components/MobileLayout/MobileShell';
import { Stepper } from '../../components/ui/Stepper';
import { Button } from '../../components/ui/Button';
import * as api from '../../services/api';
import './supplier-wizard.css';

const STEPS = [
  { label: 'פרטי קשר' },
  { label: 'חשבונית' },
  { label: 'אישור ושליחה' },
];

type Step = 0 | 1 | 2 | 3; // 3 = done

interface ContactForm {
  supplierName: string;
  contactName: string;
  contactPhone: string;
  branchNote: string;
}

export default function SupplierWizardPage() {
  const [step, setStep] = useState<Step>(0);
  const [delivery, setDelivery] = useState<api.Delivery | null>(null);
  const [contact, setContact] = useState<ContactForm>({
    supplierName: '',
    contactName: '',
    contactPhone: '',
    branchNote: '',
  });
  const [media, setMedia] = useState<api.MediaObject[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleContactNext = async () => {
    if (!contact.contactName || !contact.contactPhone) {
      setError('נא למלא שם ומספר טלפון');
      return;
    }
    setLoading(true);
    setError('');
    try {
      let d = delivery;
      if (!d) {
        d = await api.deliveries.createPublic();
        setDelivery(d);
      }
      await api.deliveries.updateDraft(d.id, {
        contactName: contact.contactName,
        contactPhone: contact.contactPhone,
        supplierName: contact.supplierName,
        note: contact.branchNote,
      });
      setStep(1);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'שגיאה ביצירת דיווח');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (files: FileList) => {
    if (!delivery) return;
    setUploading(true);
    setError('');
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fd = new FormData();
        fd.append('file', file);
        fd.append('mediaType', 'invoice_photo');
        const result = await api.deliveries.uploadMedia(delivery.id, fd);
        setMedia((prev) => [...prev, result.media]);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'שגיאה בהעלאת תמונה');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!delivery) return;
    setSubmitting(true);
    setError('');
    try {
      const d = await api.deliveries.getPublic(delivery.id);
      await api.deliveries.submit(delivery.id, d.version);
      setStep(3);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'שגיאה בשליחת הדיווח');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success screen ──
  if (step === 3) {
    return (
      <div className="wizard-done">
        <div className="wizard-done__check">✅</div>
        <h1 className="wizard-done__title">הדיווח נשלח בהצלחה!</h1>
        <p className="wizard-done__sub">
          תודה על הדיווח. הנאמן בסניף יקבל הודעה ויקלוט את האספקה בקרוב.
        </p>
        {delivery?.reference && (
          <div className="wizard-done__ref">
            <span>מספר דיווח:</span>
            <strong dir="ltr">{delivery.reference}</strong>
          </div>
        )}
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-muted)', marginTop: '0.25rem' }}>
          ניתן לסגור את החלון
        </p>
        <Button
          variant="secondary"
          onClick={() => {
            setStep(0);
            setDelivery(null);
            setContact({ supplierName: '', contactName: '', contactPhone: '', branchNote: '' });
            setMedia([]);
          }}
          style={{ marginTop: '0.5rem' }}
        >
          שלח דיווח נוסף
        </Button>
      </div>
    );
  }

  return (
    <MobileShell
      header={
        <div className="wizard-header">
          <div className="wizard-header__title">
            <span className="wizard-header__title-icon">📦</span>
            דיווח אספקה
          </div>
          <Stepper steps={STEPS} currentStep={step} />
        </div>
      }
      footer={
        <div className="wizard-footer">
          {step > 0 && step < 3 && (
            <Button variant="secondary" onClick={() => setStep((s) => (s - 1) as Step)} disabled={uploading || submitting}>
              → הקודם
            </Button>
          )}
          {step === 0 && (
            <Button variant="primary" onClick={handleContactNext} loading={loading} style={{ flex: 1 }}>
              הבא ←
            </Button>
          )}
          {step === 1 && (
            <Button variant="primary" onClick={() => setStep(2)} disabled={uploading} style={{ flex: 1 }}>
              הבא ←
            </Button>
          )}
          {step === 2 && (
            <Button variant="primary" onClick={handleSubmit} loading={submitting} style={{ flex: 1 }}>
              שלח דיווח ✓
            </Button>
          )}
        </div>
      }
    >
      {/* Error */}
      {error && (
        <div style={{ padding: '0.75rem 1rem', background: 'var(--color-danger-100)', border: '1px solid rgba(220,56,56,.2)', borderRadius: 'var(--radius-md)', color: 'var(--color-danger-700)', fontSize: 'var(--font-size-sm)', marginBottom: '1rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
          <span style={{ flexShrink: 0, marginTop: 1 }}>⚠️</span>
          <span>{error}</span>
          <button onClick={() => setError('')} style={{ marginRight: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 700, minHeight: 'auto', minWidth: 'auto', padding: 0 }}>✕</button>
        </div>
      )}

      {/* ── STEP 0: Contact info ── */}
      {step === 0 && (
        <div className="wizard-step">
          <h2 className="wizard-step__title">ספק יקר, ברוך הבא!</h2>
          <p className="wizard-step__sub">
            אנחנו שמחים לקבל את האספקה שלך. נא למלא את פרטי הקשר.
          </p>

          <div className="wiz-form">
            <div className="wiz-form__group">
              <label className="wiz-form__label">שם הספק (אם ידוע)</label>
              <input
                type="text"
                className="wiz-form__input"
                placeholder="למשל: תנובה, אסם..."
                value={contact.supplierName}
                onChange={(e) => setContact((p) => ({ ...p, supplierName: e.target.value }))}
              />
            </div>
            <div className="wiz-form__group">
              <label className="wiz-form__label">
                שם איש קשר <span className="wiz-form__required">*</span>
              </label>
              <input
                type="text"
                className="wiz-form__input"
                placeholder="שם מלא"
                value={contact.contactName}
                onChange={(e) => setContact((p) => ({ ...p, contactName: e.target.value }))}
                autoComplete="name"
              />
            </div>
            <div className="wiz-form__group">
              <label className="wiz-form__label">
                מספר טלפון <span className="wiz-form__required">*</span>
              </label>
              <input
                type="tel"
                className="wiz-form__input"
                placeholder="050-0000000"
                value={contact.contactPhone}
                onChange={(e) => setContact((p) => ({ ...p, contactPhone: e.target.value }))}
                autoComplete="tel"
                inputMode="tel"
                dir="ltr"
              />
            </div>
            <div className="wiz-form__group">
              <label className="wiz-form__label">הערה לסניף (אופציונלי)</label>
              <textarea
                className="wiz-form__input wiz-form__textarea"
                placeholder="פרטים נוספים, בעיות, הערות..."
                value={contact.branchNote}
                onChange={(e) => setContact((p) => ({ ...p, branchNote: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 1: Upload invoice photos ── */}
      {step === 1 && (
        <div className="wizard-step">
          <h2 className="wizard-step__title">צלם את החשבונית</h2>
          <p className="wizard-step__sub">
            יש לצלם את החשבונית בצורה ברורה וקריאה. ניתן להוסיף מספר תמונות.
          </p>

          <div
            className="upload-zone"
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            aria-label="לחץ לצילום חשבונית"
            onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
          >
            {uploading ? (
              <div className="upload-zone__loading">
                <div className="spinner" style={{ width: 36, height: 36 }} />
                <span>מעלה תמונה...</span>
              </div>
            ) : (
              <>
                <span className="upload-zone__icon">📷</span>
                <span className="upload-zone__text">לחץ לצילום / העלאת תמונה</span>
                <span className="upload-zone__hint">JPG, PNG, HEIC, PDF — עד 10MB</span>
                <span className="upload-zone__cta">
                  📷 צלם חשבונית
                </span>
              </>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            style={{ display: 'none' }}
            onChange={(e) => e.target.files && handleUpload(e.target.files)}
          />

          {media.length > 0 && (
            <div className="upload-previews">
              <div className="upload-previews__title">✓ הועלו {media.length} תמונות</div>
              <div className="upload-previews__grid">
                {media.map((m, i) => (
                  <div key={m.id} className="upload-preview">
                    {m.storageKey ? (
                      <img
                        src={`/uploads/${m.storageKey}`}
                        alt={`חשבונית ${i + 1}`}
                        className="upload-preview__img"
                      />
                    ) : (
                      <div className="upload-preview__placeholder">
                        <span>📄</span>
                        <span>{m.originalFilename ?? `תמונה ${i + 1}`}</span>
                      </div>
                    )}
                    <span className="upload-preview__label">✓ הועלה</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI info */}
          <div className="wizard-ai-info">
            <span className="wizard-ai-info__icon">🤖</span>
            <span>
              המערכת תזהה אוטומטית ספק, מספר חשבונית, תאריך וסכום מתוך התמונה.
              ניתן לתקן ידנית לאחר העלאה.
            </span>
          </div>
        </div>
      )}

      {/* ── STEP 2: Summary & submit ── */}
      {step === 2 && (
        <div className="wizard-step">
          <h2 className="wizard-step__title">סיכום ואישור</h2>
          <p className="wizard-step__sub">
            בדוק את הפרטים לפני השליחה. לאחר השליחה הנאמן יקבל הודעה.
          </p>

          <div className="summary-card">
            {[
              { label: 'שם ספק', value: contact.supplierName || '—' },
              { label: 'איש קשר', value: contact.contactName },
              { label: 'טלפון', value: contact.contactPhone },
              ...(contact.branchNote ? [{ label: 'הערה', value: contact.branchNote }] : []),
              { label: 'תמונות חשבונית', value: `${media.length} תמונות` },
            ].map((row, i) => (
              <div key={i} className="summary-row">
                <span className="summary-label">{row.label}</span>
                <span className="summary-value">{row.value}</span>
              </div>
            ))}
          </div>

          <div style={{ padding: '0.875rem 1rem', background: 'var(--color-info-100)', border: '1px solid rgba(46,114,210,.15)', borderRadius: 'var(--radius-md)', color: 'var(--color-info-700)', fontSize: 'var(--font-size-sm)', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
            <span style={{ flexShrink: 0 }}>ℹ️</span>
            <span>בלחיצה על "שלח דיווח" תאשר שהסחורה הושארה בסניף שנבחר.</span>
          </div>
        </div>
      )}
    </MobileShell>
  );
}
