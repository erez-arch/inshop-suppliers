import React, { useState, useEffect, useCallback } from 'react';
import * as api from '../../services/api';
import { Trustee, Branch } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { StatusChip } from '../../components/ui/StatusChip';
import { DataTable, Column } from '../../components/ui/DataTable';
import { Dialog } from '../../components/ui/Dialog';
import { Alert } from '../../components/ui/Alert';

interface FormData {
  trusteeCode: string;
  name: string;
  phone: string;
  primaryBranchId: string;
}

const emptyForm: FormData = {
  trusteeCode: '',
  name: '',
  phone: '',
  primaryBranchId: '',
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
      const [trusteesData, branchesData] = await Promise.all([
        api.trustees.list(),
        api.branches.list(),
      ]);
      setTrustees(trusteesData);
      setBranches(branchesData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת נתונים');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
      if (editTarget) {
        await api.trustees.update(editTarget.id, payload);
      } else {
        await api.trustees.create(payload);
      }
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

  const columns: Column<Trustee>[] = [
    { key: 'trusteeCode', header: 'קוד נאמן', width: '120px' },
    { key: 'name', header: 'שם נאמן' },
    { key: 'phone', header: 'טלפון', width: '140px' },
    {
      key: 'primaryBranch',
      header: 'סניף ראשי',
      render: (row) => row.primaryBranch?.name ?? '—',
    },
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
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>נאמנים</h1>
        <Button variant="primary" onClick={openCreate}>
          + הוסף נאמן
        </Button>
      </div>

      {error && (
        <Alert type="error" onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Card noPadding>
        <DataTable<Trustee>
          columns={columns}
          data={trustees}
          loading={loading}
          keyExtractor={(row) => row.id}
          emptyMessage="לא נמצאו נאמנים"
        />
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        title={editTarget ? 'עריכת נאמן' : 'הוספת נאמן'}
        size="sm"
        actions={
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={closeDialog} disabled={saving}>
              ביטול
            </Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>
              {editTarget ? 'שמור שינויים' : 'הוסף נאמן'}
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>קוד נאמן</label>
            <input
              type="text"
              value={formData.trusteeCode}
              onChange={(e) => setFormData((prev) => ({ ...prev, trusteeCode: e.target.value }))}
              style={inputStyle}
              placeholder="לדוגמה: TR001"
              disabled={saving}
            />
          </div>
          <div>
            <label style={labelStyle}>שם נאמן</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              style={inputStyle}
              placeholder="שם הנאמן"
              disabled={saving}
            />
          </div>
          <div>
            <label style={labelStyle}>טלפון</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
              style={inputStyle}
              placeholder="מספר טלפון (אופציונלי)"
              disabled={saving}
              dir="ltr"
            />
          </div>
          <div>
            <label style={labelStyle}>סניף ראשי</label>
            <select
              value={formData.primaryBranchId}
              onChange={(e) => setFormData((prev) => ({ ...prev, primaryBranchId: e.target.value }))}
              style={{ ...inputStyle, backgroundColor: 'var(--color-surface)' }}
              disabled={saving}
            >
              <option value="">— ללא סניף ראשי —</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.branchCode})
                </option>
              ))}
            </select>
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
          האם למחוק את הנאמן <strong>{deleteTarget?.name}</strong>? פעולה זו אינה הפיכה.
        </p>
      </Dialog>
    </div>
  );
}
