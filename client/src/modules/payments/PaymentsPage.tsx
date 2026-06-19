import React, { useEffect, useState } from 'react';
import * as api from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusChip } from '../../components/ui/StatusChip';
import { DataTable, Column } from '../../components/ui/DataTable';
import { Alert } from '../../components/ui/Alert';
import { Dialog } from '../../components/ui/Dialog';

export default function PaymentsPage() {
  const [payments, setPayments] = useState<api.Payment[]>([]);
  const [suppliers, setSuppliers] = useState<api.Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [ledger, setLedger] = useState<{ entries: api.LedgerEntry[]; balance: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ supplierId: '', expectedAmount: '', method: 'bank_transfer', paymentDate: '' });
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  const loadPayments = () => {
    setLoading(true);
    api.payments.list(selectedSupplier || undefined)
      .then(setPayments)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'שגיאה'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { api.suppliers.list().then(setSuppliers).catch(() => {}); }, []);
  useEffect(loadPayments, [selectedSupplier]);

  useEffect(() => {
    if (selectedSupplier) {
      api.payments.ledger(selectedSupplier).then(setLedger).catch(() => {});
    } else {
      setLedger(null);
    }
  }, [selectedSupplier]);

  const handleCreate = async () => {
    setSaving(true);
    try {
      await api.payments.create(form as Record<string, unknown>);
      setShowCreate(false);
      setForm({ supplierId: '', expectedAmount: '', method: 'bank_transfer', paymentDate: '' });
      loadPayments();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'שגיאה ביצירת תשלום');
    } finally {
      setSaving(false);
    }
  };

  const handlePost = async (p: api.Payment) => {
    setActionLoading((prev) => ({ ...prev, [p.id]: true }));
    try {
      await api.payments.post(p.id, p.version);
      loadPayments();
      if (selectedSupplier) {
        const updated = await api.payments.ledger(selectedSupplier);
        setLedger(updated);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'שגיאה');
    } finally {
      setActionLoading((prev) => ({ ...prev, [p.id]: false }));
    }
  };

  const handleCancel = async (p: api.Payment) => {
    if (!window.confirm('לבטל תשלום זה?')) return;
    setActionLoading((prev) => ({ ...prev, [`cancel-${p.id}`]: true }));
    try {
      await api.payments.cancel(p.id);
      loadPayments();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'שגיאה');
    } finally {
      setActionLoading((prev) => ({ ...prev, [`cancel-${p.id}`]: false }));
    }
  };

  const columns: Column<api.Payment>[] = [
    { key: 'reference', header: 'מספר תשלום' },
    { key: 'supplier', header: 'ספק', render: (r) => r.supplier?.name ?? r.supplierId },
    { key: 'expectedAmount', header: 'סכום צפוי', render: (r) => `₪${r.expectedAmount}` },
    { key: 'confirmedAmount', header: 'סכום מאושר', render: (r) => `₪${r.confirmedAmount}` },
    { key: 'method', header: 'אמצעי', render: (r) => r.method ?? '—' },
    { key: 'paymentDate', header: 'תאריך', render: (r) => r.paymentDate ? new Date(r.paymentDate).toLocaleDateString('he-IL') : '—' },
    { key: 'status', header: 'סטטוס', render: (r) => <StatusChip status={r.status} /> },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {r.status === 'ready_to_post' && (
            <Button size="sm" onClick={(e) => { e.stopPropagation(); handlePost(r); }} loading={actionLoading[r.id]}>
              פרסם
            </Button>
          )}
          {r.status !== 'posted' && r.status !== 'cancelled' && (
            <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); handleCancel(r); }} loading={actionLoading[`cancel-${r.id}`]}>
              בטל
            </Button>
          )}
        </div>
      ),
    },
  ];

  const ledgerTypeLabelMap: Record<string, string> = {
    liability: 'חבות',
    payment: 'תשלום',
    credit: 'זיכוי',
    adjustment: 'תיקון',
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700 }}>תשלומים</h1>
        <Button onClick={() => setShowCreate(true)}>+ תשלום חדש</Button>
      </div>

      {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'center' }}>
        <select
          value={selectedSupplier}
          onChange={(e) => setSelectedSupplier(e.target.value)}
          style={{ padding: '0.5rem 0.75rem', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '1rem', minWidth: 200 }}
        >
          <option value="">כל הספקים</option>
          {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {ledger && (
        <div style={{ marginBottom: '1.5rem' }}>
        <Card title={`יתרת חשבון ספק`}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '1rem' }}>
            <span style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 700 }}>₪{ledger.balance}</span>
            <span style={{ color: 'var(--color-text-secondary)' }}>יתרה לתשלום</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '0.5rem', textAlign: 'right' }}>סוג</th>
                <th style={{ padding: '0.5rem', textAlign: 'right' }}>סכום</th>
                <th style={{ padding: '0.5rem', textAlign: 'right' }}>תאריך</th>
              </tr>
            </thead>
            <tbody>
              {ledger.entries.map((e) => (
                <tr key={e.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '0.5rem' }}>{ledgerTypeLabelMap[e.entryType] ?? e.entryType}</td>
                  <td style={{ padding: '0.5rem', color: parseFloat(e.amountSigned) < 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                    ₪{e.amountSigned}
                  </td>
                  <td style={{ padding: '0.5rem' }}>{new Date(e.occurredAt).toLocaleDateString('he-IL')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        </div>
      )}

      <Card title="רשימת תשלומים">
        <DataTable
          columns={columns}
          data={payments}
          loading={loading}
          keyExtractor={(r) => r.id}
          emptyMessage="אין תשלומים"
        />
      </Card>

      <Dialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="תשלום חדש"
        actions={
          <>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>ביטול</Button>
            <Button onClick={handleCreate} loading={saving} disabled={!form.supplierId || !form.expectedAmount}>צור תשלום</Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>ספק</label>
            <select value={form.supplierId} onChange={(e) => setForm((p) => ({ ...p, supplierId: e.target.value }))}
              style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '1rem' }}>
              <option value="">-- בחר ספק --</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>סכום צפוי (₪)</label>
            <input type="number" min={0} step="0.01" value={form.expectedAmount}
              onChange={(e) => setForm((p) => ({ ...p, expectedAmount: e.target.value }))}
              style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '1rem' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>אמצעי תשלום</label>
            <select value={form.method} onChange={(e) => setForm((p) => ({ ...p, method: e.target.value }))}
              style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '1rem' }}>
              <option value="bank_transfer">העברה בנקאית</option>
              <option value="check">המחאה</option>
              <option value="credit_card">כרטיס אשראי</option>
              <option value="cash">מזומן</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>תאריך תשלום</label>
            <input type="date" value={form.paymentDate}
              onChange={(e) => setForm((p) => ({ ...p, paymentDate: e.target.value }))}
              style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '1rem' }} />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
