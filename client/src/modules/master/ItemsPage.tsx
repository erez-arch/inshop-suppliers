import React, { useState, useEffect, useCallback } from 'react';
import * as api from '../../services/api';
import { Item } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';

interface FormData {
  itemCode: string;
  name: string;
  barcode: string;
  assortmentActive: boolean;
}

const emptyForm: FormData = { itemCode: '', name: '', barcode: '', assortmentActive: true };

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Item | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setItems(await api.items.list());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת פריטים');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadItems(); }, [loadItems]);

  function openCreate() {
    setEditTarget(null);
    setFormData(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(item: Item) {
    setEditTarget(item);
    setFormData({ itemCode: item.itemCode, name: item.name, barcode: item.barcode ?? '', assortmentActive: item.assortmentActive });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditTarget(null);
    setFormData(emptyForm);
  }

  async function handleSave() {
    if (!formData.itemCode.trim() || !formData.name.trim()) return;
    setSaving(true);
    try {
      const payload: Partial<Item> = {
        itemCode: formData.itemCode,
        name: formData.name,
        barcode: formData.barcode || undefined,
        assortmentActive: formData.assortmentActive,
      };
      if (editTarget) await api.items.update(editTarget.id, payload);
      else await api.items.create(payload);
      closeDialog();
      await loadItems();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'שגיאה בשמירת פריט');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.items.delete(deleteTarget.id);
      setDeleteTarget(null);
      await loadItems();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'שגיאה במחיקת פריט');
    } finally {
      setDeleting(false);
    }
  }

  const filtered = search
    ? items.filter((i) =>
        i.name.toLowerCase().includes(search.toLowerCase()) ||
        i.itemCode.toLowerCase().includes(search.toLowerCase()) ||
        (i.barcode ?? '').includes(search)
      )
    : items;

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-header__title">פריטים</h1>
          <p className="page-header__sub">{loading ? 'טוען...' : `${filtered.length} מתוך ${items.length} פריטים`}</p>
        </div>
        <div className="page-header__actions">
          <Button variant="primary" onClick={openCreate}>+ הוסף פריט</Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '0.875rem 1rem', background: 'var(--color-danger-100)', border: '1px solid rgba(220,56,56,.2)', borderRadius: 'var(--radius-md)', color: 'var(--color-danger-700)', fontSize: 'var(--font-size-sm)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          ⚠️ {error}
          <button onClick={() => setError('')} style={{ marginRight: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, color: 'inherit', minHeight: 'auto', minWidth: 'auto' }}>✕</button>
        </div>
      )}

      {/* Search bar */}
      <div className="filter-bar" style={{ marginBottom: '1.25rem' }}>
        <label className="filter-bar__label">חיפוש:</label>
        <input
          type="search"
          placeholder="שם פריט, קוד, ברקוד..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ minWidth: 220 }}
        />
        {search && (
          <button onClick={() => setSearch('')}
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
            <span style={{ fontSize: 'var(--font-size-sm)' }}>טוען פריטים...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state__icon">📦</span>
            <span className="empty-state__title">{search ? 'לא נמצאו פריטים' : 'אין פריטים'}</span>
            <span className="empty-state__sub">{search ? `אין תוצאות עבור "${search}"` : 'הוסף פריט ראשון למערכת'}</span>
            {!search && <Button variant="primary" onClick={openCreate} style={{ marginTop: '0.75rem' }}>+ הוסף פריט</Button>}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>קוד פריט</th>
                  <th>שם פריט</th>
                  <th>ברקוד</th>
                  <th style={{ textAlign: 'center' }}>פעיל בסל</th>
                  <th style={{ textAlign: 'center' }}>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.875rem', color: 'var(--color-primary-700)', fontWeight: 700 }} dir="ltr">
                        {item.itemCode}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{item.name}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.875rem', color: 'var(--color-muted)' }} dir="ltr">
                      {item.barcode || '—'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {item.assortmentActive ? (
                        <span className="badge badge-green">✓ פעיל</span>
                      ) : (
                        <span className="badge badge-gray">לא פעיל</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(item)}>עריכה</Button>
                        <Button variant="danger" size="sm" onClick={() => setDeleteTarget(item)}>מחיקה</Button>
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
        title={editTarget ? 'עריכת פריט' : 'הוספת פריט'}
        size="sm"
        actions={
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={closeDialog} disabled={saving}>ביטול</Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>{editTarget ? 'שמור שינויים' : 'הוסף פריט'}</Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="form-group">
            <label className="form-label">קוד פריט <span style={{ color: 'var(--color-danger-600)' }}>*</span></label>
            <input type="text" className="form-input" value={formData.itemCode}
              onChange={(e) => setFormData((p) => ({ ...p, itemCode: e.target.value }))}
              placeholder="לדוגמה: ITEM001" disabled={saving} dir="ltr" />
          </div>
          <div className="form-group">
            <label className="form-label">שם פריט <span style={{ color: 'var(--color-danger-600)' }}>*</span></label>
            <input type="text" className="form-input" value={formData.name}
              onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              placeholder="שם הפריט" disabled={saving} />
          </div>
          <div className="form-group">
            <label className="form-label">ברקוד</label>
            <input type="text" className="form-input" value={formData.barcode}
              onChange={(e) => setFormData((p) => ({ ...p, barcode: e.target.value }))}
              placeholder="ברקוד (אופציונלי)" disabled={saving} dir="ltr" inputMode="numeric" />
          </div>
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer', fontWeight: 600, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-2)' }}>
              <input type="checkbox" checked={formData.assortmentActive}
                onChange={(e) => setFormData((p) => ({ ...p, assortmentActive: e.target.checked }))}
                disabled={saving} style={{ width: '1rem', height: '1rem', cursor: 'pointer' }} />
              פעיל בסל המוצרים
            </label>
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
            האם למחוק את הפריט <strong>{deleteTarget?.name}</strong>?<br />
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-danger-600)' }}>פעולה זו אינה הפיכה.</span>
          </p>
        </div>
      </Dialog>
    </div>
  );
}
