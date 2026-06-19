import React, { useEffect, useState } from 'react';
import * as api from '../../services/api';
import { Button } from '../../components/ui/Button';
import { StatusChip } from '../../components/ui/StatusChip';
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
  const [completedCount, setCompletedCount] = useState<api.InventoryCount | null>(null);

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
          l.id === line.id ? { ...l, countedQty: pendingQty[line.id] ?? 0, saved: true } : l
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
      setCompletedCount(activeCount);
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

  const savedCount  = countLines.filter((l) => l.saved).length;
  const totalLines  = countLines.length;
  const progressPct = totalLines > 0 ? Math.round((savedCount / totalLines) * 100) : 0;

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-header__title">ניהול מלאי</h1>
          <p className="page-header__sub">ספירות מלאי ויתרות לפי סניף</p>
        </div>
        <div className="page-header__actions">
          <Button
            variant="primary"
            onClick={() => setStartDialog(true)}
            disabled={!selectedBranch || !!activeCount}
          >
            + פתח ספירת מלאי
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '0.875rem 1rem', background: 'var(--color-danger-100)', border: '1px solid rgba(220,56,56,.2)', borderRadius: 'var(--radius-md)', color: 'var(--color-danger-700)', fontSize: 'var(--font-size-sm)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          ⚠️ {error}
          <button onClick={() => setError('')} style={{ marginRight: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, color: 'inherit', minHeight: 'auto', minWidth: 'auto' }}>✕</button>
        </div>
      )}

      {/* Branch filter */}
      <div className="filter-bar" style={{ marginBottom: '1.25rem' }}>
        <label className="filter-bar__label">סניף:</label>
        <select
          value={selectedBranch}
          onChange={(e) => setSelectedBranch(e.target.value)}
        >
          <option value="">כל הסניפים</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      {/* Success banner */}
      {completedCount && (
        <div style={{ padding: '0.875rem 1rem', background: 'var(--color-success-100)', border: '1px solid rgba(26,156,98,.2)', borderRadius: 'var(--radius-md)', color: 'var(--color-success-700)', fontSize: 'var(--font-size-sm)', marginBottom: '1.25rem', fontWeight: 500 }}>
          ✅ ספירת מלאי {completedCount.reference} הושלמה בהצלחה!
          <button onClick={() => setCompletedCount(null)} style={{ marginRight: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, color: 'inherit', minHeight: 'auto', minWidth: 'auto' }}>✕</button>
        </div>
      )}

      {/* Active count */}
      {activeCount && (
        <div className="card" style={{ marginBottom: '1.25rem', overflow: 'hidden' }}>
          <div className="card__header">
            <div>
              <h3 className="card__title">🔄 ספירת מלאי פעילה — {activeCount.reference}</h3>
              <div style={{ marginTop: '0.375rem' }}>
                <StatusChip status={activeCount.status} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>
                {savedCount}/{totalLines} שמורים
              </span>
              <Button
                variant="primary"
                size="sm"
                onClick={handleComplete}
                loading={completing}
                disabled={savedCount < totalLines}
                title={savedCount < totalLines ? `נותרו ${totalLines - savedCount} פריטים לשמירה` : 'סיים ספירה'}
              >
                השלם ספירה
              </Button>
            </div>
          </div>

          {/* Progress bar */}
          {totalLines > 0 && (
            <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem', fontSize: 'var(--font-size-xs)', color: 'var(--color-muted)' }}>
                <span>התקדמות</span>
                <span>{progressPct}%</span>
              </div>
              <div style={{ height: 6, background: 'var(--color-border)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progressPct}%`, background: progressPct === 100 ? 'var(--color-success-600)' : 'var(--color-primary-600)', borderRadius: 3, transition: 'width 0.3s ease' }} />
              </div>
            </div>
          )}

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>פריט</th>
                  <th style={{ textAlign: 'center' }}>יתרת פתיחה</th>
                  <th style={{ textAlign: 'center' }}>כמות נספרת</th>
                  <th style={{ textAlign: 'center' }}>הפרש</th>
                  <th style={{ textAlign: 'center' }}>סטטוס</th>
                  <th style={{ textAlign: 'center' }}>שמור</th>
                </tr>
              </thead>
              <tbody>
                {countLines.map((line) => {
                  const countedQty  = pendingQty[line.id] ?? 0;
                  const openBalance = Number(line.balanceAtStart ?? 0);
                  const diff        = countedQty - openBalance;
                  return (
                    <tr
                      key={line.id}
                      style={line.saved ? { background: 'rgba(26,156,98,0.04)' } : undefined}
                    >
                      <td style={{ fontWeight: 500 }}>{line.item?.name ?? line.itemId}</td>
                      <td style={{ textAlign: 'center', color: 'var(--color-muted)' }}>{openBalance}</td>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="number"
                          min={0}
                          value={pendingQty[line.id] ?? 0}
                          onChange={(e) => setPendingQty((p) => ({ ...p, [line.id]: Number(e.target.value) }))}
                          disabled={line.saved}
                          style={{
                            width: 72,
                            padding: '0.25rem 0.375rem',
                            border: `1.5px solid ${line.saved ? 'var(--color-success-600)' : 'var(--color-border-2)'}`,
                            borderRadius: 'var(--radius-sm)',
                            fontSize: 'var(--font-size-sm)',
                            textAlign: 'center',
                            fontWeight: 600,
                            background: line.saved ? 'var(--color-success-100)' : 'var(--color-surface)',
                          }}
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {diff !== 0 ? (
                          <span style={{ fontWeight: 700, color: diff < 0 ? 'var(--color-danger-600)' : 'var(--color-warning-600)' }}>
                            {diff > 0 ? '+' : ''}{diff}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--color-success-600)', fontWeight: 600 }}>—</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {line.saved ? (
                          <span className="badge badge-green">✓ נשמר</span>
                        ) : (
                          <span className="badge badge-gray">לא נשמר</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {!line.saved && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => saveLine(line)}
                            loading={saving[line.id]}
                          >
                            שמור
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Two columns: balances + counts history */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        {/* Balances */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="card__header">
            <h3 className="card__title">📊 יתרות מלאי</h3>
          </div>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-muted)', fontSize: 'var(--font-size-sm)' }}>טוען...</div>
          ) : balances.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem' }}>
              <span className="empty-state__icon">📭</span>
              <span className="empty-state__title">אין יתרות</span>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>פריט</th>
                    <th>סניף</th>
                    <th style={{ textAlign: 'center' }}>כמות</th>
                  </tr>
                </thead>
                <tbody>
                  {balances.map((b) => (
                    <tr key={`${b.branchId}-${b.itemId}`}>
                      <td style={{ fontWeight: 500 }}>{b.item?.name ?? b.itemId}</td>
                      <td style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>{b.branch?.name ?? b.branchId}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{b.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Count history */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="card__header">
            <h3 className="card__title">📋 היסטוריית ספירות</h3>
          </div>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-muted)', fontSize: 'var(--font-size-sm)' }}>טוען...</div>
          ) : counts.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem' }}>
              <span className="empty-state__icon">📋</span>
              <span className="empty-state__title">אין ספירות</span>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>מספר ספירה</th>
                    <th>סניף</th>
                    <th style={{ textAlign: 'center' }}>סטטוס</th>
                    <th>נפתח</th>
                  </tr>
                </thead>
                <tbody>
                  {counts.map((c) => (
                    <tr key={c.id}>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.875rem', color: 'var(--color-primary-700)' }} dir="ltr">{c.reference}</td>
                      <td style={{ fontSize: '0.875rem' }}>{c.branch?.name ?? c.branchId}</td>
                      <td style={{ textAlign: 'center' }}><StatusChip status={c.status} /></td>
                      <td style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>
                        {new Date(c.createdAt).toLocaleDateString('he-IL')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Start count dialog */}
      <Dialog
        open={startDialog}
        onClose={() => setStartDialog(false)}
        title="פתח ספירת מלאי חדשה"
        size="sm"
        actions={
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setStartDialog(false)}>ביטול</Button>
            <Button variant="primary" onClick={handleStart} disabled={!selectedBranch}>פתח ספירה</Button>
          </div>
        }
      >
        {selectedBranch ? (
          <div>
            <p style={{ marginBottom: '0.75rem', color: 'var(--color-text-2)' }}>
              תפתח ספירת מלאי חדשה עבור סניף{' '}
              <strong>{branches.find((b) => b.id === selectedBranch)?.name}</strong>.
            </p>
            <div style={{ padding: '0.75rem', background: 'var(--color-warning-100)', borderRadius: 'var(--radius-md)', color: 'var(--color-warning-700)', fontSize: 'var(--font-size-sm)' }}>
              ⚠️ לפני תחילת ספירה, המערכת תבקש לסגור חשבוניות פתוחות.
            </div>
          </div>
        ) : (
          <p>בחר סניף תחילה.</p>
        )}
      </Dialog>
    </div>
  );
}
