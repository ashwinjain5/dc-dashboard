import { useState } from 'preact/hooks';
import type { CustomerSummary, CustomerDetail } from '../types';
import { formatCurrency, formatDate } from '../utils';

function CustomerRow({ customer, detail }: {
  customer: CustomerSummary;
  detail?: CustomerDetail;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div class="border-b border-slate-100 last:border-0">
      <button
        class="flex w-full items-center justify-between px-3 py-2.5 text-left active:bg-slate-50"
        onClick={() => setOpen(!open)}
      >
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium text-slate-800">{customer.name}</p>
          <p class="text-xs text-slate-400">
            {customer.active_dc_count} DCs · {customer.open_payments_count} Pay
            {customer.fg_open_count > 0 ? ` · ${customer.fg_open_count} FG` : ''}
          </p>
        </div>
        <div class="ml-2 text-right">
          <p class={`text-sm font-bold ${customer.outstanding > 0 ? 'text-slate-800' : 'text-green-600'}`}>
            {formatCurrency(customer.outstanding)}
          </p>
          {customer.oldest_active_dc_days > 0 && (
            <p class={`text-xs ${customer.oldest_active_dc_days > 30 ? 'text-red-500' : 'text-slate-400'}`}>
              {customer.oldest_active_dc_days}d old
            </p>
          )}
        </div>
      </button>

      {open && detail && (
        <div class="bg-slate-50 px-3 pb-3">
          {detail.active_dcs.length > 0 && (
            <DetailSection title="Active DCs">
              {detail.active_dcs.map(dc => (
                <div key={dc.dc_number} class="flex items-center justify-between py-1">
                  <div>
                    <span class="text-xs font-medium text-slate-700">{dc.dc_number}</span>
                    <span class="ml-1.5 text-xs text-slate-400">{formatDate(dc.dc_date)}</span>
                    <span class="ml-1.5 text-xs text-slate-400">{dc.dc_type}</span>
                  </div>
                  <span class="text-xs font-semibold text-slate-700">{formatCurrency(dc.total_amount)}</span>
                </div>
              ))}
            </DetailSection>
          )}

          {detail.open_payments.length > 0 && (
            <DetailSection title="Open Payments">
              {detail.open_payments.map(p => (
                <div key={p.payment_number} class="flex items-center justify-between py-1">
                  <div>
                    <span class="text-xs font-medium text-slate-700">{p.payment_number}</span>
                    <span class="ml-1.5 text-xs text-slate-400">{formatDate(p.payment_date)}</span>
                    <span class="ml-1.5 text-xs text-slate-400">{p.payment_mode}</span>
                  </div>
                  <span class="text-xs font-semibold text-green-600">{formatCurrency(p.amount)}</span>
                </div>
              ))}
            </DetailSection>
          )}

          {detail.open_fg_receipts.length > 0 && (
            <DetailSection title="FG Receipts (Open)">
              {detail.open_fg_receipts.map(f => (
                <div key={f.receipt_number} class="flex items-center justify-between py-1">
                  <div>
                    <span class="text-xs font-medium text-slate-700">{f.product_name}</span>
                    <span class="ml-1.5 text-xs text-slate-400">{f.quantity} pcs</span>
                  </div>
                  <span class="text-xs font-semibold text-slate-700">{formatCurrency(f.amount)}</span>
                </div>
              ))}
            </DetailSection>
          )}

          {detail.stock_balances.length > 0 && (
            <DetailSection title="Stock Balances">
              {detail.stock_balances.map(s => (
                <div key={s.item_name} class="flex items-center justify-between py-1">
                  <span class="text-xs text-slate-700">{s.item_name}</span>
                  <span class="text-xs font-semibold text-slate-700">
                    {s.balance} {s.unit}
                  </span>
                </div>
              ))}
            </DetailSection>
          )}

          {!detail.active_dcs.length && !detail.open_payments.length &&
            !detail.open_fg_receipts.length && !detail.stock_balances.length && (
            <p class="py-2 text-xs text-slate-400">No open items</p>
          )}
        </div>
      )}
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: preact.ComponentChildren }) {
  return (
    <div class="mt-2">
      <p class="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      {children}
    </div>
  );
}

export function CustomerLedger({ customers, details }: {
  customers: CustomerSummary[];
  details: Record<string, CustomerDetail>;
}) {
  const [search, setSearch] = useState('');
  const filtered = search
    ? customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    : customers;

  return (
    <div class="mb-4">
      <h2 class="mb-2 text-sm font-bold text-slate-700">Customer Ledger</h2>
      <input
        type="text"
        placeholder="Search customers..."
        class="mb-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
        value={search}
        onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
      />
      <div class="rounded-lg border border-slate-200 bg-white">
        {filtered.length === 0 ? (
          <p class="px-3 py-4 text-center text-xs text-slate-400">No customers found</p>
        ) : (
          filtered.map(c => (
            <CustomerRow key={c.id} customer={c} detail={details[c.id]} />
          ))
        )}
      </div>
    </div>
  );
}
