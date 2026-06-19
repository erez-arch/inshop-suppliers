import React, { useState, useEffect, useCallback } from 'react';
import * as api from '../../services/api';
import { Supplier } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { StatusChip } from '../../components/ui/StatusChip';
import { Dialog } from '../../components/ui/Dialog';

interface FormData {
  supplierCode: string;
  name: string;
}

const emptyForm: FormData = { supplierCode: '', name: '' };

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadSuppliers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.suppliers.list();
      setSuppliers(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת ספקים');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSuppliers(); }, [loadSuppliers]);

  function openCreate() {
    setEditTarget(null);
    setFormData(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(supplier: Supplier) {
    setEditTarget(supplier);
    setFormData({ supplierCode: supplier.supplierCode, name: supplier.name });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditTarget(null);
    setFormData(emptyForm);
  }

  async function handleSave() {
    if (!formData.supplierCode.trim() || !formData.name.trim()) return;
    setSaving(true);
    try {
      if (editTarget) {
        await api.suppliers.update(editTarget.id, formData);
      } else {
        await api.suppliers.create(formData);
      }
      closeDialog();
      await loadSuppliers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'שגיאה בשמירת ספק');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.suppliers.delete(deleteTarget.id);
      setDeleteTarget(null);
      await loadSuppliers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'שגיאה במחיקת ספק');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-header__title">ספקים</h1>
          <p className="page-header__sub">
            {loading ? 'טוען...' : `${suppliers.length} ספקים`}
          </p>
        </div>
        <div className="page-header__actions">
          <Button variant="primary" onClick={openCreate}>
            + הוסף ספק
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '0.875rem 1rem', background: 'var(--color-danger-100)', border: '1px solid rgba(220,56,56,.2)', borderRadius: 'var(--radius-md)', color: 'var(--color-danger-700)', fontSize: 'var(--font-size-sm)', marginBottom: '1rem' }}>
          ⚠️ {error}
          <button onClick={() => setError('')} style={{ marginRight: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, color: 'inherit', minHeight: 'auto', minWidth: 'auto' }}>✕</button>
        </div>
      )}

      {/* Table card */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', color: 'var(--color-muted)' }}>
            <div className="spinner" style={{ width: 32, height: 32 }} />
            <span style={{ fontSize: 'var(--font-size-sm)' }}>טוען ספקים...</span>
          </div>
        ) : suppliers.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state__icon">🏭</span>
            <span className="empty-state__title">אין ספקים</span>
            <span className="empty-state__sub">הוסף את הספק הראשון כדי להתחיל</span>
            <Button variant="primary" onClick={openCreate} style={{ marginTop: '0.75rem' }}>+ הוסף ספק</Button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>קוד ספק</th>
                  <th>שם ספק</th>
                  <th style={{ textAlign: 'center' }}>סטטוס</th>
                  <th style={{ textAlign: 'center' }}>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.875rem', color: 'var(--color-muted)' }} dir="ltr">
                        {s.supplierCode}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                    <td style={{ textAlign: 'center' }}>
                      <StatusChip status={s.status} />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); openEdit(s); }}
                          title="עריכה"
                        >
                          ✏️ עריכה
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); setDeleteTarget(s); }}
                          title="מחיקה"
                        >
                          מחיקה
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        title={editTarget ? 'עריכת ספק' : 'הוספת ספק חדש'}
        size="sm"
        actions={
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={closeDialog} disabled={saving}>ביטול</Button>
            <Button variant="primary" onClick={handleSave} loading={saving} disabled={!formData.supplierCode || !formData.name}>
              {editTarget ? 'שמור שינויים' : 'הוסף ספק'}
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
          <div className="form-group">
            <label className="form-label">קוד ספק</label>
            <input
              type="text"
              className="form-input"
              value={formData.supplierCode}
              onChange={(e) => setFormData((p) => ({ ...p, supplierCode: e.target.value }))}
              placeholder="לדוגמה: SUP001"
              disabled={saving}
              dir="ltr"
            />
          </div>
          <div className="form-group">
            <label className="form-label">שם ספק</label>
            <input
              type="text"
              className="form-input"
              value={formData.name}
              onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              placeholder="שם הספק"
              disabled={saving}
            />
          </div>
        </div>
      </Dialog>

      {/* Delete Confirmation Dialog */}
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
        <p style={{ color: 'var(--color-text-2)' }}>
          האם למחוק את הספק <strong>{deleteTarget?.name}</strong>? פעולה זו אינה הפיכה.
        </p>
      </Dialog>
    </div>
  );
}
