import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { auth } from '../../services/api';
import './AdminLayout.css';

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/admin/deliveries', label: 'אספקות', icon: '📦' },
  { to: '/admin/suppliers', label: 'ספקים', icon: '🏭' },
  { to: '/admin/branches', label: 'סניפים', icon: '🏪' },
  { to: '/admin/items', label: 'פריטים', icon: '📋' },
  { to: '/admin/trustees', label: 'נאמנים', icon: '👤' },
  { to: '/admin/inventory', label: 'מלאי', icon: '📊' },
  { to: '/admin/order-rules', label: 'כללי הזמנה', icon: '📝' },
  { to: '/admin/payments', label: 'תשלומים', icon: '💳' },
];

interface AdminLayoutProps {
  user: { displayName: string; roles: string[] };
  onLogout: () => void;
}

export function AdminLayout({ user, onLogout }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await auth.logout();
    } finally {
      onLogout();
      navigate('/login');
    }
  };

  return (
    <div className={`admin-layout ${sidebarOpen ? 'admin-layout--sidebar-open' : ''}`}>
      {/* Sidebar */}
      <aside className="admin-sidebar" aria-label="ניווט ראשי">
        <div className="admin-sidebar__brand">
          <span className="admin-sidebar__logo">🏪</span>
          {sidebarOpen && <span className="admin-sidebar__title">INSHOP ספקים</span>}
        </div>

        <nav className="admin-sidebar__nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `admin-nav-item ${isActive ? 'admin-nav-item--active' : ''}`
              }
            >
              <span className="admin-nav-item__icon" aria-hidden="true">{item.icon}</span>
              {sidebarOpen && <span className="admin-nav-item__label">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar__footer">
          {sidebarOpen && (
            <div className="admin-sidebar__user">
              <span className="admin-sidebar__user-name">{user.displayName}</span>
              <span className="admin-sidebar__user-role text-xs text-secondary">
                {user.roles.includes('admin') ? 'מנהל' : user.roles[0] ?? ''}
              </span>
            </div>
          )}
          <button
            className="admin-sidebar__logout"
            onClick={handleLogout}
            aria-label="התנתק"
            title="התנתק"
          >
            🚪
          </button>
        </div>
      </aside>

      {/* Topbar */}
      <header className="admin-topbar">
        <button
          className="admin-topbar__toggle"
          onClick={() => setSidebarOpen((v) => !v)}
          aria-label="פתח/סגור תפריט"
          aria-expanded={sidebarOpen}
        >
          ☰
        </button>
        <div className="admin-topbar__spacer" />
        <div className="admin-topbar__actions">
          <NavLink
            to="/supplier-wizard"
            className="admin-topbar__link"
            target="_blank"
            rel="noopener noreferrer"
          >
            + דיווח אספקה
          </NavLink>
        </div>
      </header>

      {/* Main content */}
      <main className="admin-main" id="main-content">
        <Outlet />
      </main>
    </div>
  );
}
