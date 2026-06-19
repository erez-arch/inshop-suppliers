import React, { useState, useEffect, useCallback } from 'react';
import * as api from '../../services/api';
import { Supplier } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { StatusChip } from '../../components/ui/StatusChip';
import { DataTable, Column } from '../../components/ui/DataTable';
import { Dialog } from '../../components/ui/Dialog';
import { Alert } from '../../components/ui/Alert';

interface FormData {
  supplierCode: string;
  name: string;
}

const emptyForm: FormData = { supplierCode: '', name: '' };

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

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

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

  const columns: Column<Supplier>[] = [
    { key: 'supplierCode', header: 'קוד ספק', width: '120px' },
    { key: 'name', header: 'שם ספק' },
    {
      key: 'status',
      header: 'סטטוס',
      width: '120px',
      render: (row) => <StatusChip status={row.status} />,
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
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>ספקים</h1>
        <Button variant="primary" onClick={openCreate}>
          + הוסף ספק
        </Button>
      </div>

      {error && (
        <div style={{ marginBottom: '1rem' }}>
          <Alert type="error" onClose={() => setError('')}>
            {error}
          </Alert>
        </div>
      )}

      <Card noPadding>
        <DataTable<Supplier>
          columns={columns}
          data={suppliers}
          loading={loading}
          keyExtractor={(row) => row.id}
          emptyMessage="לא נמצאו ספקים"
        />
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        title={editTarget ? 'עריכת ספק' : 'הוספת ספק'}
        size="sm"
        actions={
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={closeDialog} disabled={saving}>
              ביטול
            </Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>
              {editTarget ? 'שמור שינויים' : 'הוסף ספק'}
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>קוד ספק</label>
            <input
              type="text"
              value={formData.supplierCode}
              onChange={(e) => setFormData((prev) => ({ ...prev, supplierCode: e.target.value }))}
              style={inputStyle}
              placeholder="לדוגמה: SUP001"
              disabled={saving}
            />
          </div>
          <div>
            <label style={labelStyle}>שם ספק</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              style={inputStyle}
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
          האם למחוק את הספק <strong>{deleteTarget?.name}</strong>? פעולה זו אינה הפיכה.
        </p>
      </Dialog>
    </div>
  );
}
