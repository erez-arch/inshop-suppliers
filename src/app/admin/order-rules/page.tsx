import prisma from '@/lib/prisma'

export default async function OrderRulesPage() {
  const rules = await prisma.orderRule.findMany({
    include: { branch: true, items: { include: { item: true } } },
    orderBy: { createdAt: 'desc' },
  })

  // Fetch supplier names separately
  const supplierIds = [...new Set(rules.map(r => r.supplierId))]
  const suppliers = await prisma.supplier.findMany({ where: { id: { in: supplierIds } } })
  const supplierMap = Object.fromEntries(suppliers.map(s => [s.id, s]))

  const WEEKDAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">כללי הזמנה</h1>
      <div className="space-y-4">
        {rules.map(rule => {
          const supplier = supplierMap[rule.supplierId]
          let weekdays: number[] = []
          try { weekdays = JSON.parse(rule.deliveryWeekdays) } catch {}
          return (
            <div key={rule.id} className="card">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold">{supplier?.name || rule.supplierId}</h3>
                  <div className="text-sm text-gray-500 mt-1">{rule.branch.name}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {weekdays.map(d => WEEKDAYS[d]).filter(Boolean).join(', ')}
                    {rule.avgLeadTimeDays ? ` | זמן אספקה: ${rule.avgLeadTimeDays} ימים` : ''}
                    {rule.minOrderAmount ? ` | מינימום: ₪${Number(rule.minOrderAmount).toFixed(0)}` : ''}
                  </div>
                </div>
                <span className={`badge ${rule.status === 'active' ? 'badge-green' : 'badge-gray'}`}>
                  {rule.status === 'active' ? 'פעיל' : 'לא פעיל'}
                </span>
              </div>
              {rule.items.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {rule.items.map(ri => (
                    <div key={ri.id} className="badge badge-blue text-xs">
                      {ri.item.name} — PAR: {ri.targetInventoryQty}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
        {rules.length === 0 && (
          <div className="card text-center py-12 text-gray-400">
            <p>אין כללי הזמנה — כלל אחד נוצר אוטומטית מ-seed</p>
          </div>
        )}
      </div>
    </div>
  )
}
