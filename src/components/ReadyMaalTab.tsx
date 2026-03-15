import { useState, useMemo } from 'preact/hooks';
import type { FGReceiptDetail } from '../types';
import { formatCurrency, formatDate, formatNumber } from '../utils';
import { PERIOD_OPTIONS, getDateCutoff, isInPeriod } from '../filters';
import type { PeriodValue } from '../filters';

interface Props {
  fgReceipts: FGReceiptDetail[];
}

type SortBy = 'date' | 'quantity';

export function ReadyMaalTab({ fgReceipts }: Props) {
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<PeriodValue>('all');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [orderFilter, setOrderFilter] = useState<'all' | 'order' | 'non-order'>('all');

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const cutoff = getDateCutoff(period);

    let result = fgReceipts;

    if (q) {
      result = result.filter(r =>
        r.product_name.toLowerCase().includes(q) ||
        r.customer_name.toLowerCase().includes(q) ||
        r.receipt_number.toLowerCase().includes(q)
      );
    }

    if (cutoff) {
      result = result.filter(r => isInPeriod(r.receipt_date, cutoff));
    }

    if (orderFilter === 'order') {
      result = result.filter(r => r.is_order_related);
    } else if (orderFilter === 'non-order') {
      result = result.filter(r => !r.is_order_related);
    }

    if (sortBy === 'quantity') {
      result = [...result].sort((a, b) => b.quantity - a.quantity);
    }
    // default 'date' sort is already applied from processing script

    return result;
  }, [fgReceipts, search, period, sortBy, orderFilter]);

  const totals = useMemo(() => ({
    count: filtered.length,
    totalQty: filtered.reduce((s, r) => s + r.quantity, 0),
    totalAmt: filtered.reduce((s, r) => s + r.amount, 0),
  }), [filtered]);

  // Group by product for drill-down
  const byProduct = useMemo(() => {
    const map = new Map<string, { product_name: string; model_id: string; totalQty: number; totalAmt: number; customers: { name: string; qty: number; date: string }[] }>();
    for (const r of filtered) {
      const key = r.product_name;
      if (!map.has(key)) {
        map.set(key, { product_name: r.product_name, model_id: r.model_id, totalQty: 0, totalAmt: 0, customers: [] });
      }
      const entry = map.get(key)!;
      entry.totalQty += r.quantity;
      entry.totalAmt += r.amount;
      entry.customers.push({ name: r.customer_name, qty: r.quantity, date: r.receipt_date });
    }
    return [...map.values()].sort((a, b) => b.totalQty - a.totalQty);
  }, [filtered]);

  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

  return (
    <div>
      {/* Aggregates */}
      <div class="mb-3 rounded-lg border border-slate-200 bg-white p-3">
        <div class="mb-1 text-xs text-slate-500">{totals.count} receipts {search || period !== 'all' || orderFilter !== 'all' ? '(filtered)' : ''}</div>
        <div class="flex gap-6">
          <div>
            <div class="text-lg font-bold text-slate-800">{formatNumber(totals.totalQty)}</div>
            <div class="text-xs text-slate-500">Total Pieces</div>
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
          placeholder="Search product, kaarighar..."
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
          <option value="quantity">Top Quantity</option>
        </select>
        <select
          value={orderFilter}
          onChange={(e) => setOrderFilter((e.target as HTMLSelectElement).value as 'all' | 'order' | 'non-order')}
          class="rounded border border-slate-300 px-2 py-1.5 text-xs outline-none"
        >
          <option value="all">All</option>
          <option value="order">Order Related</option>
          <option value="non-order">Non-Order</option>
        </select>
      </div>

      {/* Product drill-down */}
      {byProduct.map(p => {
        const isOpen = expandedProduct === p.product_name;
        return (
          <div key={p.product_name} class="mb-2 rounded-lg border border-slate-200 bg-white">
            <button
              onClick={() => setExpandedProduct(isOpen ? null : p.product_name)}
              class="flex w-full items-center justify-between px-3 py-2.5 text-left"
            >
              <div>
                <span class="text-sm font-medium text-slate-800">{p.product_name}</span>
                <span class="ml-1 text-xs text-slate-400">{p.model_id}</span>
              </div>
              <div class="text-right">
                <div class="text-sm font-semibold text-slate-800">{formatNumber(p.totalQty)} pcs</div>
                <div class="text-xs text-slate-500">{formatCurrency(p.totalAmt)}</div>
              </div>
            </button>
            {isOpen && (
              <div class="border-t border-slate-100 px-3 pb-2 pt-1">
                <table class="w-full text-xs">
                  <thead><tr class="border-b border-slate-200">
                    <th class="py-1 text-left text-slate-500">Kaarighar</th>
                    <th class="py-1 text-right text-slate-500">Qty</th>
                    <th class="py-1 text-right text-slate-500">Date</th>
                  </tr></thead>
                  <tbody>
                    {p.customers.map((c, i) => (
                      <tr key={i} class="border-b border-slate-50">
                        <td class="py-1 text-slate-700">{c.name}</td>
                        <td class="py-1 text-right font-medium text-slate-700">{c.qty}</td>
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
      {byProduct.length === 0 && <p class="py-8 text-center text-sm text-slate-400">No finished goods found</p>}
    </div>
  );
}
