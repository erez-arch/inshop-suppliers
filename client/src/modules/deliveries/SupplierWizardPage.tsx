import React, { useState, useRef } from 'react';
import { MobileShell } from '../../components/MobileLayout/MobileShell';
import { Stepper } from '../../components/ui/Stepper';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import * as api from '../../services/api';
import './supplier-wizard.css';

const STEPS = [
  { label: 'פרטי ספק' },
  { label: 'תמונות חשבונית' },
  { label: 'סיכום ושליחה' },
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

  // Step 0: Create delivery and fill contact info
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

  // Step 1: Upload invoice images
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

  // Step 2: Submit
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

  if (step === 3) {
    return (
      <div className="wizard-done">
        <div className="wizard-done__icon">✅</div>
        <h1 className="wizard-done__title">הדיווח נשלח בהצלחה!</h1>
        <p className="wizard-done__sub">תודה על הדיווח. המנהל יבדוק ויאשר את האספקה בקרוב.</p>
        <p className="wizard-done__ref">מספר דיווח: <strong>{delivery?.reference}</strong></p>
        <Button onClick={() => {
          setStep(0);
          setDelivery(null);
          setContact({ supplierName: '', contactName: '', contactPhone: '', branchNote: '' });
          setMedia([]);
        }}>
          שלח דיווח נוסף
        </Button>
      </div>
    );
  }

  return (
    <MobileShell
      header={
        <div className="wizard-header">
          <h1 className="wizard-header__title">דיווח אספקה</h1>
          <Stepper steps={STEPS} currentStep={step} />
        </div>
      }
      footer={
        <div className="wizard-footer">
          {step > 0 && step < 3 && (
            <Button variant="secondary" onClick={() => setStep((s) => (s - 1) as Step)} disabled={uploading || submitting}>
              הקודם
            </Button>
          )}
          <div style={{ flex: 1 }} />
          {step === 0 && (
            <Button onClick={handleContactNext} loading={loading}>
              הבא
            </Button>
          )}
          {step === 1 && (
            <Button onClick={() => setStep(2)} disabled={uploading}>
              הבא
            </Button>
          )}
          {step === 2 && (
            <Button onClick={handleSubmit} loading={submitting}>
              שלח דיווח
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

      {/* ── STEP 0: Contact info ── */}
      {step === 0 && (
        <div className="wizard-step">
          {/* NON-NEGOTIABLE: Title MUST include "ספק יקר" */}
          <h2 className="wizard-step__title">ספק יקר, ברוך הבא!</h2>
          <p className="wizard-step__sub">אנחנו שמחים לקבל את האספקה שלך. נא למלא את הפרטים הבאים.</p>

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
              <label className="wiz-form__label">שם איש קשר <span className="wiz-form__required">*</span></label>
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
              <label className="wiz-form__label">מספר טלפון <span className="wiz-form__required">*</span></label>
              <input
                type="tel"
                className="wiz-form__input"
                placeholder="050-0000000"
                value={contact.contactPhone}
                onChange={(e) => setContact((p) => ({ ...p, contactPhone: e.target.value }))}
                autoComplete="tel"
                inputMode="tel"
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
          <h2 className="wizard-step__title">תמונות חשבונית</h2>
          <p className="wizard-step__sub">צלם את החשבונית. תוכל להוסיף מספר תמונות.</p>

          <div className="upload-zone" onClick={() => fileInputRef.current?.click()} role="button" tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}>
            {uploading ? (
              <div className="upload-zone__loading">
                <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3, borderColor: 'var(--color-border)', borderTopColor: 'var(--color-primary)' }} />
                <span>מעלה תמונה...</span>
              </div>
            ) : (
              <>
                <span className="upload-zone__icon">📷</span>
                <span className="upload-zone__text">לחץ לצילום או בחר תמונה</span>
                <span className="upload-zone__hint">JPG, PNG עד 10MB</span>
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
              <h3 className="upload-previews__title">תמונות שהועלו ({media.length})</h3>
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
                      <div className="upload-preview__placeholder">📄 {m.originalFilename ?? `תמונה ${i + 1}`}</div>
                    )}
                    <span className="upload-preview__label">✓ הועלה</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {media.length === 0 && (
            <div style={{ marginTop: '1rem' }}>
              <Alert type="info">
                אין חשבוניות? תוכל לדלג על שלב זה ולהמשיך לשליחה.
              </Alert>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 2: Summary & submit ── */}
      {step === 2 && (
        <div className="wizard-step">
          <h2 className="wizard-step__title">סיכום ואישור</h2>
          <p className="wizard-step__sub">בדוק את הפרטים לפני השליחה.</p>

          <div className="summary-card">
            <div className="summary-row">
              <span className="summary-label">שם ספק:</span>
              <span className="summary-value">{contact.supplierName || '—'}</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">איש קשר:</span>
              <span className="summary-value">{contact.contactName}</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">טלפון:</span>
              <span className="summary-value">{contact.contactPhone}</span>
            </div>
            {contact.branchNote && (
              <div className="summary-row">
                <span className="summary-label">הערה:</span>
                <span className="summary-value">{contact.branchNote}</span>
              </div>
            )}
            <div className="summary-row">
              <span className="summary-label">תמונות חשבונית:</span>
              <span className="summary-value">{media.length} תמונות</span>
            </div>
          </div>

          <Alert type="info">
            בלחיצה על "שלח דיווח" תאשר שהסחורה הושארה בסניף.
          </Alert>
        </div>
      )}
    </MobileShell>
  );
}
