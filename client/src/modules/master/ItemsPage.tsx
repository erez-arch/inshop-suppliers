import React, { useState, useEffect, useCallback } from 'react';
import * as api from '../../services/api';
import { Item } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { DataTable, Column } from '../../components/ui/DataTable';
import { Dialog } from '../../components/ui/Dialog';
import { Alert } from '../../components/ui/Alert';

interface FormData {
  itemCode: string;
  name: string;
  barcode: string;
  assortmentActive: boolean;
}

const emptyForm: FormData = {
  itemCode: '',
  name: '',
  barcode: '',
  assortmentActive: true,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  border: '1.5px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  fontSize: '1rem',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontWeight: 600,
  marginBottom: '0.25rem',
};

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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
      const data = await api.items.list();
      setItems(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת פריטים');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  function openCreate() {
    setEditTarget(null);
    setFormData(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(item: Item) {
    setEditTarget(item);
    setFormData({
      itemCode: item.itemCode,
      name: item.name,
      barcode: item.barcode ?? '',
      assortmentActive: item.assortmentActive,
    });
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
      if (editTarget) {
        await api.items.update(editTarget.id, payload);
      } else {
        await api.items.create(payload);
      }
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

  const columns: Column<Item>[] = [
    { key: 'itemCode', header: 'קוד פריט', width: '120px' },
    { key: 'name', header: 'שם פריט' },
    { key: 'barcode', header: 'ברקוד', width: '150px' },
    {
      key: 'assortmentActive',
      header: 'פעיל בסל',
      width: '100px',
      align: 'center',
      render: (row) => (
        <span
          style={{
            color: row.assortmentActive ? 'var(--color-success)' : 'var(--color-text-secondary)',
            fontWeight: 600,
          }}
        >
          {row.assortmentActive ? 'כן' : 'לא'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'פעולות',
      width: '140px',
      align: 'center',
      render: (row) => (
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(row); }}>
            עריכה
          </Button>
          <Button variant="danger" size="sm" onClick={(e) => { e.stopPropagation(); setDeleteTarget(row); }}>
            מחיקה
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div style={{ padding: 'var(--spacing-6)' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--spacing-6)',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>פריטים</h1>
        <Button variant="primary" onClick={openCreate}>
          + הוסף פריט
        </Button>
      </div>

      {error && (
        <Alert type="error" onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Card noPadding>
        <DataTable<Item>
          columns={columns}
          data={items}
          loading={loading}
          keyExtractor={(row) => row.id}
          emptyMessage="לא נמצאו פריטים"
        />
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        title={editTarget ? 'עריכת פריט' : 'הוספת פריט'}
        size="sm"
        actions={
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={closeDialog} disabled={saving}>
              ביטול
            </Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>
              {editTarget ? 'שמור שינויים' : 'הוסף פריט'}
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>קוד פריט</label>
            <input
              type="text"
              value={formData.itemCode}
              onChange={(e) => setFormData((prev) => ({ ...prev, itemCode: e.target.value }))}
              style={inputStyle}
              placeholder="לדוגמה: ITEM001"
              disabled={saving}
            />
          </div>
          <div>
            <label style={labelStyle}>שם פריט</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              style={inputStyle}
              placeholder="שם הפריט"
              disabled={saving}
            />
          </div>
          <div>
            <label style={labelStyle}>ברקוד</label>
            <input
              type="text"
              value={formData.barcode}
              onChange={(e) => setFormData((prev) => ({ ...prev, barcode: e.target.value }))}
              style={inputStyle}
              placeholder="ברקוד (אופציונלי)"
              disabled={saving}
            />
          </div>
          <div>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={formData.assortmentActive}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, assortmentActive: e.target.checked }))
                }
                disabled={saving}
                style={{ width: '1rem', height: '1rem' }}
              />
              פעיל בסל המוצרים
            </label>
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
            <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              ביטול
            </Button>
            <Button variant="danger" onClick={handleDelete} loading={deleting}>
              מחיקה
            </Button>
          </div>
        }
      >
        <p>
          האם למחוק את הפריט <strong>{deleteTarget?.name}</strong>? פעולה זו אינה הפיכה.
        </p>
      </Dialog>
    </div>
  );
}
