import React, { useEffect, useState } from 'react';
import * as api from '../../services/api';
import { Button } from '../../components/ui/Button';
import { StatusChip } from '../../components/ui/StatusChip';
import { Dialog } from '../../components/ui/Dialog';

const DAYS_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

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

  function parseDays(str: string): string {
    try {
      const days: number[] = JSON.parse(str);
      return days.map((d) => DAYS_HE[d]).join(', ');
    } catch {
      return str;
    }
  }

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-header__title">חוקי הזמנה</h1>
          <p className="page-header__sub">
            {loading ? 'טוען...' : `${filtered.length} כללים`}
          </p>
        </div>
        <div className="page-header__actions">
          <Button variant="primary" onClick={() => setShowCreate(true)}>+ הוסף כלל</Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '0.875rem 1rem', background: 'var(--color-danger-100)', border: '1px solid rgba(220,56,56,.2)', borderRadius: 'var(--radius-md)', color: 'var(--color-danger-700)', fontSize: 'var(--font-size-sm)', marginBottom: '1rem' }}>
          ⚠️ {error}
          <button onClick={() => setError('')} style={{ marginRight: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, color: 'inherit', minHeight: 'auto', minWidth: 'auto' }}>✕</button>
        </div>
      )}

      {/* Filter bar */}
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
        {(filterBranch || filterSupplier) && (
          <button onClick={() => { setFilterBranch(''); setFilterSupplier(''); }}
            style={{ background: 'none', border: 'none', color: 'var(--color-muted)', cursor: 'pointer', fontSize: 'var(--font-size-sm)', padding: '0 0.25rem', minHeight: 'auto', minWidth: 'auto' }}>
            נקה ✕
          </button>
        )}
      </div>

      {/* Table card */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', color: 'var(--color-muted)' }}>
            <div className="spinner" style={{ width: 32, height: 32 }} />
            <span style={{ fontSize: 'var(--font-size-sm)' }}>טוען כללים...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state__icon">📋</span>
            <span className="empty-state__title">אין כללי הזמנה</span>
            <span className="empty-state__sub">הוסף כלל הזמנה ראשון</span>
            <Button variant="primary" onClick={() => setShowCreate(true)} style={{ marginTop: '0.75rem' }}>+ הוסף כלל</Button>
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
                  <tr key={r.id} onClick={() => setSelectedRule(r)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setSelectedRule(r)}>
                    <td style={{ fontWeight: 500 }}>{r.branch?.name ?? r.branchId}</td>
                    <td>{r.supplier?.name ?? r.supplierId}</td>
                    <td style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>
                      {parseDays(r.deliveryWeekdays) || '—'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {r.averageLeadTimeDays ?? '—'} ימים
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

      {/* Create dialog */}
      <Dialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="הוספת כלל הזמנה"
        actions={
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>ביטול</Button>
            <Button variant="primary" onClick={handleCreate} loading={saving} disabled={!form.branchId || !form.supplierId}>
              צור כלל
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
          <div className="form-group">
            <label className="form-label">סניף</label>
            <select value={form.branchId} onChange={(e) => setForm((p) => ({ ...p, branchId: e.target.value }))} className="form-input">
              <option value="">-- בחר סניף --</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">ספק</label>
            <select value={form.supplierId} onChange={(e) => setForm((p) => ({ ...p, supplierId: e.target.value }))} className="form-input">
              <option value="">-- בחר ספק --</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">ימי אספקה</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', padding: '0.625rem 0' }}>
              {DAYS_HE.map((day, i) => (
                <label
                  key={i}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    cursor: 'pointer',
                    padding: '0.375rem 0.75rem',
                    border: `1.5px solid ${form.deliveryWeekdays.includes(i) ? 'var(--color-primary-600)' : 'var(--color-border-2)'}`,
                    borderRadius: 'var(--radius-md)',
                    background: form.deliveryWeekdays.includes(i) ? 'var(--color-primary-50)' : 'var(--color-surface)',
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: form.deliveryWeekdays.includes(i) ? 600 : 400,
                    color: form.deliveryWeekdays.includes(i) ? 'var(--color-primary-700)' : 'var(--color-text-2)',
                    transition: 'all var(--transition-fast)',
                    userSelect: 'none',
                  }}
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
            <input type="number" min={1} value={form.averageLeadTimeDays}
              onChange={(e) => setForm((p) => ({ ...p, averageLeadTimeDays: Number(e.target.value) }))}
              className="form-input" dir="ltr" />
          </div>
          <div className="form-group">
            <label className="form-label">מינימום הזמנה (₪)</label>
            <input type="number" min={0} step="0.01" value={form.minimumOrderAmount}
              onChange={(e) => setForm((p) => ({ ...p, minimumOrderAmount: e.target.value }))}
              className="form-input" dir="ltr" />
          </div>
        </div>
      </Dialog>

      {/* Rule detail dialog */}
      {selectedRule && (
        <Dialog
          open={!!selectedRule}
          onClose={() => setSelectedRule(null)}
          title={`${selectedRule.branch?.name ?? ''} — ${selectedRule.supplier?.name ?? ''}`}
          size="lg"
          actions={
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <StatusChip status={selectedRule.status} />
              <Button variant="secondary" onClick={() => setSelectedRule(null)}>סגור</Button>
            </div>
          }
        >
          {/* Rule summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem', marginBottom: '1.25rem', padding: '1rem', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>ימי אספקה</div>
              <div style={{ fontWeight: 600 }}>{parseDays(selectedRule.deliveryWeekdays) || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>זמן ממוצע</div>
              <div style={{ fontWeight: 600 }}>{selectedRule.averageLeadTimeDays} ימים</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>מינימום הזמנה</div>
              <div style={{ fontWeight: 600 }}>₪{selectedRule.minimumOrderAmount}</div>
            </div>
          </div>

          <h4 style={{ marginBottom: '0.75rem', fontSize: 'var(--font-size-base)', fontWeight: 700 }}>
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
