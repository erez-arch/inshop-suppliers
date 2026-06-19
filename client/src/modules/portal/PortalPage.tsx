import React from 'react';
import './portal.css';

export default function PortalPage() {
  return (
    <div className="portal-page">
      <div className="portal-card">
        <span className="portal-logo">🏪</span>
        <h1 className="portal-title">INSHOP ספקים</h1>
        <p className="portal-sub">פורטל ספקים</p>

        <div className="portal-actions">
          <a href="/supplier-wizard" className="portal-action-card">
            <span className="portal-action-icon">📦</span>
            <span className="portal-action-label">דווח על אספקה</span>
            <span className="portal-action-hint">ספק יקר — כאן תוכל לדווח על משלוח חדש</span>
          </a>
        </div>

        <p className="portal-footer-text text-secondary text-sm">
          לבעיות ופניות: צור קשר עם מנהל המערכת
        </p>
      </div>
    </div>
  );
}
