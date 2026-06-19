import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../../services/api';
import { Delivery, Supplier } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { StatusChip } from '../../components/ui/StatusChip';
import { DataTable, Column } from '../../components/ui/DataTable';
import { Alert } from '../../components/ui/Alert';

const DELIVERY_STATUS_OPTIONS = [
  { value: '', label: 'כל הסטטוסים' },
  { value: 'draft', label: 'טיוטה' },
  { value: 'supplier_reported', label: 'דווח ע"י ספק' },
  { value: 'trustee_pending', label: 'ממתין לנאמן' },
  { value: 'trustee_in_progress', label: 'נאמן בתהליך' },
  { value: 'trustee_received', label: 'התקבל ע"י נאמן' },
  { value: 'admin_review', label: 'בבדיקת מנהל' },
  { value: 'approved_to_inventory', label: 'אושר למלאי' },
  { value: 'closed', label: 'סגור' },
  { value: 'cancelled', label: 'בוטל' },
];

function formatDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

const selectStyle: React.CSSProperties = {
  padding: '0.5rem 0.75rem',
  border: '1.5px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  fontSize: '0.9375rem',
  backgroundColor: 'var(--color-surface)',
  minWidth: '160px',
};

const inputStyle: React.CSSProperties = {
  padding: '0.5rem 0.75rem',
  border: '1.5px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  fontSize: '0.9375rem',
  minWidth: '200px',
};

export default function DeliveriesList() {
  const navigate = useNavigate();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [deliveriesData, suppliersData] = await Promise.all([
        api.deliveries.list({
          status: statusFilter || undefined,
          supplierId: supplierFilter || undefined,
        }),
        api.suppliers.list(),
      ]);
      setDeliveries(deliveriesData);
      setSuppliers(suppliersData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת נתונים');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, supplierFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredDeliveries = search.trim()
    ? deliveries.filter(
        (d) =>
          d.reference.toLowerCase().includes(search.toLowerCase()) ||
          (d.supplier?.name ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : deliveries;

  const columns: Column<Delivery>[] = [
    { key: 'reference', header: 'אסמכתא', width: '160px' },
    {
      key: 'supplier',
      header: 'ספק',
      render: (row) => row.supplier?.name ?? '—',
    },
    {
      key: 'branch',
      header: 'סניף',
      render: (row) => row.branch?.name ?? '—',
    },
    {
      key: 'status',
      header: 'סטטוס',
      width: '160px',
      render: (row) => <StatusChip status={row.status} />,
    },
    {
      key: 'creditState',
      header: 'מצב קרדיט',
      width: '130px',
      render: (row) => row.creditState ?? '—',
    },
    {
      key: 'createdAt',
      header: 'תאריך יצירה',
      width: '120px',
      render: (row) => formatDate(row.createdAt),
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
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>אספקות</h1>
      </div>

      {/* Filters */}
      <div
        style={{
          display: 'flex',
          gap: '0.75rem',
          flexWrap: 'wrap',
          alignItems: 'center',
          marginBottom: 'var(--spacing-4)',
        }}
      >
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={selectStyle}
          aria-label="סנן לפי סטטוס"
        >
          {DELIVERY_STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          value={supplierFilter}
          onChange={(e) => setSupplierFilter(e.target.value)}
          style={selectStyle}
          aria-label="סנן לפי ספק"
        >
          <option value="">כל הספקים</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="חיפוש לפי אסמכתא / ספק..."
          style={inputStyle}
          aria-label="חיפוש"
        />
      </div>

      {error && (
        <Alert type="error" onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Card noPadding>
        <DataTable<Delivery>
          columns={columns}
          data={filteredDeliveries}
          loading={loading}
          keyExtractor={(row) => row.id}
          emptyMessage="לא נמצאו אספקות"
          onRowClick={(row) => navigate(`/admin/deliveries/${row.id}`)}
        />
      </Card>
    </div>
  );
}
