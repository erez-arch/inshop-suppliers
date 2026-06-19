import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../../services/api';
import { Delivery, Supplier } from '../../services/api';
import { StatusChip } from '../../components/ui/StatusChip';

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

function formatDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
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

  return (
    <div>
      {/* KPI row */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="kpi-card kpi-card--warning">
          <div className="kpi-card__accent" />
          <span className="kpi-card__icon">⏳</span>
          <div className="kpi-card__value">{kpiPendingTrustee}</div>
          <div className="kpi-card__label">ממתינות לנאמן</div>
        </div>
        <div className="kpi-card kpi-card--primary">
          <div className="kpi-card__accent" />
          <span className="kpi-card__icon">🔍</span>
          <div className="kpi-card__value">{kpiAdminReview}</div>
          <div className="kpi-card__label">בבדיקת מנהל</div>
        </div>
        <div className="kpi-card kpi-card--success">
          <div className="kpi-card__accent" />
          <span className="kpi-card__icon">✅</span>
          <div className="kpi-card__value">{kpiApproved}</div>
          <div className="kpi-card__label">אושרו למלאי</div>
        </div>
        <div className="kpi-card kpi-card--danger">
          <div className="kpi-card__accent" />
          <span className="kpi-card__icon">✕</span>
          <div className="kpi-card__value">{kpiCancelled}</div>
          <div className="kpi-card__label">בוטלו</div>
        </div>
      </div>

      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-header__title">תור אספקות</h1>
          <p className="page-header__sub">
            {loading ? 'טוען...' : `${filtered.length} אספקות`}
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="filter-bar">
        <span className="filter-bar__label">סינון:</span>
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
          placeholder="חיפוש לפי אסמכתא / ספק..."
          aria-label="חיפוש"
          style={{ flex: 1, minWidth: 200 }}
        />

        {(statusFilter || supplierFilter || search) && (
          <button
            onClick={() => { setStatusFilter(''); setSupplierFilter(''); setSearch(''); }}
            style={{
              background: 'none', border: 'none', color: 'var(--color-muted)',
              cursor: 'pointer', fontSize: 'var(--font-size-sm)', padding: '0 0.25rem',
              minHeight: 'auto', minWidth: 'auto'
            }}
          >
            נקה סינון ✕
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: '0.875rem 1rem',
          background: 'var(--color-danger-100)',
          border: '1px solid rgba(220,56,56,.2)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--color-danger-700)',
          fontSize: 'var(--font-size-sm)',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          ⚠️ {error}
          <button onClick={loadData} style={{ marginRight: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 600, minHeight: 'auto', minWidth: 'auto' }}>
            נסה שוב
          </button>
        </div>
      )}

      {/* Table card */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', color: 'var(--color-muted)' }}>
            <div className="spinner" style={{ width: 32, height: 32 }} />
            <span style={{ fontSize: 'var(--font-size-sm)' }}>טוען אספקות...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state__icon">📭</span>
            <span className="empty-state__title">לא נמצאו אספקות</span>
            <span className="empty-state__sub">
              {statusFilter || supplierFilter || search
                ? 'נסה לשנות את פרמטרי הסינון'
                : 'עדיין לא נוצרו אספקות במערכת'}
            </span>
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
                  <th>מצב קרדיט</th>
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
                      <span style={{ fontWeight: 600, color: 'var(--color-primary-700)', fontFamily: 'monospace', fontSize: '0.8125rem' }} dir="ltr">
                        {d.reference}
                      </span>
                    </td>
                    <td style={{ color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>
                      {formatDate(d.createdAt)}
                    </td>
                    <td style={{ fontWeight: 500 }}>{d.supplier?.name ?? '—'}</td>
                    <td>{d.branch?.name ?? '—'}</td>
                    <td style={{ color: 'var(--color-muted)', fontSize: '0.8125rem' }}>
                      {d.contact?.contactName ?? '—'}
                    </td>
                    <td>
                      {d.creditState ? (
                        <span style={{ fontSize: '0.8125rem', color: 'var(--color-muted)' }}>
                          {d.creditState}
                        </span>
                      ) : '—'}
                    </td>
                    <td><StatusChip status={d.status} /></td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/admin/deliveries/${d.id}`); }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          background: 'var(--color-primary-50)',
                          color: 'var(--color-primary-700)',
                          border: '1px solid var(--color-primary-100)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '0.3125rem 0.75rem',
                          fontSize: '0.8125rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          minHeight: 'auto',
                          whiteSpace: 'nowrap',
                          transition: 'background var(--transition-fast)',
                        }}
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
