import React, { useEffect, useState } from 'react';
import * as api from '../../services/api';
import { Button } from '../../components/ui/Button';
import { StatusChip } from '../../components/ui/StatusChip';
import { Dialog } from '../../components/ui/Dialog';
import './payments.css';

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

function formatDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} style={{ padding: '14px 16px' }}>
          <div className="skeleton" style={{ height: 14, borderRadius: 'var(--radius-sm)' }} />
        </td>
      ))}
    </tr>
  );
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<api.Payment[]>([]);
  const [suppliers, setSuppliers] = useState<api.Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [ledger, setLedger] = useState<{ entries: api.LedgerEntry[]; balance: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [ledgerLoading, setLedgerLoading] = useState(false);
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
      setLedgerLoading(true);
      api.payments.ledger(selectedSupplier)
        .then(setLedger)
        .catch(() => {})
        .finally(() => setLedgerLoading(false));
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
  const selectedSupplierObj = suppliers.find((s) => s.id === selectedSupplier);

  return (
    <div>
      {/* ── Page Header ─────────────────────────────────────── */}
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

      {/* ── Error ───────────────────────────────────────────── */}
      {error && (
        <div className="pay-error-banner" role="alert">
          <span>⚠️ {error}</span>
          <button onClick={() => setError('')} className="pay-error-close">✕</button>
        </div>
      )}

      {/* ── Supplier Filter ──────────────────────────────────── */}
      <div className="filter-bar" style={{ marginBottom: '1.25rem' }}>
        <label className="filter-bar__label">ספק:</label>
        <select
          value={selectedSupplier}
          onChange={(e) => setSelectedSupplier(e.target.value)}
          style={{ flex: 1, maxWidth: 320 }}
        >
          <option value="">כל הספקים</option>
          {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        {selectedSupplier && (
          <button
            onClick={() => setSelectedSupplier('')}
            className="pay-clear-btn"
          >
            נקה
          </button>
        )}
      </div>

      {/* ── Balance + Ledger Row ─────────────────────────────── */}
      {selectedSupplier && (
        <div className="pay-ledger-row">
          {/* Balance KPI */}
          <div className="card pay-balance-card">
            <div className="card__header">
              <h3 className="card__title">💰 יתרת חשבון</h3>
              {selectedSupplierObj && (
                <span className="pay-supplier-name">{selectedSupplierObj.name}</span>
              )}
            </div>
            <div className="card__body">
              {ledgerLoading ? (
                <div className="pay-balance-loading">
                  <div className="spinner" style={{ width: 24, height: 24 }} />
                </div>
              ) : ledger ? (
                <div className="pay-balance-content">
                  <div
                    className="pay-balance-value"
                    style={{
                      color: balanceNum > 0 ? 'var(--color-danger-600)'
                        : balanceNum < 0 ? 'var(--color-success-600)'
                        : 'var(--color-text)',
                    }}
                  >
                    ₪{Math.abs(balanceNum).toLocaleString('he-IL', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="pay-balance-label">
                    {balanceNum > 0 ? 'לתשלום לספק' : balanceNum < 0 ? 'יתרת זכות' : 'מאוזן'}
                  </div>
                </div>
              ) : (
                <div style={{ color: 'var(--color-muted)', fontSize: 'var(--font-size-sm)', textAlign: 'center' }}>
                  לא נמצאו נתוני ספר חשבונות
                </div>
              )}
            </div>
          </div>

          {/* Ledger Entries */}
          {ledger && ledger.entries.length > 0 && (
            <div className="card pay-ledger-card">
              <div className="card__header">
                <h3 className="card__title">📒 תנועות חשבון</h3>
                <span className="pay-ledger-count">{ledger.entries.length} תנועות</span>
              </div>
              <div className="pay-ledger-scroll">
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
                          <td style={{
                            textAlign: 'center',
                            fontWeight: 700,
                            color: amount < 0 ? 'var(--color-success-700)' : 'var(--color-danger-700)',
                          }}>
                            {amount < 0 ? '-' : '+'}₪{Math.abs(amount).toFixed(2)}
                          </td>
                          <td style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>
                            {formatDate(e.occurredAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Payments Table ───────────────────────────────────── */}
      <div className="card pay-table-card">
        <div className="card__header">
          <h3 className="card__title">רשימת תשלומים</h3>
          {!loading && payments.length > 0 && (
            <span className="pay-count-badge">{payments.length}</span>
          )}
        </div>

        {loading ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>מספר תשלום</th><th>ספק</th><th>סכום צפוי</th>
                  <th>סכום מאושר</th><th>אמצעי</th><th>תאריך</th>
                  <th>סטטוס</th><th>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} cols={8} />)}
              </tbody>
            </table>
          </div>
        ) : payments.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state__icon">💳</span>
            <span className="empty-state__title">אין תשלומים</span>
            <span className="empty-state__sub">
              {selectedSupplier ? 'לא נמצאו תשלומים לספק זה' : 'צור תשלום חדש כדי להתחיל'}
            </span>
            <Button variant="primary" onClick={() => setShowCreate(true)} style={{ marginTop: '1rem' }}>
              + תשלום חדש
            </Button>
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
                  <th>אמצעי תשלום</th>
                  <th>תאריך</th>
                  <th style={{ textAlign: 'center' }}>סטטוס</th>
                  <th style={{ textAlign: 'center' }}>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <span className="pay-ref" dir="ltr">{p.reference}</span>
                    </td>
                    <td className="pay-supplier">{p.supplier?.name ?? p.supplierId}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>₪{p.expectedAmount}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>₪{p.confirmedAmount}</td>
                    <td>
                      <span className="pay-method">
                        {METHOD_LABELS[p.method ?? ''] ?? p.method ?? '—'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>
                      {formatDate(p.paymentDate)}
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

      {/* ── Create Payment Dialog ────────────────────────────── */}
      <Dialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="תשלום חדש"
        actions={
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>ביטול</Button>
            <Button
              variant="primary"
              onClick={handleCreate}
              loading={saving}
              disabled={!form.supplierId || !form.expectedAmount}
            >
              צור תשלום
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
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
            <label className="form-label">סכום צפוי (₪) <span style={{ color: 'var(--color-danger-600)' }}>*</span></label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={form.expectedAmount}
              onChange={(e) => setForm((p) => ({ ...p, expectedAmount: e.target.value }))}
              className="form-input"
              dir="ltr"
              placeholder="0.00"
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
