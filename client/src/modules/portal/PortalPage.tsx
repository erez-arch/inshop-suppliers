import React from 'react';
import './portal.css';

export default function PortalPage() {
  return (
    <div className="portal-page">
      {/* Top brand bar */}
      <div className="portal-topbar">
        <div className="portal-brand">
          <div className="portal-brand-mark" aria-hidden="true">🏪</div>
          <div>
            <span className="portal-brand-name">INSHOP</span>
            <span className="portal-brand-sub">פורטל ספקים</span>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="portal-hero">
        <h1 className="portal-hero__title">ספק יקר, ברוך הבא</h1>
        <p className="portal-hero__sub">
          כאן תוכל לדווח על אספקות, לצפות בזיכויים ולנהל את חשבונך
        </p>
      </div>

      {/* KPI cards */}
      <div className="kpi-grid" style={{ width: '100%', maxWidth: 900, gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', marginBottom: '2.5rem' }}>
        <div className="kpi-card kpi-card--primary">
          <div className="kpi-card__accent" />
          <span className="kpi-card__icon">📦</span>
          <div className="kpi-card__value">—</div>
          <div className="kpi-card__label">אספקות בחודש</div>
        </div>
        <div className="kpi-card kpi-card--warning">
          <div className="kpi-card__accent" />
          <span className="kpi-card__icon">📋</span>
          <div className="kpi-card__value">—</div>
          <div className="kpi-card__label">זיכויים פתוחים</div>
        </div>
        <div className="kpi-card kpi-card--success">
          <div className="kpi-card__accent" />
          <span className="kpi-card__icon">💳</span>
          <div className="kpi-card__value">—</div>
          <div className="kpi-card__label">תשלומים בחודש</div>
        </div>
        <div className="kpi-card kpi-card--info">
          <div className="kpi-card__accent" />
          <span className="kpi-card__icon">💰</span>
          <div className="kpi-card__value">—</div>
          <div className="kpi-card__label">יתרה נוכחית</div>
        </div>
      </div>

      {/* Action cards */}
      <div className="portal-actions">
        <a href="/supplier-wizard" className="portal-action-card">
          <span className="portal-action-icon">📦</span>
          <span className="portal-action-label">דיווח על אספקה</span>
          <span className="portal-action-hint">
            ספק יקר — כאן תוכל לדווח על משלוח חדש שהגיע לסניף. תצלם חשבונית ותשלח.
          </span>
        </a>

        <div
          className="portal-action-card"
          style={{ opacity: 0.6, cursor: 'default' }}
          title="בקרוב"
        >
          <span className="portal-action-icon">📋</span>
          <span className="portal-action-label">זיכויים</span>
          <span className="portal-action-hint">
            צפה בדרישות זיכוי פתוחות והעלה מסמכי זיכוי. בקרוב.
          </span>
          <span className="badge badge-gray" style={{ alignSelf: 'flex-start', marginTop: '0.25rem' }}>בקרוב</span>
        </div>

        <div
          className="portal-action-card"
          style={{ opacity: 0.6, cursor: 'default' }}
          title="בקרוב"
        >
          <span className="portal-action-icon">💳</span>
          <span className="portal-action-label">תשלומים</span>
          <span className="portal-action-hint">
            צפה בהיסטוריית תשלומים ויתרת חשבון. בקרוב.
          </span>
          <span className="badge badge-gray" style={{ alignSelf: 'flex-start', marginTop: '0.25rem' }}>בקרוב</span>
        </div>
      </div>

      {/* Footer */}
      <div className="portal-footer-text">
        לבעיות ופניות: צור קשר עם מנהל המערכת
      </div>
    </div>
  );
}
