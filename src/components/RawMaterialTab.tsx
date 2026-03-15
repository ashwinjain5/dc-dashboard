import { useState, useMemo } from 'preact/hooks';
import type { DCItemDetail } from '../types';
import { formatCurrency, formatDate, formatNumber } from '../utils';
import { PERIOD_OPTIONS, getDateCutoff, isInPeriod } from '../filters';
import type { PeriodValue } from '../filters';

interface Props {
  dcItems: DCItemDetail[];
}

type SortBy = 'date' | 'quantity';

export function RawMaterialTab({ dcItems }: Props) {
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<PeriodValue>('all');
  const [sortBy, setSortBy] = useState<SortBy>('date');

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const cutoff = getDateCutoff(period);

    let result = dcItems;

    if (q) {
      result = result.filter(d =>
        d.item_name.toLowerCase().includes(q) ||
        d.customer_name.toLowerCase().includes(q) ||
        d.dc_number.toLowerCase().includes(q) ||
        d.sku.toLowerCase().includes(q)
      );
    }

    if (cutoff) {
      result = result.filter(d => isInPeriod(d.dc_date, cutoff));
    }

    return result;
  }, [dcItems, search, period]);

  const totals = useMemo(() => ({
    count: filtered.length,
    totalQty: filtered.reduce((s, d) => s + d.quantity, 0),
    totalAmt: filtered.reduce((s, d) => s + d.amount, 0),
  }), [filtered]);

  // Group by item for drill-down
  const byItem = useMemo(() => {
    const map = new Map<string, {
      item_name: string; sku: string; unit: string; totalQty: number; totalAmt: number;
      customers: { name: string; qty: number; amount: number; date: string; dc_number: string }[];
    }>();

    for (const d of filtered) {
      const key = d.item_name;
      if (!map.has(key)) {
        map.set(key, { item_name: d.item_name, sku: d.sku, unit: d.unit, totalQty: 0, totalAmt: 0, customers: [] });
      }
      const entry = map.get(key)!;
      entry.totalQty += d.quantity;
      entry.totalAmt += d.amount;
      entry.customers.push({ name: d.customer_name, qty: d.quantity, amount: d.amount, date: d.dc_date, dc_number: d.dc_number });
    }

    const arr = [...map.values()];
    if (sortBy === 'quantity') {
      arr.sort((a, b) => b.totalQty - a.totalQty);
    } else {
      // Sort by most recent DC date
      arr.sort((a, b) => {
        const aLatest = a.customers.length ? a.customers[0].date : '';
        const bLatest = b.customers.length ? b.customers[0].date : '';
        return (bLatest || '').localeCompare(aLatest || '');
      });
    }
    return arr;
  }, [filtered, sortBy]);

  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  return (
    <div>
      {/* Aggregates */}
      <div class="mb-3 rounded-lg border border-slate-200 bg-white p-3">
        <div class="mb-1 text-xs text-slate-500">{totals.count} entries {search || period !== 'all' ? '(filtered)' : ''}</div>
        <div class="flex gap-6">
          <div>
            <div class="text-lg font-bold text-slate-800">{formatNumber(totals.totalQty)}</div>
            <div class="text-xs text-slate-500">Total Quantity</div>
          </div>
          <div>
            <div class="text-lg font-bold text-slate-800">{formatCurrency(totals.totalAmt)}</div>
            <div class="text-xs text-slate-500">Total Amount</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div class="mb-3 flex flex-wrap gap-2">
        <input
          type="text"
          value={search}
          onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
          placeholder="Search item, kaarighar, DC..."
          class="flex-1 rounded border border-slate-300 px-3 py-1.5 text-xs outline-none focus:border-blue-500"
        />
        <select
          value={period}
          onChange={(e) => setPeriod((e.target as HTMLSelectElement).value as PeriodValue)}
          class="rounded border border-slate-300 px-2 py-1.5 text-xs outline-none"
        >
          {PERIOD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy((e.target as HTMLSelectElement).value as SortBy)}
          class="rounded border border-slate-300 px-2 py-1.5 text-xs outline-none"
        >
          <option value="date">Most Recent</option>
          <option value="quantity">Most Sent</option>
        </select>
      </div>

      {/* Item drill-down */}
      {byItem.map(item => {
        const isOpen = expandedItem === item.item_name;
        return (
          <div key={item.item_name} class="mb-2 rounded-lg border border-slate-200 bg-white">
            <button
              onClick={() => setExpandedItem(isOpen ? null : item.item_name)}
              class="flex w-full items-center justify-between px-3 py-2.5 text-left"
            >
              <div>
                <span class="text-sm font-medium text-slate-800">{item.item_name}</span>
                <span class="ml-1 text-xs text-slate-400">{item.sku}</span>
              </div>
              <div class="text-right">
                <div class="text-sm font-semibold text-slate-800">{formatNumber(item.totalQty)} {item.unit}</div>
                <div class="text-xs text-slate-500">{formatCurrency(item.totalAmt)}</div>
              </div>
            </button>
            {isOpen && (
              <div class="border-t border-slate-100 px-3 pb-2 pt-1">
                <table class="w-full text-xs">
                  <thead><tr class="border-b border-slate-200">
                    <th class="py-1 text-left text-slate-500">Kaarighar</th>
                    <th class="py-1 text-right text-slate-500">Qty</th>
                    <th class="py-1 text-right text-slate-500">Amt</th>
                    <th class="py-1 text-right text-slate-500">Date</th>
                  </tr></thead>
                  <tbody>
                    {item.customers.map((c, i) => (
                      <tr key={i} class="border-b border-slate-50">
                        <td class="py-1 text-slate-700">{c.name}</td>
                        <td class="py-1 text-right text-slate-700">{c.qty}</td>
                        <td class="py-1 text-right font-medium text-slate-700">{formatCurrency(c.amount)}</td>
                        <td class="py-1 text-right text-slate-500">{formatDate(c.date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
      {byItem.length === 0 && <p class="py-8 text-center text-sm text-slate-400">No raw material items found</p>}
    </div>
  );
}
