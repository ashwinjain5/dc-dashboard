import { useState, useMemo } from 'preact/hooks';
import type { CustomerSummary, CustomerDetail, DCItemDetail, FGReceiptDetail, PaymentDetail } from '../types';
import { formatCurrency, formatDate, formatNumber } from '../utils';

interface Props {
  customers: CustomerSummary[];
  details: Record<string, CustomerDetail>;
  dcItemsAll: DCItemDetail[];
  fgReceiptsAll: FGReceiptDetail[];
  paymentsAll: PaymentDetail[];
}

export function KaarigharTab({ customers, details, dcItemsAll, fgReceiptsAll, paymentsAll }: Props) {
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<'stock' | 'fg' | 'payments'>('stock');

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return q
      ? customers.filter(c => c.name.toLowerCase().includes(q))
      : customers;
  }, [customers, search]);

  const totals = useMemo(() => ({
    outstanding: filtered.reduce((s, c) => s + c.outstanding, 0),
    activeDcs: filtered.reduce((s, c) => s + c.active_dc_total, 0),
    openPayments: filtered.reduce((s, c) => s + c.open_payments_total, 0),
    fgOpen: filtered.reduce((s, c) => s + c.fg_open_total, 0),
    count: filtered.length,
  }), [filtered]);

  return (
    <div>
      {/* Aggregates */}
      <div class="mb-3 rounded-lg border border-slate-200 bg-white p-3">
        <div class="mb-1 text-xs text-slate-500">
          {totals.count} Kaarighar{totals.count !== 1 ? 's' : ''} {search ? '(filtered)' : ''}
        </div>
        <div class="text-lg font-bold text-slate-800">{formatCurrency(totals.outstanding)}</div>
        <div class="text-xs text-slate-500">Outstanding</div>
        <div class="mt-2 grid grid-cols-3 gap-2 text-xs">
          <div><span class="text-slate-400">DCs</span><br /><span class="font-semibold">{formatCurrency(totals.activeDcs)}</span></div>
          <div><span class="text-slate-400">Payments</span><br /><span class="font-semibold">{formatCurrency(totals.openPayments)}</span></div>
          <div><span class="text-slate-400">FG Rcvd</span><br /><span class="font-semibold">{formatCurrency(totals.fgOpen)}</span></div>
        </div>
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
        placeholder="Search kaarighar..."
        class="mb-3 w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
      />

      {/* Customer list */}
      {filtered.map(c => {
        const isOpen = expandedId === c.id;
        const detail = details[c.id];
        const custDcItems = dcItemsAll.filter(d => d.customer_id === c.id);
        const custFg = fgReceiptsAll.filter(f => f.customer_id === c.id);
        const custPay = paymentsAll.filter(p => p.customer_id === c.id);

        return (
          <div key={c.id} class="mb-2 rounded-lg border border-slate-200 bg-white">
            <button
              onClick={() => { setExpandedId(isOpen ? null : c.id); setSubTab('stock'); }}
              class="flex w-full items-center justify-between px-3 py-2.5 text-left"
            >
              <div>
                <span class="text-sm font-medium text-slate-800">{c.name}</span>
                {!c.is_active && <span class="ml-1 text-xs text-red-400">(inactive)</span>}
              </div>
              <div class="text-right">
                <div class="text-sm font-semibold text-slate-800">{formatCurrency(c.outstanding)}</div>
                <div class="text-xs text-slate-400">{c.active_dc_count} DCs</div>
              </div>
            </button>

            {isOpen && (
              <div class="border-t border-slate-100 px-3 pb-3 pt-2">
                {/* Sub-tabs */}
                <div class="mb-2 flex gap-1">
                  {(['stock', 'fg', 'payments'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setSubTab(t)}
                      class={`rounded px-2 py-1 text-xs font-medium ${
                        subTab === t ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {t === 'stock' ? 'Raw Material' : t === 'fg' ? 'Ready Maal' : 'Payments'}
                    </button>
                  ))}
                </div>

                {subTab === 'stock' && (
                  <div>
                    {detail?.stock_balances?.length ? (
                      <table class="w-full text-xs">
                        <thead><tr class="border-b border-slate-200">
                          <th class="py-1 text-left text-slate-500">Item</th>
                          <th class="py-1 text-right text-slate-500">Balance</th>
                          <th class="py-1 text-right text-slate-500">Unit</th>
                        </tr></thead>
                        <tbody>
                          {detail.stock_balances.map(sb => (
                            <tr key={sb.item_name} class="border-b border-slate-50">
                              <td class="py-1 text-slate-700">{sb.item_name}</td>
                              <td class="py-1 text-right font-medium text-slate-700">{formatNumber(sb.balance)}</td>
                              <td class="py-1 text-right text-slate-500">{sb.unit}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : <p class="text-xs text-slate-400">No stock balances</p>}
                    {custDcItems.length > 0 && (
                      <div class="mt-2">
                        <div class="mb-1 text-xs font-medium text-slate-500">Recent DC Items ({custDcItems.length})</div>
                        <table class="w-full text-xs">
                          <thead><tr class="border-b border-slate-200">
                            <th class="py-1 text-left text-slate-500">Item</th>
                            <th class="py-1 text-right text-slate-500">Qty</th>
                            <th class="py-1 text-right text-slate-500">Amt</th>
                            <th class="py-1 text-right text-slate-500">Date</th>
                          </tr></thead>
                          <tbody>
                            {custDcItems.slice(0, 20).map((d, i) => (
                              <tr key={i} class="border-b border-slate-50">
                                <td class="py-1 text-slate-700">{d.item_name}</td>
                                <td class="py-1 text-right text-slate-700">{d.quantity} {d.unit}</td>
                                <td class="py-1 text-right font-medium text-slate-700">{formatCurrency(d.amount)}</td>
                                <td class="py-1 text-right text-slate-500">{formatDate(d.dc_date)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {custDcItems.length > 20 && <p class="mt-1 text-xs text-slate-400">+{custDcItems.length - 20} more</p>}
                      </div>
                    )}
                  </div>
                )}

                {subTab === 'fg' && (
                  <div>
                    {custFg.length ? (
                      <table class="w-full text-xs">
                        <thead><tr class="border-b border-slate-200">
                          <th class="py-1 text-left text-slate-500">Product</th>
                          <th class="py-1 text-right text-slate-500">Qty</th>
                          <th class="py-1 text-right text-slate-500">Amt</th>
                          <th class="py-1 text-right text-slate-500">Date</th>
                        </tr></thead>
                        <tbody>
                          {custFg.map(f => (
                            <tr key={f.receipt_number} class="border-b border-slate-50">
                              <td class="py-1 text-slate-700">{f.product_name}</td>
                              <td class="py-1 text-right text-slate-700">{f.quantity}</td>
                              <td class="py-1 text-right font-medium text-slate-700">{formatCurrency(f.amount)}</td>
                              <td class="py-1 text-right text-slate-500">{formatDate(f.receipt_date)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : <p class="text-xs text-slate-400">No finished goods received</p>}
                  </div>
                )}

                {subTab === 'payments' && (
                  <div>
                    {custPay.length ? (
                      <table class="w-full text-xs">
                        <thead><tr class="border-b border-slate-200">
                          <th class="py-1 text-left text-slate-500">No.</th>
                          <th class="py-1 text-right text-slate-500">Amount</th>
                          <th class="py-1 text-right text-slate-500">Mode</th>
                          <th class="py-1 text-right text-slate-500">Date</th>
                        </tr></thead>
                        <tbody>
                          {custPay.map(p => (
                            <tr key={p.payment_number} class="border-b border-slate-50">
                              <td class="py-1 text-slate-700">
                                {p.payment_number}
                                {!p.invoice_id && <span class="ml-1 rounded bg-amber-100 px-1 text-[10px] text-amber-700">Open</span>}
                              </td>
                              <td class="py-1 text-right font-medium text-slate-700">{formatCurrency(p.amount)}</td>
                              <td class="py-1 text-right text-slate-500">{p.payment_mode}</td>
                              <td class="py-1 text-right text-slate-500">{formatDate(p.payment_date)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : <p class="text-xs text-slate-400">No payments</p>}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
      {filtered.length === 0 && <p class="py-8 text-center text-sm text-slate-400">No kaarighars found</p>}
    </div>
  );
}
