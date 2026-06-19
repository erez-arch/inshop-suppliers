import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../../services/api';
import { Delivery, Supplier } from '../../services/api';
import './deliveries-list.css';

const DELIVERY_STATUS_OPTIONS = [
  { value: '', label: 'כל הסטטוסים' },
  { value: 'draft', label: 'טיוטה' },
  { value: 'supplier_reported', label: 'דווח ע"י ספק' },
  { value: 'trustee_pending', label: 'ממתין לנאמן' },
  { value: 'trustee_in_progress', label: 'נאמן בתהליך' },
  { value: 'trustee_received', label: 'התקבל ע"י נאמן' },
  { value: 'admin_review', label: 'בבדיקת מנהל' },
  { value: 'approved_to_inventory', label: 'אושר למלאי' },
  { value: 'closed', label: 'סגור' },
  { value: 'cancelled', label: 'בוטל' },
];

const STATUS_LABELS: Record<string, string> = {
  draft: 'טיוטה',
  supplier_reported: 'דווח ע"י ספק',
  trustee_pending: 'ממתין לנאמן',
  trustee_in_progress: 'בטיפול נאמן',
  trustee_received: 'התקבל ע"י נאמן',
  admin_review: 'בבדיקת אדמין',
  approved_to_inventory: 'אושר למלאי',
  closed: 'סגור',
  cancelled: 'בוטל',
};

const STATUS_BADGE_CLASS: Record<string, string> = {
  draft: 'dl-badge dl-badge--gray',
  supplier_reported: 'dl-badge dl-badge--blue',
  trustee_pending: 'dl-badge dl-badge--orange',
  trustee_in_progress: 'dl-badge dl-badge--amber',
  trustee_received: 'dl-badge dl-badge--purple',
  admin_review: 'dl-badge dl-badge--indigo',
  approved_to_inventory: 'dl-badge dl-badge--green',
  closed: 'dl-badge dl-badge--gray',
  cancelled: 'dl-badge dl-badge--red',
};

function formatDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function StatusBadge({ status }: { status: string }) {
  const className = STATUS_BADGE_CLASS[status] ?? 'dl-badge dl-badge--gray';
  const label = STATUS_LABELS[status] ?? status;
  return <span className={className}>{label}</span>;
}

function SkeletonRow() {
  return (
    <tr className="dl-skeleton-row">
      {Array.from({ length: 8 }).map((_, i) => (
        <td key={i}><div className="skeleton dl-skeleton-cell" /></td>
      ))}
    </tr>
  );
}

export default function DeliveriesList() {
  const navigate = useNavigate();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [statusFilter, setStatusFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [deliveriesData, suppliersData] = await Promise.all([
        api.deliveries.list({
          status: statusFilter || undefined,
          supplierId: supplierFilter || undefined,
        }),
        api.suppliers.list(),
      ]);
      setDeliveries(deliveriesData);
      setSuppliers(suppliersData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת נתונים');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, supplierFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = search.trim()
    ? deliveries.filter(
        (d) =>
          d.reference.toLowerCase().includes(search.toLowerCase()) ||
          (d.supplier?.name ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : deliveries;

  // KPI counts
  const kpiPendingTrustee = deliveries.filter(
    (d) => d.status === 'trustee_pending' || d.status === 'trustee_in_progress'
  ).length;
  const kpiAdminReview = deliveries.filter((d) => d.status === 'admin_review').length;
  const kpiApproved = deliveries.filter((d) => d.status === 'approved_to_inventory').length;
  const kpiCancelled = deliveries.filter((d) => d.status === 'cancelled').length;

  const hasFilters = !!(statusFilter || supplierFilter || search);

  return (
    <div className="dl-page">
      {/* ── Page Header ─────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-header__title">אספקות</h1>
          <p className="page-header__sub">
            {loading ? 'טוען...' : `${filtered.length} אספקות`}
          </p>
        </div>
        <div className="page-header__actions">
          <a
            href="/supplier-wizard"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
            style={{ textDecoration: 'none' }}
          >
            + אספקה חדשה
          </a>
        </div>
      </div>

      {/* ── KPI Row ─────────────────────────────────────────── */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="kpi-card kpi-card--warning">
          <div className="kpi-card__accent" />
          <span className="kpi-card__icon">⏳</span>
          <div className="kpi-card__value">{loading ? '—' : kpiPendingTrustee}</div>
          <div className="kpi-card__label">ממתינות לנאמן</div>
        </div>
        <div className="kpi-card kpi-card--primary">
          <div className="kpi-card__accent" />
          <span className="kpi-card__icon">🔍</span>
          <div className="kpi-card__value">{loading ? '—' : kpiAdminReview}</div>
          <div className="kpi-card__label">ממתינות לאדמין</div>
        </div>
        <div className="kpi-card kpi-card--success">
          <div className="kpi-card__accent" />
          <span className="kpi-card__icon">✅</span>
          <div className="kpi-card__value">{loading ? '—' : kpiApproved}</div>
          <div className="kpi-card__label">אושרו למלאי</div>
        </div>
        <div className="kpi-card kpi-card--danger">
          <div className="kpi-card__accent" />
          <span className="kpi-card__icon">✕</span>
          <div className="kpi-card__value">{loading ? '—' : kpiCancelled}</div>
          <div className="kpi-card__label">בוטלו</div>
        </div>
      </div>

      {/* ── Filter Bar ──────────────────────────────────────── */}
      <div className="filter-bar">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="סנן לפי סטטוס"
        >
          {DELIVERY_STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        <select
          value={supplierFilter}
          onChange={(e) => setSupplierFilter(e.target.value)}
          aria-label="סנן לפי ספק"
        >
          <option value="">כל הספקים</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍  חיפוש לפי אסמכתא / ספק..."
          aria-label="חיפוש"
          style={{ flex: 1, minWidth: 200 }}
        />

        {hasFilters && (
          <button
            className="dl-clear-btn"
            onClick={() => { setStatusFilter(''); setSupplierFilter(''); setSearch(''); }}
          >
            נקה סינון
          </button>
        )}
      </div>

      {/* ── Error ───────────────────────────────────────────── */}
      {error && (
        <div className="dl-error-banner" role="alert">
          <span>⚠️ {error}</span>
          <button onClick={loadData} className="dl-error-retry">נסה שוב</button>
        </div>
      )}

      {/* ── Table Card ──────────────────────────────────────── */}
      <div className="card dl-table-card">
        <div className="card__header">
          <span className="card__title">רשימת אספקות</span>
          {!loading && filtered.length > 0 && (
            <span className="dl-count-badge">{filtered.length}</span>
          )}
        </div>

        {loading ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>אסמכתא</th><th>תאריך</th><th>ספק</th><th>סניף</th>
                  <th>איש קשר</th><th>קרדיט</th><th>סטטוס</th><th>פעולה</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
              </tbody>
            </table>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state__icon">📭</span>
            <span className="empty-state__title">אין אספקות תואמות לסינון שנבחר</span>
            <span className="empty-state__sub">
              {hasFilters
                ? 'נסה לשנות את פרמטרי הסינון'
                : 'עדיין לא נוצרו אספקות במערכת'}
            </span>
            {hasFilters && (
              <button
                className="btn-primary"
                style={{ marginTop: '1rem' }}
                onClick={() => { setStatusFilter(''); setSupplierFilter(''); setSearch(''); }}
              >
                נקה סינון
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table data-table--clickable" role="grid">
              <thead>
                <tr>
                  <th>אסמכתא</th>
                  <th>תאריך</th>
                  <th>ספק</th>
                  <th>סניף</th>
                  <th>איש קשר</th>
                  <th>קרדיט</th>
                  <th>סטטוס</th>
                  <th style={{ textAlign: 'center' }}>פעולה</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr
                    key={d.id}
                    onClick={() => navigate(`/admin/deliveries/${d.id}`)}
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && navigate(`/admin/deliveries/${d.id}`)}
                    aria-label={`אספקה ${d.reference}`}
                  >
                    <td>
                      <span className="dl-ref" dir="ltr">{d.reference}</span>
                    </td>
                    <td className="dl-muted dl-nowrap">{formatDate(d.createdAt)}</td>
                    <td className="dl-supplier-name">{d.supplier?.name ?? '—'}</td>
                    <td className="dl-muted">{d.branch?.name ?? '—'}</td>
                    <td className="dl-muted dl-small">{d.contact?.contactName ?? '—'}</td>
                    <td>
                      {d.creditState ? (
                        <span className="dl-muted dl-small">{d.creditState}</span>
                      ) : '—'}
                    </td>
                    <td>
                      <StatusBadge status={d.status} />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/admin/deliveries/${d.id}`); }}
                        className="dl-open-btn"
                        aria-label={`פתח אספקה ${d.reference}`}
                      >
                        פתח →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
