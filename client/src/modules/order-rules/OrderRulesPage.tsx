import React, { useEffect, useState } from 'react';
import * as api from '../../services/api';
import { Button } from '../../components/ui/Button';
import { StatusChip } from '../../components/ui/StatusChip';
import { Dialog } from '../../components/ui/Dialog';
import './order-rules.css';

const DAYS_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const DAYS_SHORT = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

export default function OrderRulesPage() {
  const [rules, setRules] = useState<api.OrderRule[]>([]);
  const [suppliers, setSuppliers] = useState<api.Supplier[]>([]);
  const [branches, setBranches] = useState<api.Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedRule, setSelectedRule] = useState<api.OrderRule | null>(null);
  const [form, setForm] = useState({
    branchId: '',
    supplierId: '',
    deliveryWeekdays: [] as number[],
    averageLeadTimeDays: 3,
    minimumOrderAmount: '0',
  });
  const [saving, setSaving] = useState(false);

  // Filter state
  const [filterBranch, setFilterBranch] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([api.orderRules.list(), api.suppliers.list(), api.branches.list()])
      .then(([r, s, b]) => { setRules(r); setSuppliers(s); setBranches(b); })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'שגיאה'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const toggleDay = (d: number) => {
    setForm((prev) => ({
      ...prev,
      deliveryWeekdays: prev.deliveryWeekdays.includes(d)
        ? prev.deliveryWeekdays.filter((x) => x !== d)
        : [...prev.deliveryWeekdays, d].sort(),
    }));
  };

  const handleCreate = async () => {
    setSaving(true);
    try {
      await api.orderRules.create({ ...form, deliveryWeekdays: JSON.stringify(form.deliveryWeekdays) });
      setShowCreate(false);
      setForm({ branchId: '', supplierId: '', deliveryWeekdays: [], averageLeadTimeDays: 3, minimumOrderAmount: '0' });
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'שגיאה ביצירת כלל');
    } finally {
      setSaving(false);
    }
  };

  const filtered = rules.filter((r) => {
    if (filterBranch && r.branchId !== filterBranch) return false;
    if (filterSupplier && r.supplierId !== filterSupplier) return false;
    return true;
  });

  function parseDaysArray(str: string): number[] {
    try { return JSON.parse(str); } catch { return []; }
  }

  function parseDays(str: string): string {
    const days = parseDaysArray(str);
    return days.map((d) => DAYS_HE[d]).join(', ') || '—';
  }

  function renderDayPills(str: string) {
    const activeDays = parseDaysArray(str);
    return (
      <div className="or-day-pills">
        {DAYS_SHORT.map((day, i) => (
          <span
            key={i}
            className={`or-day-pill ${activeDays.includes(i) ? 'or-day-pill--active' : ''}`}
          >
            {day}
          </span>
        ))}
      </div>
    );
  }

  const hasFilters = !!(filterBranch || filterSupplier);

  return (
    <div>
      {/* ── Page Header ─────────────────────────────────────── */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h1 className="page-header__title">חוקי הזמנה</h1>
          {!loading && <span className="or-count-badge">{filtered.length}</span>}
        </div>
        <div className="page-header__actions">
          <Button variant="primary" onClick={() => setShowCreate(true)}>+ הוסף כלל</Button>
        </div>
      </div>

      {/* ── Error ───────────────────────────────────────────── */}
      {error && (
        <div className="or-error-banner" role="alert">
          <span>⚠️ {error}</span>
          <button onClick={() => setError('')} className="or-error-close">✕</button>
        </div>
      )}

      {/* ── Filter Bar ──────────────────────────────────────── */}
      <div className="filter-bar">
        <label className="filter-bar__label">סניף:</label>
        <select value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)}>
          <option value="">כל הסניפים</option>
          {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>

        <label className="filter-bar__label">ספק:</label>
        <select value={filterSupplier} onChange={(e) => setFilterSupplier(e.target.value)}>
          <option value="">כל הספקים</option>
          {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>

        {hasFilters && (
          <button
            onClick={() => { setFilterBranch(''); setFilterSupplier(''); }}
            className="or-clear-btn"
          >
            נקה סינון
          </button>
        )}
      </div>

      {/* ── Rules Table Card ────────────────────────────────── */}
      <div className="card or-table-card">
        <div className="card__header">
          <span className="card__title">כללי הזמנה</span>
          {!loading && filtered.length > 0 && (
            <span className="or-count-badge">{filtered.length}</span>
          )}
        </div>

        {loading ? (
          <div style={{ padding: '3rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', color: 'var(--color-muted)' }}>
            <div className="spinner" style={{ width: 32, height: 32 }} />
            <span style={{ fontSize: 'var(--font-size-sm)' }}>טוען כללים...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state__icon">📋</span>
            <span className="empty-state__title">אין כללי הזמנה</span>
            <span className="empty-state__sub">
              {hasFilters ? 'נסה לשנות את הסינון' : 'הוסף כלל הזמנה ראשון'}
            </span>
            {!hasFilters && (
              <Button variant="primary" onClick={() => setShowCreate(true)} style={{ marginTop: '1rem' }}>
                + הוסף כלל
              </Button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table data-table--clickable">
              <thead>
                <tr>
                  <th>סניף</th>
                  <th>ספק</th>
                  <th>ימי אספקה</th>
                  <th style={{ textAlign: 'center' }}>זמן ממוצע</th>
                  <th style={{ textAlign: 'center' }}>מינימום הזמנה</th>
                  <th style={{ textAlign: 'center' }}>סטטוס</th>
                  <th style={{ textAlign: 'center' }}>פריטים</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setSelectedRule(r)}
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setSelectedRule(r)}
                  >
                    <td className="or-branch-name">{r.branch?.name ?? r.branchId}</td>
                    <td>{r.supplier?.name ?? r.supplierId}</td>
                    <td>
                      {renderDayPills(r.deliveryWeekdays)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="or-lead-time">{r.averageLeadTimeDays ?? '—'} ימים</span>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>
                      ₪{r.minimumOrderAmount}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <StatusChip status={r.status} />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => { e.stopPropagation(); setSelectedRule(r); }}
                      >
                        {r.items?.length ?? 0} פריטים →
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Create Dialog ───────────────────────────────────── */}
      <Dialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="הוספת כלל הזמנה"
        actions={
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>ביטול</Button>
            <Button
              variant="primary"
              onClick={handleCreate}
              loading={saving}
              disabled={!form.branchId || !form.supplierId}
            >
              צור כלל
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
          <div className="form-group">
            <label className="form-label">סניף <span style={{ color: 'var(--color-danger-600)' }}>*</span></label>
            <select
              value={form.branchId}
              onChange={(e) => setForm((p) => ({ ...p, branchId: e.target.value }))}
              className="form-input"
            >
              <option value="">-- בחר סניף --</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">ספק <span style={{ color: 'var(--color-danger-600)' }}>*</span></label>
            <select
              value={form.supplierId}
              onChange={(e) => setForm((p) => ({ ...p, supplierId: e.target.value }))}
              className="form-input"
            >
              <option value="">-- בחר ספק --</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">ימי אספקה</label>
            <div className="or-day-selector">
              {DAYS_HE.map((day, i) => (
                <label
                  key={i}
                  className={`or-day-toggle ${form.deliveryWeekdays.includes(i) ? 'or-day-toggle--active' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={form.deliveryWeekdays.includes(i)}
                    onChange={() => toggleDay(i)}
                    style={{ display: 'none' }}
                  />
                  {day}
                </label>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">זמן אספקה ממוצע (ימים)</label>
            <input
              type="number"
              min={1}
              value={form.averageLeadTimeDays}
              onChange={(e) => setForm((p) => ({ ...p, averageLeadTimeDays: Number(e.target.value) }))}
              className="form-input"
              dir="ltr"
            />
          </div>
          <div className="form-group">
            <label className="form-label">מינימום הזמנה (₪)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={form.minimumOrderAmount}
              onChange={(e) => setForm((p) => ({ ...p, minimumOrderAmount: e.target.value }))}
              className="form-input"
              dir="ltr"
            />
          </div>
        </div>
      </Dialog>

      {/* ── Rule Detail Dialog ───────────────────────────────── */}
      {selectedRule && (
        <Dialog
          open={!!selectedRule}
          onClose={() => setSelectedRule(null)}
          title={`${selectedRule.branch?.name ?? ''} — ${selectedRule.supplier?.name ?? ''}`}
          size="lg"
          actions={
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', alignItems: 'center' }}>
              <StatusChip status={selectedRule.status} />
              <Button variant="secondary" onClick={() => setSelectedRule(null)}>סגור</Button>
            </div>
          }
        >
          {/* Rule summary */}
          <div className="or-rule-summary">
            <div className="or-rule-summary__item">
              <div className="or-rule-summary__label">ימי אספקה</div>
              <div className="or-rule-summary__value">{parseDays(selectedRule.deliveryWeekdays)}</div>
            </div>
            <div className="or-rule-summary__item">
              <div className="or-rule-summary__label">זמן ממוצע</div>
              <div className="or-rule-summary__value">{selectedRule.averageLeadTimeDays} ימים</div>
            </div>
            <div className="or-rule-summary__item">
              <div className="or-rule-summary__label">מינימום הזמנה</div>
              <div className="or-rule-summary__value">₪{selectedRule.minimumOrderAmount}</div>
            </div>
          </div>

          <h4 className="or-items-title">
            פריטים ({selectedRule.items?.length ?? 0})
          </h4>
          {selectedRule.items && selectedRule.items.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>פריט</th>
                    <th style={{ textAlign: 'center' }}>יעד מלאי</th>
                    <th style={{ textAlign: 'center' }}>כמות אריזה</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedRule.items.map((item) => (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 500 }}>{item.item?.name ?? item.itemId}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{item.targetInventoryQty}</td>
                      <td style={{ textAlign: 'center' }}>{item.packagingQty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '1.5rem' }}>
              <span className="empty-state__icon">📦</span>
              <span className="empty-state__title">אין פריטים בכלל זה</span>
            </div>
          )}
        </Dialog>
      )}
    </div>
  );
}
