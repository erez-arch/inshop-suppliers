import React, { useEffect, useState } from 'react';
import * as api from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusChip } from '../../components/ui/StatusChip';
import { DataTable, Column } from '../../components/ui/DataTable';
import { Alert } from '../../components/ui/Alert';
import { Dialog } from '../../components/ui/Dialog';

export default function InventoryPage() {
  const [branches, setBranches] = useState<api.Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [counts, setCounts] = useState<api.InventoryCount[]>([]);
  const [balances, setBalances] = useState<api.InventoryBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCount, setActiveCount] = useState<api.InventoryCount | null>(null);
  const [countLines, setCountLines] = useState<api.InventoryCountLine[]>([]);
  const [pendingQty, setPendingQty] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [startDialog, setStartDialog] = useState(false);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    api.branches.list().then(setBranches).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.inventory.counts(selectedBranch || undefined),
      api.inventory.balances(selectedBranch || undefined),
    ])
      .then(([c, b]) => {
        setCounts(c);
        setBalances(b);
        const inProgress = c.find(
          (ct) => ct.status === 'in_progress' || ct.status === 'ready_to_count'
        );
        setActiveCount(inProgress ?? null);
        if (inProgress) {
          return api.inventory.getCount(inProgress.id).then((full) => {
            setCountLines(full.lines ?? []);
            const init: Record<string, number> = {};
            (full.lines ?? []).forEach((l) => { init[l.id] = l.countedQty; });
            setPendingQty(init);
          });
        }
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'שגיאה בטעינת מלאי'))
      .finally(() => setLoading(false));
  }, [selectedBranch]);

  const handleStart = async () => {
    if (!selectedBranch) return;
    try {
      const count = await api.inventory.startCount(selectedBranch);
      await api.inventory.beginCount(count.id);
      setStartDialog(false);
      const full = await api.inventory.getCount(count.id);
      setActiveCount(full);
      setCountLines(full.lines ?? []);
      const init: Record<string, number> = {};
      (full.lines ?? []).forEach((l) => { init[l.id] = l.countedQty; });
      setPendingQty(init);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'שגיאה בפתיחת ספירה');
    }
  };

  const saveLine = async (line: api.InventoryCountLine) => {
    if (!activeCount) return;
    setSaving((p) => ({ ...p, [line.id]: true }));
    try {
      await api.inventory.saveLine(activeCount.id, line.id, pendingQty[line.id] ?? 0, line.version);
      setCountLines((prev) =>
        prev.map((l) =>
          l.id === line.id
            ? { ...l, countedQty: pendingQty[line.id] ?? 0, saved: true }
            : l
        )
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'שגיאה בשמירת שורה');
    } finally {
      setSaving((p) => ({ ...p, [line.id]: false }));
    }
  };

  const handleComplete = async () => {
    if (!activeCount) return;
    setCompleting(true);
    try {
      await api.inventory.completeCount(activeCount.id, activeCount.version);
      setActiveCount(null);
      setCountLines([]);
      const updatedCounts = await api.inventory.counts(selectedBranch || undefined);
      setCounts(updatedCounts);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'שגיאה בהשלמת ספירה');
    } finally {
      setCompleting(false);
    }
  };

  const balanceCols: Column<api.InventoryBalance>[] = [
    { key: 'item', header: 'פריט', render: (r) => r.item?.name ?? r.itemId },
    { key: 'branch', header: 'סניף', render: (r) => r.branch?.name ?? r.branchId },
    { key: 'quantity', header: 'כמות', render: (r) => String(r.quantity) },
  ];

  const countsCols: Column<api.InventoryCount>[] = [
    { key: 'reference', header: 'מספר ספירה' },
    { key: 'branch', header: 'סניף', render: (r) => r.branch?.name ?? r.branchId },
    { key: 'status', header: 'סטטוס', render: (r) => <StatusChip status={r.status} /> },
    { key: 'createdAt', header: 'נפתח', render: (r) => new Date(r.createdAt).toLocaleDateString('he-IL') },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700 }}>ניהול מלאי</h1>
        <Button
          onClick={() => setStartDialog(true)}
          disabled={!selectedBranch || !!activeCount}
        >
          + פתח ספירת מלאי
        </Button>
      </div>

      {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}

      <div style={{ marginBottom: '1rem' }}>
        <select
          value={selectedBranch}
          onChange={(e) => setSelectedBranch(e.target.value)}
          style={{ padding: '0.5rem 0.75rem', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '1rem', minWidth: 200 }}
        >
          <option value="">כל הסניפים</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      {activeCount && (
        <div style={{ marginBottom: '1.5rem' }}>
        <Card title={`ספירת מלאי פעילה — ${activeCount.reference}`}
          actions={
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <StatusChip status={activeCount.status} />
              <Button variant="primary" size="sm" onClick={handleComplete} loading={completing}>
                השלם ספירה
              </Button>
            </div>
          }
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '0.5rem', textAlign: 'right' }}>פריט</th>
                <th style={{ padding: '0.5rem', textAlign: 'right' }}>יתרת פתיחה</th>
                <th style={{ padding: '0.5rem', textAlign: 'right' }}>כמות נספרת</th>
                <th style={{ padding: '0.5rem', textAlign: 'right' }}></th>
              </tr>
            </thead>
            <tbody>
              {countLines.map((line) => (
                <tr key={line.id} style={{ borderBottom: '1px solid var(--color-border)', background: line.saved ? 'var(--color-success-light)' : undefined }}>
                  <td style={{ padding: '0.5rem' }}>{line.item?.name ?? line.itemId}</td>
                  <td style={{ padding: '0.5rem' }}>{line.balanceAtStart}</td>
                  <td style={{ padding: '0.5rem' }}>
                    <input
                      type="number"
                      min={0}
                      value={pendingQty[line.id] ?? 0}
                      onChange={(e) => setPendingQty((p) => ({ ...p, [line.id]: Number(e.target.value) }))}
                      style={{ width: 80, padding: '0.25rem 0.5rem', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}
                    />
                  </td>
                  <td style={{ padding: '0.5rem' }}>
                    <Button size="sm" variant="secondary" onClick={() => saveLine(line)} loading={saving[line.id]}>
                      שמור
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <Card title="יתרות מלאי">
          <DataTable
            columns={balanceCols}
            data={balances}
            loading={loading}
            keyExtractor={(r) => `${r.branchId}-${r.itemId}`}
            emptyMessage="אין יתרות מלאי"
          />
        </Card>
        <Card title="ספירות מלאי">
          <DataTable
            columns={countsCols}
            data={counts}
            loading={loading}
            keyExtractor={(r) => r.id}
            emptyMessage="אין ספירות מלאי"
          />
        </Card>
      </div>

      <Dialog
        open={startDialog}
        onClose={() => setStartDialog(false)}
        title="פתח ספירת מלאי חדשה"
        size="sm"
        actions={
          <>
            <Button variant="secondary" onClick={() => setStartDialog(false)}>ביטול</Button>
            <Button onClick={handleStart} disabled={!selectedBranch}>פתח ספירה</Button>
          </>
        }
      >
        {selectedBranch ? (
          <p>
            תפתח ספירת מלאי חדשה עבור סניף{' '}
            <strong>{branches.find((b) => b.id === selectedBranch)?.name}</strong>.
          </p>
        ) : (
          <p>בחר סניף תחילה.</p>
        )}
      </Dialog>
    </div>
  );
}
