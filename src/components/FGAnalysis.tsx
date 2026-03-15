import type { FGSummary } from '../types';
import { formatCurrency, formatNumber } from '../utils';

export function FGAnalysis({ fgSummary }: { fgSummary: FGSummary }) {
  if (fgSummary.by_product.length === 0 && fgSummary.by_customer.length === 0) {
    return null;
  }

  return (
    <div class="mb-4 rounded-lg border border-slate-200 bg-white p-3">
      <h2 class="mb-2 text-sm font-bold text-slate-700">FG Product Analysis</h2>

      {/* By Product */}
      {fgSummary.by_product.length > 0 && (
        <div class="mb-3">
          <p class="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">By Product</p>
          <div class="overflow-x-auto -mx-3">
            <table class="w-full text-xs">
              <thead>
                <tr class="border-b border-slate-200">
                  <th class="px-2 py-1 text-left font-medium text-slate-500">Product</th>
                  <th class="px-2 py-1 text-right font-medium text-slate-500">Rcvd Qty</th>
                  <th class="px-2 py-1 text-right font-medium text-slate-500">Open Qty</th>
                  <th class="px-2 py-1 text-right font-medium text-slate-500">Open Amt</th>
                </tr>
              </thead>
              <tbody>
                {fgSummary.by_product.map(p => (
                  <tr key={p.model_id} class="border-b border-slate-50">
                    <td class="px-2 py-1 text-slate-700">
                      {p.product_name}
                      {p.model_id && <span class="ml-1 text-slate-400">({p.model_id})</span>}
                    </td>
                    <td class="px-2 py-1 text-right text-slate-700">{formatNumber(p.total_received_qty)}</td>
                    <td class="px-2 py-1 text-right font-medium text-slate-700">{formatNumber(p.open_qty)}</td>
                    <td class="px-2 py-1 text-right font-medium text-slate-700">{formatCurrency(p.open_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* By Customer */}
      {fgSummary.by_customer.length > 0 && (
        <div>
          <p class="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Top Suppliers</p>
          {fgSummary.by_customer.slice(0, 5).map(c => (
            <div key={c.customer_name} class="flex justify-between border-b border-slate-50 py-1 text-xs">
              <span class="text-slate-700">{c.customer_name}</span>
              <span class="text-slate-700">
                {formatNumber(c.total_received_qty)} pcs · {c.products_count} products
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
