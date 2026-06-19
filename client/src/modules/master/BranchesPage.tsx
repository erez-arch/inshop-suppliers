import React, { useState, useEffect, useCallback } from 'react';
import * as api from '../../services/api';
import { Branch } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { StatusChip } from '../../components/ui/StatusChip';
import { Dialog } from '../../components/ui/Dialog';

interface FormData {
  branchCode: string;
  name: string;
  address: string;
}

const emptyForm: FormData = { branchCode: '', name: '', address: '' };

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Branch | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Branch | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadBranches = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setBranches(await api.branches.list());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת סניפים');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadBranches(); }, [loadBranches]);

  function openCreate() {
    setEditTarget(null);
    setFormData(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(branch: Branch) {
    setEditTarget(branch);
    setFormData({ branchCode: branch.branchCode, name: branch.name, address: branch.address ?? '' });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditTarget(null);
    setFormData(emptyForm);
  }

  async function handleSave() {
    if (!formData.branchCode.trim() || !formData.name.trim()) return;
    setSaving(true);
    try {
      const payload: Partial<Branch> = { branchCode: formData.branchCode, name: formData.name, address: formData.address || undefined };
      if (editTarget) await api.branches.update(editTarget.id, payload);
      else await api.branches.create(payload);
      closeDialog();
      await loadBranches();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'שגיאה בשמירת סניף');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.branches.delete(deleteTarget.id);
      setDeleteTarget(null);
      await loadBranches();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'שגיאה במחיקת סניף');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-header__title">סניפים</h1>
          <p className="page-header__sub">{loading ? 'טוען...' : `${branches.length} סניפים`}</p>
        </div>
        <div className="page-header__actions">
          <Button variant="primary" onClick={openCreate}>+ הוסף סניף</Button>
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
            <span style={{ fontSize: 'var(--font-size-sm)' }}>טוען סניפים...</span>
          </div>
        ) : branches.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state__icon">🏪</span>
            <span className="empty-state__title">אין סניפים</span>
            <span className="empty-state__sub">הוסף סניף ראשון למערכת</span>
            <Button variant="primary" onClick={openCreate} style={{ marginTop: '0.75rem' }}>+ הוסף סניף</Button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>קוד סניף</th>
                  <th>שם סניף</th>
                  <th>כתובת</th>
                  <th style={{ textAlign: 'center' }}>סטטוס</th>
                  <th style={{ textAlign: 'center' }}>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {branches.map((branch) => (
                  <tr key={branch.id}>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.875rem', color: 'var(--color-primary-700)', fontWeight: 700 }} dir="ltr">
                        {branch.branchCode}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{branch.name}</td>
                    <td style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>{branch.address || '—'}</td>
                    <td style={{ textAlign: 'center' }}><StatusChip status={branch.status} /></td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(branch)}>עריכה</Button>
                        <Button variant="danger" size="sm" onClick={() => setDeleteTarget(branch)}>מחיקה</Button>
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
        title={editTarget ? 'עריכת סניף' : 'הוספת סניף'}
        size="sm"
        actions={
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={closeDialog} disabled={saving}>ביטול</Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>{editTarget ? 'שמור שינויים' : 'הוסף סניף'}</Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          <div className="form-group">
            <label className="form-label">קוד סניף <span style={{ color: 'var(--color-danger-600)' }}>*</span></label>
            <input type="text" className="form-input" value={formData.branchCode}
              onChange={(e) => setFormData((p) => ({ ...p, branchCode: e.target.value }))}
              placeholder="לדוגמה: BR001" disabled={saving} dir="ltr" />
          </div>
          <div className="form-group">
            <label className="form-label">שם סניף <span style={{ color: 'var(--color-danger-600)' }}>*</span></label>
            <input type="text" className="form-input" value={formData.name}
              onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              placeholder="שם הסניף" disabled={saving} />
          </div>
          <div className="form-group">
            <label className="form-label">כתובת</label>
            <input type="text" className="form-input" value={formData.address}
              onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))}
              placeholder="כתובת הסניף (אופציונלי)" disabled={saving} />
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
            האם למחוק את הסניף <strong>{deleteTarget?.name}</strong>?<br />
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-danger-600)' }}>פעולה זו אינה הפיכה.</span>
          </p>
        </div>
      </Dialog>
    </div>
  );
}
