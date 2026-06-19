import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../../services/api';
import './AdminLayout.css';

interface NavItem {
  to: string;
  label: string;
  icon: string;
  section?: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/admin/deliveries', label: 'אספקות',      icon: '📦',  section: 'ניהול' },
  { to: '/admin/payments',   label: 'תשלומים',     icon: '💳',  section: 'ניהול' },
  { to: '/admin/order-rules',label: 'חוקי הזמנה', icon: '📋',  section: 'ניהול' },
  { to: '/admin/suppliers',  label: 'ספקים',       icon: '🏭',  section: 'מאסטר' },
  { to: '/admin/branches',   label: 'סניפים',      icon: '🏪',  section: 'מאסטר' },
  { to: '/admin/items',      label: 'פריטים',      icon: '📊',  section: 'מאסטר' },
  { to: '/admin/trustees',   label: 'נאמנים',      icon: '👤',  section: 'מאסטר' },
  { to: '/admin/inventory',  label: 'מלאי',        icon: '🗂️', section: 'מאסטר' },
  { to: '/portal',           label: 'פורטל ספק',  icon: '🔗',  section: 'קישורים' },
];

const PAGE_TITLES: Record<string, string> = {
  '/admin/deliveries':  'אספקות',
  '/admin/payments':    'תשלומים לספקים',
  '/admin/order-rules': 'חוקי הזמנה',
  '/admin/suppliers':   'ספקים',
  '/admin/branches':    'סניפים',
  '/admin/items':       'פריטים',
  '/admin/trustees':    'נאמנים',
  '/admin/inventory':   'ניהול מלאי',
  '/portal':            'פורטל ספק',
};

interface AdminLayoutProps {
  user: { displayName: string; roles: string[] };
  onLogout: () => void;
}

export function AdminLayout({ user, onLogout }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await auth.logout();
    } finally {
      onLogout();
      navigate('/login');
    }
  };

  // Derive page title from current path
  const pageTitle =
    Object.entries(PAGE_TITLES).find(([path]) =>
      location.pathname.startsWith(path)
    )?.[1] ?? 'INSHOP';

  const initials = user.displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // Group nav items by section
  const sections = NAV_ITEMS.reduce<Record<string, NavItem[]>>((acc, item) => {
    const key = item.section ?? '';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <div
      className={`admin-layout ${sidebarOpen ? 'admin-layout--sidebar-open' : 'admin-layout--collapsed'}`}
    >
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="admin-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className="admin-sidebar" aria-label="ניווט ראשי">
        {/* Brand */}
        <div className="admin-sidebar__brand">
          <div className="admin-sidebar__logo-mark" aria-hidden="true">IS</div>
          {sidebarOpen && (
            <div className="admin-sidebar__brand-text">
              <span className="admin-sidebar__brand-name">INSHOP</span>
              <span className="admin-sidebar__brand-sub">מערכת ניהול ספקים</span>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="admin-sidebar__nav">
          {Object.entries(sections).map(([sectionName, items]) => (
            <div key={sectionName} className="admin-nav-section">
              {sidebarOpen && sectionName && (
                <div className="admin-nav-section__label">{sectionName}</div>
              )}
              {items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `admin-nav-item ${isActive ? 'admin-nav-item--active' : ''}`
                  }
                  title={!sidebarOpen ? item.label : undefined}
                >
                  <span className="admin-nav-item__icon" aria-hidden="true">
                    {item.icon}
                  </span>
                  {sidebarOpen && (
                    <span className="admin-nav-item__label">{item.label}</span>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="admin-sidebar__footer">
          <div className="admin-sidebar__user-card">
            <div className="admin-sidebar__avatar" aria-hidden="true">
              {initials}
            </div>
            {sidebarOpen && (
              <div className="admin-sidebar__user-info">
                <span className="admin-sidebar__user-name">{user.displayName}</span>
                <span className="admin-sidebar__user-role">
                  {user.roles.includes('admin') ? 'מנהל מערכת' : user.roles[0] ?? ''}
                </span>
              </div>
            )}
            <button
              className="admin-sidebar__logout"
              onClick={handleLogout}
              aria-label="התנתק מהמערכת"
              title="התנתק"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* ── Topbar ──────────────────────────────────────────── */}
      <header className="admin-topbar">
        <button
          className="admin-topbar__toggle"
          onClick={() => setSidebarOpen((v) => !v)}
          aria-label="פתח/סגור תפריט"
          aria-expanded={sidebarOpen}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>

        <h1 className="admin-topbar__page-title">{pageTitle}</h1>

        <div className="admin-topbar__actions">
          <NavLink
            to="/supplier-wizard"
            className="admin-topbar__link"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span aria-hidden="true">📦</span>
            דיווח אספקה
          </NavLink>

          <div className="admin-topbar__user-chip" role="button" tabIndex={0} aria-label={user.displayName}>
            <div className="admin-topbar__user-avatar">{initials}</div>
            <span className="admin-topbar__user-name">{user.displayName}</span>
          </div>

          <button
            className="admin-topbar__logout-btn"
            onClick={handleLogout}
            aria-label="התנתק מהמערכת"
            title="התנתק"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span className="admin-topbar__logout-label">יציאה</span>
          </button>
        </div>
      </header>

      {/* ── Main content ─────────────────────────────────────── */}
      <main className="admin-main" id="main-content">
        <Outlet />
      </main>
    </div>
  );
}
