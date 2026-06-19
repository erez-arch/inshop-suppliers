import React, { useState, useEffect, useCallback } from 'react';
import * as api from '../../services/api';
import { Branch } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { StatusChip } from '../../components/ui/StatusChip';
import { DataTable, Column } from '../../components/ui/DataTable';
import { Dialog } from '../../components/ui/Dialog';
import { Alert } from '../../components/ui/Alert';

interface FormData {
  branchCode: string;
  name: string;
  address: string;
}

const emptyForm: FormData = { branchCode: '', name: '', address: '' };

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
      const data = await api.branches.list();
      setBranches(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת סניפים');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  function openCreate() {
    setEditTarget(null);
    setFormData(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(branch: Branch) {
    setEditTarget(branch);
    setFormData({
      branchCode: branch.branchCode,
      name: branch.name,
      address: branch.address ?? '',
    });
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
      const payload: Partial<Branch> = {
        branchCode: formData.branchCode,
        name: formData.name,
        address: formData.address || undefined,
      };
      if (editTarget) {
        await api.branches.update(editTarget.id, payload);
      } else {
        await api.branches.create(payload);
      }
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

  const columns: Column<Branch>[] = [
    { key: 'branchCode', header: 'קוד סניף', width: '120px' },
    { key: 'name', header: 'שם סניף' },
    { key: 'address', header: 'כתובת' },
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
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>סניפים</h1>
        <Button variant="primary" onClick={openCreate}>
          + הוסף סניף
        </Button>
      </div>

      {error && (
        <Alert type="error" onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Card noPadding>
        <DataTable<Branch>
          columns={columns}
          data={branches}
          loading={loading}
          keyExtractor={(row) => row.id}
          emptyMessage="לא נמצאו סניפים"
        />
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        title={editTarget ? 'עריכת סניף' : 'הוספת סניף'}
        size="sm"
        actions={
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={closeDialog} disabled={saving}>
              ביטול
            </Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>
              {editTarget ? 'שמור שינויים' : 'הוסף סניף'}
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>קוד סניף</label>
            <input
              type="text"
              value={formData.branchCode}
              onChange={(e) => setFormData((prev) => ({ ...prev, branchCode: e.target.value }))}
              style={inputStyle}
              placeholder="לדוגמה: BR001"
              disabled={saving}
            />
          </div>
          <div>
            <label style={labelStyle}>שם סניף</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              style={inputStyle}
              placeholder="שם הסניף"
              disabled={saving}
            />
          </div>
          <div>
            <label style={labelStyle}>כתובת</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
              style={inputStyle}
              placeholder="כתובת הסניף (אופציונלי)"
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
          האם למחוק את הסניף <strong>{deleteTarget?.name}</strong>? פעולה זו אינה הפיכה.
        </p>
      </Dialog>
    </div>
  );
}
