import React, { useEffect, useState } from 'react';
import * as api from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusChip } from '../../components/ui/StatusChip';
import { DataTable, Column } from '../../components/ui/DataTable';
import { Alert } from '../../components/ui/Alert';
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

  const load = () => {
    setLoading(true);
    Promise.all([
      api.orderRules.list(),
      api.suppliers.list(),
      api.branches.list(),
    ])
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
      await api.orderRules.create({
        ...form,
        deliveryWeekdays: JSON.stringify(form.deliveryWeekdays),
      });
      setShowCreate(false);
      setForm({ branchId: '', supplierId: '', deliveryWeekdays: [], averageLeadTimeDays: 3, minimumOrderAmount: '0' });
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'שגיאה ביצירת כלל');
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<api.OrderRule>[] = [
    { key: 'branch', header: 'סניף', render: (r) => r.branch?.name ?? r.branchId },
    { key: 'supplier', header: 'ספק', render: (r) => r.supplier?.name ?? r.supplierId },
    {
      key: 'deliveryWeekdays',
      header: 'ימי אספקה',
      render: (r) => {
        try {
          const days: number[] = JSON.parse(r.deliveryWeekdays);
          return days.map((d) => DAYS_HE[d]).join(', ');
        } catch {
          return r.deliveryWeekdays;
        }
      },
    },
    { key: 'averageLeadTimeDays', header: 'ימי אספקה ממוצע', render: (r) => String(r.averageLeadTimeDays) },
    { key: 'minimumOrderAmount', header: 'מינימום הזמנה', render: (r) => `₪${r.minimumOrderAmount}` },
    { key: 'status', header: 'סטטוס', render: (r) => <StatusChip status={r.status} /> },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelectedRule(r); }}>
          פריטים
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700 }}>כללי הזמנה</h1>
        <Button onClick={() => setShowCreate(true)}>+ הוסף כלל</Button>
      </div>

      {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}

      <Card>
        <DataTable
          columns={columns}
          data={rules}
          loading={loading}
          keyExtractor={(r) => r.id}
          emptyMessage="אין כללי הזמנה"
          onRowClick={setSelectedRule}
        />
      </Card>

      {/* Create dialog */}
      <Dialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="הוסף כלל הזמנה"
        actions={
          <>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>ביטול</Button>
            <Button onClick={handleCreate} loading={saving} disabled={!form.branchId || !form.supplierId}>צור כלל</Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>סניף</label>
            <select value={form.branchId} onChange={(e) => setForm((p) => ({ ...p, branchId: e.target.value }))}
              style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '1rem' }}>
              <option value="">-- בחר --</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>ספק</label>
            <select value={form.supplierId} onChange={(e) => setForm((p) => ({ ...p, supplierId: e.target.value }))}
              style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '1rem' }}>
              <option value="">-- בחר --</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>ימי אספקה</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {DAYS_HE.map((day, i) => (
                <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.deliveryWeekdays.includes(i)}
                    onChange={() => toggleDay(i)}
                  />
                  {day}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>ימי אספקה ממוצע</label>
            <input type="number" min={1} value={form.averageLeadTimeDays}
              onChange={(e) => setForm((p) => ({ ...p, averageLeadTimeDays: Number(e.target.value) }))}
              style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '1rem' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>מינימום הזמנה (₪)</label>
            <input type="number" min={0} step="0.01" value={form.minimumOrderAmount}
              onChange={(e) => setForm((p) => ({ ...p, minimumOrderAmount: e.target.value }))}
              style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '1rem' }} />
          </div>
        </div>
      </Dialog>

      {/* Rule detail dialog */}
      {selectedRule && (
        <Dialog
          open={!!selectedRule}
          onClose={() => setSelectedRule(null)}
          title={`כלל: ${selectedRule.branch?.name ?? ''} — ${selectedRule.supplier?.name ?? ''}`}
          size="lg"
          actions={<Button variant="secondary" onClick={() => setSelectedRule(null)}>סגור</Button>}
        >
          <div style={{ marginBottom: '1rem' }}>
            <StatusChip status={selectedRule.status} />
          </div>
          <h4 style={{ marginBottom: '0.75rem' }}>פריטים בכלל</h4>
          {selectedRule.items && selectedRule.items.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>פריט</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>יעד מלאי</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>כמות אריזה</th>
                </tr>
              </thead>
              <tbody>
                {selectedRule.items.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '0.5rem' }}>{item.item?.name ?? item.itemId}</td>
                    <td style={{ padding: '0.5rem' }}>{item.targetInventoryQty}</td>
                    <td style={{ padding: '0.5rem' }}>{item.packagingQty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ color: 'var(--color-text-secondary)' }}>אין פריטים בכלל זה.</p>
          )}
        </Dialog>
      )}
    </div>
  );
}
