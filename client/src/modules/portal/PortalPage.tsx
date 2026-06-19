import React, { useState } from 'react';
import './portal.css';

type ActiveTab = 'deliveries' | 'payments' | 'credits';

export default function PortalPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('deliveries');

  return (
    <div className="portal-page">
      {/* ── Header ──────────────────────────────────────────── */}
      <header className="portal-header">
        <div className="portal-header__inner">
          <div className="portal-brand">
            <div className="portal-brand-mark" aria-hidden="true">IS</div>
            <div>
              <span className="portal-brand-name">INSHOP</span>
              <span className="portal-brand-sub">פורטל ספקים</span>
            </div>
          </div>

          <a href="/supplier-wizard" className="portal-header__cta">
            + דיווח אספקה חדשה
          </a>
        </div>
      </header>

      {/* ── Page Content ────────────────────────────────────── */}
      <main className="portal-main">

        {/* Hero */}
        <div className="portal-hero">
          <div className="portal-hero__icon" aria-hidden="true">👋</div>
          <h1 className="portal-hero__title">ברוך הבא, ספק יקר</h1>
          <p className="portal-hero__sub">
            כאן תוכל לדווח על אספקות, לצפות בזיכויים ולנהל את חשבונך
          </p>
        </div>

        {/* KPI Cards */}
        <div className="portal-kpi-grid">
          <div className="portal-kpi-card portal-kpi-card--primary">
            <div className="portal-kpi-card__icon">💰</div>
            <div className="portal-kpi-card__value">—</div>
            <div className="portal-kpi-card__label">יתרה נוכחית</div>
          </div>
          <div className="portal-kpi-card portal-kpi-card--warning">
            <div className="portal-kpi-card__icon">📋</div>
            <div className="portal-kpi-card__value">—</div>
            <div className="portal-kpi-card__label">זיכויים פתוחים</div>
          </div>
          <div className="portal-kpi-card portal-kpi-card--success">
            <div className="portal-kpi-card__icon">📦</div>
            <div className="portal-kpi-card__value">—</div>
            <div className="portal-kpi-card__label">אספקות החודש</div>
          </div>
          <div className="portal-kpi-card portal-kpi-card--info">
            <div className="portal-kpi-card__icon">💳</div>
            <div className="portal-kpi-card__value">—</div>
            <div className="portal-kpi-card__label">תשלומים החודש</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="portal-actions-section">
          <h2 className="portal-section-title">פעולות מהירות</h2>
          <div className="portal-actions-grid">
            <a href="/supplier-wizard" className="portal-action-card portal-action-card--primary">
              <div className="portal-action-card__icon">📦</div>
              <div className="portal-action-card__content">
                <span className="portal-action-card__label">דיווח על אספקה</span>
                <span className="portal-action-card__hint">
                  צלם חשבונית ושלח דיווח על משלוח חדש שהגיע לסניף
                </span>
              </div>
              <div className="portal-action-card__arrow" aria-hidden="true">←</div>
            </a>

            <div className="portal-action-card portal-action-card--coming-soon">
              <div className="portal-action-card__icon">📋</div>
              <div className="portal-action-card__content">
                <span className="portal-action-card__label">זיכויים</span>
                <span className="portal-action-card__hint">
                  צפה בדרישות זיכוי פתוחות והעלה מסמכי זיכוי
                </span>
              </div>
              <span className="portal-coming-badge">בקרוב</span>
            </div>

            <div className="portal-action-card portal-action-card--coming-soon">
              <div className="portal-action-card__icon">💳</div>
              <div className="portal-action-card__content">
                <span className="portal-action-card__label">תשלומים</span>
                <span className="portal-action-card__hint">
                  צפה בהיסטוריית תשלומים ויתרת חשבון
                </span>
              </div>
              <span className="portal-coming-badge">בקרוב</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="portal-tabs-section">
          <div className="portal-tabs">
            <button
              className={`portal-tab ${activeTab === 'deliveries' ? 'portal-tab--active' : ''}`}
              onClick={() => setActiveTab('deliveries')}
            >
              📦 אספקות
            </button>
            <button
              className={`portal-tab ${activeTab === 'payments' ? 'portal-tab--active' : ''}`}
              onClick={() => setActiveTab('payments')}
            >
              💳 תשלומים
            </button>
            <button
              className={`portal-tab ${activeTab === 'credits' ? 'portal-tab--active' : ''}`}
              onClick={() => setActiveTab('credits')}
            >
              📋 זיכויים
            </button>
          </div>

          <div className="portal-tab-content">
            {activeTab === 'deliveries' && (
              <div className="portal-tab-pane">
                <div className="empty-state">
                  <span className="empty-state__icon">📭</span>
                  <span className="empty-state__title">אין אספקות להצגה</span>
                  <span className="empty-state__sub">פנה למנהל המערכת לגישה לנתונים</span>
                </div>
              </div>
            )}
            {activeTab === 'payments' && (
              <div className="portal-tab-pane">
                <div className="empty-state">
                  <span className="empty-state__icon">💳</span>
                  <span className="empty-state__title">אין תשלומים להצגה</span>
                  <span className="empty-state__sub">פנה למנהל המערכת לגישה לנתוני תשלומים</span>
                </div>
              </div>
            )}
            {activeTab === 'credits' && (
              <div className="portal-tab-pane">
                <div className="empty-state">
                  <span className="empty-state__icon">📋</span>
                  <span className="empty-state__title">אין זיכויים להצגה</span>
                  <span className="empty-state__sub">דרישות זיכוי יופיעו כאן בקרוב</span>
                </div>
              </div>
            )}
          </div>
        </div>

      </main>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="portal-footer">
        <p>לבעיות ופניות: צור קשר עם מנהל המערכת</p>
      </footer>

      {/* ── Mobile sticky CTA ───────────────────────────────── */}
      <div className="portal-mobile-cta">
        <a href="/supplier-wizard" className="portal-mobile-cta__btn">
          📦 העלה מסמך / דיווח אספקה חדשה
        </a>
      </div>
    </div>
  );
}
