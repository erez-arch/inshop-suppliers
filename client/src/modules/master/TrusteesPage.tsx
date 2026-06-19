import React, { useState, useEffect, useCallback } from 'react';
import * as api from '../../services/api';
import { Trustee, Branch } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { StatusChip } from '../../components/ui/StatusChip';
import { Dialog } from '../../components/ui/Dialog';

interface FormData {
  trusteeCode: string;
  name: string;
  phone: string;
  primaryBranchId: string;
}

const emptyForm: FormData = { trusteeCode: '', name: '', phone: '', primaryBranchId: '' };

export default function TrusteesPage() {
  const [trustees, setTrustees] = useState<Trustee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Trustee | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Trustee | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [t, b] = await Promise.all([api.trustees.list(), api.branches.list()]);
      setTrustees(t);
      setBranches(b);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת נתונים');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  function openCreate() {
    setEditTarget(null);
    setFormData(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(trustee: Trustee) {
    setEditTarget(trustee);
    setFormData({
      trusteeCode: trustee.trusteeCode,
      name: trustee.name,
      phone: trustee.phone ?? '',
      primaryBranchId: trustee.primaryBranchId ?? '',
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditTarget(null);
    setFormData(emptyForm);
  }

  async function handleSave() {
    if (!formData.trusteeCode.trim() || !formData.name.trim()) return;
    setSaving(true);
    try {
      const payload: Partial<Trustee> = {
        trusteeCode: formData.trusteeCode,
        name: formData.name,
        phone: formData.phone || undefined,
        primaryBranchId: formData.primaryBranchId || undefined,
      };
      if (editTarget) await api.trustees.update(editTarget.id, payload);
      else await api.trustees.create(payload);
      closeDialog();
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'שגיאה בשמירת נאמן');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.trustees.delete(deleteTarget.id);
      setDeleteTarget(null);
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'שגיאה במחיקת נאמן');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-header__title">נאמנים</h1>
          <p className="page-header__sub">{loading ? 'טוען...' : `${trustees.length} נאמנים`}</p>
        </div>
        <div className="page-header__actions">
          <Button variant="primary" onClick={openCreate}>+ הוסף נאמן</Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '0.875rem 1rem', background: 'var(--color-danger-100)', border: '1px solid rgba(220,56,56,.2)', borderRadius: 'var(--radius-md)', color: 'var(--color-danger-700)', fontSize: 'var(--font-size-sm)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          ⚠️ {error}
          <button onClick={() => setError('')} style={{ marginRight: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, color: 'inherit', minHeight: 'auto', minWidth: 'auto' }}>✕</button>
        </div>
      )}

      {/* Table card */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', color: 'var(--color-muted)' }}>
            <div className="spinner" style={{ width: 32, height: 32 }} />
            <span style={{ fontSize: 'var(--font-size-sm)' }}>טוען נאמנים...</span>
          </div>
        ) : trustees.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state__icon">👤</span>
            <span className="empty-state__title">אין נאמנים</span>
            <span className="empty-state__sub">הוסף נאמן ראשון למערכת</span>
            <Button variant="primary" onClick={openCreate} style={{ marginTop: '0.75rem' }}>+ הוסף נאמן</Button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>קוד נאמן</th>
                  <th>שם נאמן</th>
                  <th>טלפון</th>
                  <th>סניף ראשי</th>
                  <th style={{ textAlign: 'center' }}>סטטוס</th>
                  <th style={{ textAlign: 'center' }}>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {trustees.map((trustee) => (
                  <tr key={trustee.id}>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.875rem', color: 'var(--color-primary-700)', fontWeight: 700 }} dir="ltr">
                        {trustee.trusteeCode}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{trustee.name}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.875rem', color: 'var(--color-muted)' }} dir="ltr">
                      {trustee.phone ? (
                        <a href={`tel:${trustee.phone}`} style={{ color: 'var(--color-primary-600)', textDecoration: 'none' }}>{trustee.phone}</a>
                      ) : '—'}
                    </td>
                    <td style={{ fontSize: '0.875rem' }}>{trustee.primaryBranch?.name ?? '—'}</td>
                    <td style={{ textAlign: 'center' }}><StatusChip status={trustee.status} /></td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(trustee)}>עריכה</Button>
                        <Button variant="danger" size="sm" onClick={() => setDeleteTarget(trustee)}>מחיקה</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit dialog */}
      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        title={editTarget ? 'עריכת נאמן' : 'הוספת נאמן'}
        size="sm"
        actions={
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={closeDialog} disabled={saving}>ביטול</Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>{editTarget ? 'שמור שינויים' : 'הוסף נאמן'}</Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="form-group">
            <label className="form-label">קוד נאמן <span style={{ color: 'var(--color-danger-600)' }}>*</span></label>
            <input type="text" className="form-input" value={formData.trusteeCode}
              onChange={(e) => setFormData((p) => ({ ...p, trusteeCode: e.target.value }))}
              placeholder="לדוגמה: TR001" disabled={saving} dir="ltr" />
          </div>
          <div className="form-group">
            <label className="form-label">שם נאמן <span style={{ color: 'var(--color-danger-600)' }}>*</span></label>
            <input type="text" className="form-input" value={formData.name}
              onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              placeholder="שם הנאמן" disabled={saving} />
          </div>
          <div className="form-group">
            <label className="form-label">טלפון</label>
            <input type="tel" className="form-input" value={formData.phone}
              onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
              placeholder="מספר טלפון (אופציונלי)" disabled={saving} dir="ltr" inputMode="tel" />
          </div>
          <div className="form-group">
            <label className="form-label">סניף ראשי</label>
            <select className="form-input" value={formData.primaryBranchId}
              onChange={(e) => setFormData((p) => ({ ...p, primaryBranchId: e.target.value }))}
              disabled={saving} style={{ background: 'var(--color-surface)' }}>
              <option value="">— ללא סניף ראשי —</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name} ({b.branchCode})</option>
              ))}
            </select>
          </div>
        </div>
      </Dialog>

      {/* Delete dialog */}
      <Dialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="אישור מחיקה"
        size="sm"
        actions={
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>ביטול</Button>
            <Button variant="danger" onClick={handleDelete} loading={deleting}>מחיקה</Button>
          </div>
        }
      >
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '2rem', flexShrink: 0 }}>🗑️</span>
          <p style={{ margin: 0, color: 'var(--color-text-2)', lineHeight: 1.6 }}>
            האם למחוק את הנאמן <strong>{deleteTarget?.name}</strong>?<br />
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-danger-600)' }}>פעולה זו אינה הפיכה.</span>
          </p>
        </div>
      </Dialog>
    </div>
  );
}
