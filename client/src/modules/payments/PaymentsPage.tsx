import React, { useEffect, useState } from 'react';
import * as api from '../../services/api';
import { Button } from '../../components/ui/Button';
import { StatusChip } from '../../components/ui/StatusChip';
import { Dialog } from '../../components/ui/Dialog';

const METHOD_LABELS: Record<string, string> = {
  bank_transfer: 'העברה בנקאית',
  check: 'המחאה',
  credit_card: 'כרטיס אשראי',
  cash: 'מזומן',
};

const LEDGER_TYPE_LABELS: Record<string, string> = {
  liability: 'חבות',
  payment: 'תשלום',
  credit: 'זיכוי',
  adjustment: 'תיקון',
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<api.Payment[]>([]);
  const [suppliers, setSuppliers] = useState<api.Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [ledger, setLedger] = useState<{ entries: api.LedgerEntry[]; balance: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    supplierId: '',
    expectedAmount: '',
    method: 'bank_transfer',
    paymentDate: '',
  });
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

  const balanceNum = ledger ? parseFloat(ledger.balance) : 0;

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-header__title">תשלומים לספקים</h1>
          <p className="page-header__sub">
            {loading ? 'טוען...' : `${payments.length} תשלומים`}
          </p>
        </div>
        <div className="page-header__actions">
          <Button variant="primary" onClick={() => setShowCreate(true)}>
            + תשלום חדש
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '0.875rem 1rem', background: 'var(--color-danger-100)', border: '1px solid rgba(220,56,56,.2)', borderRadius: 'var(--radius-md)', color: 'var(--color-danger-700)', fontSize: 'var(--font-size-sm)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          ⚠️ {error}
          <button onClick={() => setError('')} style={{ marginRight: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, color: 'inherit', minHeight: 'auto', minWidth: 'auto' }}>✕</button>
        </div>
      )}

      {/* Filter */}
      <div className="filter-bar" style={{ marginBottom: '1.25rem' }}>
        <label className="filter-bar__label">ספק:</label>
        <select
          value={selectedSupplier}
          onChange={(e) => setSelectedSupplier(e.target.value)}
        >
          <option value="">כל הספקים</option>
          {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {/* Ledger balance card */}
      {ledger && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
          {/* Balance KPI */}
          <div className="card">
            <div className="card__header">
              <h3 className="card__title">💰 יתרת חשבון</h3>
            </div>
            <div className="card__body" style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '2.25rem',
                fontWeight: 800,
                color: balanceNum > 0 ? 'var(--color-danger-600)' : balanceNum < 0 ? 'var(--color-success-600)' : 'var(--color-text)',
                lineHeight: 1,
                marginBottom: '0.375rem',
              }}>
                ₪{Math.abs(balanceNum).toFixed(2)}
              </div>
              <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-muted)' }}>
                {balanceNum > 0 ? 'לתשלום לספק' : balanceNum < 0 ? 'יתרת זכות' : 'מאוזן'}
              </div>
            </div>
          </div>

          {/* Ledger entries */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div className="card__header">
              <h3 className="card__title">📒 תנועות חשבון</h3>
            </div>
            <div style={{ overflowX: 'auto', maxHeight: '280px', overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>סוג</th>
                    <th style={{ textAlign: 'center' }}>סכום</th>
                    <th>תאריך</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.entries.map((e) => {
                    const amount = parseFloat(e.amountSigned);
                    return (
                      <tr key={e.id}>
                        <td>
                          <span className={`badge ${amount < 0 ? 'badge-green' : 'badge-red'}`}>
                            {LEDGER_TYPE_LABELS[e.entryType] ?? e.entryType}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 700, color: amount < 0 ? 'var(--color-success-700)' : 'var(--color-danger-700)' }}>
                          {amount < 0 ? '-' : '+'}₪{Math.abs(amount).toFixed(2)}
                        </td>
                        <td style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>
                          {new Date(e.occurredAt).toLocaleDateString('he-IL')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Payments table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="card__header">
          <h3 className="card__title">רשימת תשלומים</h3>
        </div>
        {loading ? (
          <div style={{ padding: '3rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', color: 'var(--color-muted)' }}>
            <div className="spinner" style={{ width: 32, height: 32 }} />
            <span style={{ fontSize: 'var(--font-size-sm)' }}>טוען תשלומים...</span>
          </div>
        ) : payments.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state__icon">💳</span>
            <span className="empty-state__title">אין תשלומים</span>
            <span className="empty-state__sub">צור תשלום חדש כדי להתחיל</span>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>מספר תשלום</th>
                  <th>ספק</th>
                  <th style={{ textAlign: 'center' }}>סכום צפוי</th>
                  <th style={{ textAlign: 'center' }}>סכום מאושר</th>
                  <th>אמצעי</th>
                  <th>תאריך</th>
                  <th style={{ textAlign: 'center' }}>סטטוס</th>
                  <th style={{ textAlign: 'center' }}>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.875rem', color: 'var(--color-primary-700)' }} dir="ltr">
                        {p.reference}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500 }}>{p.supplier?.name ?? p.supplierId}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>₪{p.expectedAmount}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>₪{p.confirmedAmount}</td>
                    <td style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>
                      {METHOD_LABELS[p.method ?? ''] ?? p.method ?? '—'}
                    </td>
                    <td style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>
                      {p.paymentDate ? new Date(p.paymentDate).toLocaleDateString('he-IL') : '—'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <StatusChip status={p.status} />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'center' }}>
                        {p.status === 'ready_to_post' && (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={(e) => { e.stopPropagation(); handlePost(p); }}
                            loading={actionLoading[p.id]}
                          >
                            פרסם
                          </Button>
                        )}
                        {p.status !== 'posted' && p.status !== 'cancelled' && (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={(e) => { e.stopPropagation(); handleCancel(p); }}
                            loading={actionLoading[`cancel-${p.id}`]}
                          >
                            בטל
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create payment dialog */}
      <Dialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="תשלום חדש"
        actions={
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>ביטול</Button>
            <Button variant="primary" onClick={handleCreate} loading={saving} disabled={!form.supplierId || !form.expectedAmount}>
              צור תשלום
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
          <div className="form-group">
            <label className="form-label">ספק</label>
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
            <label className="form-label">סכום צפוי (₪)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={form.expectedAmount}
              onChange={(e) => setForm((p) => ({ ...p, expectedAmount: e.target.value }))}
              className="form-input"
              dir="ltr"
            />
          </div>
          <div className="form-group">
            <label className="form-label">אמצעי תשלום</label>
            <select
              value={form.method}
              onChange={(e) => setForm((p) => ({ ...p, method: e.target.value }))}
              className="form-input"
            >
              <option value="bank_transfer">העברה בנקאית</option>
              <option value="check">המחאה</option>
              <option value="credit_card">כרטיס אשראי</option>
              <option value="cash">מזומן</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">תאריך תשלום</label>
            <input
              type="date"
              value={form.paymentDate}
              onChange={(e) => setForm((p) => ({ ...p, paymentDate: e.target.value }))}
              className="form-input"
              dir="ltr"
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
