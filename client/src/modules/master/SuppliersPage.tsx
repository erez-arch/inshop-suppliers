import React, { useState, useEffect, useCallback } from 'react';
import * as api from '../../services/api';
import { Supplier } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import './suppliers.css';

interface FormData {
  supplierCode: string;
  name: string;
}

const emptyForm: FormData = { supplierCode: '', name: '' };

function StatusBadge({ status }: { status: string }) {
  const isActive = status === 'active';
  return (
    <span className={`sup-badge ${isActive ? 'sup-badge--active' : 'sup-badge--inactive'}`}>
      <span className="sup-badge__dot" aria-hidden="true" />
      {isActive ? 'פעיל' : 'לא פעיל'}
    </span>
  );
}

function SkeletonRow() {
  return (
    <tr>
      {Array.from({ length: 4 }).map((_, i) => (
        <td key={i} style={{ padding: '14px 16px' }}>
          <div className="skeleton" style={{ height: 14, borderRadius: 'var(--radius-sm)' }} />
        </td>
      ))}
    </tr>
  );
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [formErrors, setFormErrors] = useState<Partial<FormData>>({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState('');

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

  const filtered = search.trim()
    ? suppliers.filter(
        (s) =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.supplierCode.toLowerCase().includes(search.toLowerCase())
      )
    : suppliers;

  function openCreate() {
    setEditTarget(null);
    setFormData(emptyForm);
    setFormErrors({});
    setDialogOpen(true);
  }

  function openEdit(supplier: Supplier) {
    setEditTarget(supplier);
    setFormData({ supplierCode: supplier.supplierCode, name: supplier.name });
    setFormErrors({});
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditTarget(null);
    setFormData(emptyForm);
    setFormErrors({});
  }

  function validateForm(): boolean {
    const errors: Partial<FormData> = {};
    if (!formData.supplierCode.trim()) errors.supplierCode = 'קוד ספק הוא שדה חובה';
    if (!formData.name.trim()) errors.name = 'שם ספק הוא שדה חובה';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSave() {
    if (!validateForm()) return;
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
      {/* ── Page Header ─────────────────────────────────────── */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h1 className="page-header__title">ספקים</h1>
          {!loading && (
            <span className="sup-count-badge">{suppliers.length}</span>
          )}
        </div>
        <div className="page-header__actions">
          <Button variant="primary" onClick={openCreate}>
            + הוסף ספק
          </Button>
        </div>
      </div>

      {/* ── Error ───────────────────────────────────────────── */}
      {error && (
        <div className="sup-error-banner" role="alert">
          <span>⚠️ {error}</span>
          <button onClick={() => setError('')} className="sup-error-close">✕</button>
        </div>
      )}

      {/* ── Filter Bar ──────────────────────────────────────── */}
      <div className="filter-bar" style={{ marginBottom: '1.25rem' }}>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍  חיפוש לפי שם / קוד ספק..."
          style={{ flex: 1, minWidth: 200 }}
          aria-label="חיפוש ספקים"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="sup-clear-btn"
          >
            נקה
          </button>
        )}
      </div>

      {/* ── Table Card ──────────────────────────────────────── */}
      <div className="card sup-table-card">
        <div className="card__header">
          <span className="card__title">רשימת ספקים</span>
          {!loading && filtered.length > 0 && (
            <span className="sup-count-badge">{filtered.length}</span>
          )}
        </div>

        {loading ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>קוד ספק</th><th>שם ספק</th><th style={{ textAlign: 'center' }}>סטטוס</th><th style={{ textAlign: 'center' }}>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}
              </tbody>
            </table>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state__icon">🏭</span>
            <span className="empty-state__title">
              {search ? 'לא נמצאו ספקים תואמים' : 'אין ספקים'}
            </span>
            <span className="empty-state__sub">
              {search ? 'נסה לשנות את החיפוש' : 'הוסף את הספק הראשון כדי להתחיל'}
            </span>
            {!search && (
              <Button variant="primary" onClick={openCreate} style={{ marginTop: '1rem' }}>
                + הוסף ספק
              </Button>
            )}
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
                {filtered.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <span className="sup-code" dir="ltr">{s.supplierCode}</span>
                    </td>
                    <td className="sup-name">{s.name}</td>
                    <td style={{ textAlign: 'center' }}>
                      <StatusBadge status={s.status} />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); openEdit(s); }}
                        >
                          ✏️ עריכה
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); setDeleteTarget(s); }}
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

      {/* ── Create / Edit Dialog ──────────────────────────── */}
      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        title={editTarget ? 'עריכת ספק' : 'הוספת ספק חדש'}
        size="sm"
        actions={
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={closeDialog} disabled={saving}>ביטול</Button>
            <Button
              variant="primary"
              onClick={handleSave}
              loading={saving}
              disabled={!formData.supplierCode || !formData.name}
            >
              {editTarget ? 'שמור שינויים' : 'הוסף ספק'}
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
          <div className="form-group">
            <label className="form-label">
              קוד ספק <span style={{ color: 'var(--color-danger-600)' }}>*</span>
            </label>
            <input
              type="text"
              className={`form-input ${formErrors.supplierCode ? 'form-input--error' : ''}`}
              value={formData.supplierCode}
              onChange={(e) => {
                setFormData((p) => ({ ...p, supplierCode: e.target.value }));
                if (formErrors.supplierCode) setFormErrors((p) => ({ ...p, supplierCode: undefined }));
              }}
              placeholder="לדוגמה: SUP001"
              disabled={saving}
              dir="ltr"
            />
            {formErrors.supplierCode && (
              <span className="sup-field-error">{formErrors.supplierCode}</span>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">
              שם ספק <span style={{ color: 'var(--color-danger-600)' }}>*</span>
            </label>
            <input
              type="text"
              className={`form-input ${formErrors.name ? 'form-input--error' : ''}`}
              value={formData.name}
              onChange={(e) => {
                setFormData((p) => ({ ...p, name: e.target.value }));
                if (formErrors.name) setFormErrors((p) => ({ ...p, name: undefined }));
              }}
              placeholder="שם הספק"
              disabled={saving}
            />
            {formErrors.name && (
              <span className="sup-field-error">{formErrors.name}</span>
            )}
          </div>
        </div>
      </Dialog>

      {/* ── Delete Confirmation Dialog ──────────────────────── */}
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
