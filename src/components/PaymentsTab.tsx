import { useState, useMemo } from 'preact/hooks';
import type { PaymentDetail } from '../types';
import { formatCurrency, formatDate } from '../utils';
import { isInDateRange } from '../filters';

interface Props {
  payments: PaymentDetail[];
}

export function PaymentsTab({ payments }: Props) {
  const [search, setSearch] = useState('');
  const [showUninvoiced, setShowUninvoiced] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();

    let result = payments;

    if (q) {
      result = result.filter(p =>
        p.customer_name.toLowerCase().includes(q) ||
        p.payment_number.toLowerCase().includes(q) ||
        p.payment_mode.toLowerCase().includes(q)
      );
    }

    if (showUninvoiced) {
      result = result.filter(p => !p.invoice_id);
    }

    if (fromDate || toDate) {
      result = result.filter(p => isInDateRange(p.payment_date, fromDate, toDate));
    }

    return result;
  }, [payments, search, showUninvoiced, fromDate, toDate]);

  const totals = useMemo(() => ({
    count: filtered.length,
    totalAmt: filtered.reduce((s, p) => s + p.amount, 0),
    uninvoicedAmt: filtered.filter(p => !p.invoice_id).reduce((s, p) => s + p.amount, 0),
    uninvoicedCount: filtered.filter(p => !p.invoice_id).length,
  }), [filtered]);

  // Group by customer
  const byCustomer = useMemo(() => {
    const map = new Map<string, { name: string; totalAmt: number; payments: PaymentDetail[] }>();
    for (const p of filtered) {
      if (!map.has(p.customer_name)) {
        map.set(p.customer_name, { name: p.customer_name, totalAmt: 0, payments: [] });
      }
      const entry = map.get(p.customer_name)!;
      entry.totalAmt += p.amount;
      entry.payments.push(p);
    }
    return [...map.values()].sort((a, b) => b.totalAmt - a.totalAmt);
  }, [filtered]);

  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
  const isFiltered = search || showUninvoiced || fromDate || toDate;

  return (
    <div>
      {/* Aggregates */}
      <div class="mb-3 rounded-lg border border-slate-200 bg-white p-3">
        <div class="mb-1 text-xs text-slate-500">{totals.count} payments {isFiltered ? '(filtered)' : ''}</div>
        <div class="flex gap-6">
          <div>
            <div class="text-lg font-bold text-slate-800">{formatCurrency(totals.totalAmt)}</div>
            <div class="text-xs text-slate-500">Total</div>
          </div>
          <div>
            <div class="text-lg font-bold text-amber-600">{formatCurrency(totals.uninvoicedAmt)}</div>
            <div class="text-xs text-slate-500">Uninvoiced ({totals.uninvoicedCount})</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div class="mb-3 flex flex-wrap gap-2">
        <input
          type="text"
          value={search}
          onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
          placeholder="Search kaarighar, payment no..."
          class="flex-1 rounded border border-slate-300 px-3 py-1.5 text-xs outline-none focus:border-blue-500"
        />
        <button
          onClick={() => setShowUninvoiced(!showUninvoiced)}
          class={`rounded px-2 py-1.5 text-xs font-medium ${
            showUninvoiced ? 'bg-amber-600 text-white' : 'border border-slate-300 bg-white text-slate-600'
          }`}
        >
          Uninvoiced
        </button>
      </div>
      <div class="mb-3 flex gap-2">
        <div class="flex items-center gap-1">
          <span class="text-xs text-slate-500">From</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate((e.target as HTMLInputElement).value)}
            class="rounded border border-slate-300 px-2 py-1 text-xs outline-none"
          />
        </div>
        <div class="flex items-center gap-1">
          <span class="text-xs text-slate-500">To</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate((e.target as HTMLInputElement).value)}
            class="rounded border border-slate-300 px-2 py-1 text-xs outline-none"
          />
        </div>
        {(fromDate || toDate) && (
          <button
            onClick={() => { setFromDate(''); setToDate(''); }}
            class="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50"
          >
            Clear
          </button>
        )}
      </div>

      {/* Customer-grouped payments */}
      {byCustomer.map(c => {
        const isOpen = expandedCustomer === c.name;
        return (
          <div key={c.name} class="mb-2 rounded-lg border border-slate-200 bg-white">
            <button
              onClick={() => setExpandedCustomer(isOpen ? null : c.name)}
              class="flex w-full items-center justify-between px-3 py-2.5 text-left"
            >
              <div>
                <span class="text-sm font-medium text-slate-800">{c.name}</span>
                <span class="ml-1 text-xs text-slate-400">{c.payments.length} payments</span>
              </div>
              <div class="text-sm font-semibold text-slate-800">{formatCurrency(c.totalAmt)}</div>
            </button>
            {isOpen && (
              <div class="border-t border-slate-100 px-3 pb-2 pt-1">
                <table class="w-full text-xs">
                  <thead><tr class="border-b border-slate-200">
                    <th class="py-1 text-left text-slate-500">No.</th>
                    <th class="py-1 text-right text-slate-500">Amount</th>
                    <th class="py-1 text-right text-slate-500">Mode</th>
                    <th class="py-1 text-right text-slate-500">Date</th>
                  </tr></thead>
                  <tbody>
                    {c.payments.map(p => (
                      <tr key={p.payment_number} class="border-b border-slate-50">
                        <td class="py-1 text-slate-700">
                          {p.payment_number}
                          {!p.invoice_id && <span class="ml-1 rounded bg-amber-100 px-1 text-[10px] text-amber-700">Open</span>}
                          {p.invoice_number && <span class="ml-1 text-[10px] text-slate-400">{p.invoice_number}</span>}
                        </td>
                        <td class="py-1 text-right font-medium text-slate-700">{formatCurrency(p.amount)}</td>
                        <td class="py-1 text-right text-slate-500">{p.payment_mode}</td>
                        <td class="py-1 text-right text-slate-500">{formatDate(p.payment_date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
      {byCustomer.length === 0 && <p class="py-8 text-center text-sm text-slate-400">No payments found</p>}
    </div>
  );
}
