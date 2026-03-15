import type { Rates } from '../types';
import { formatCurrency } from '../utils';

export function RateAnalysis({ rates }: { rates: Rates }) {
  if (rates.items_with_variance.length === 0) return null;

  return (
    <div class="mb-4 rounded-lg border border-slate-200 bg-white p-3">
      <h2 class="mb-2 text-sm font-bold text-slate-700">Rate Analysis</h2>
      {rates.items_with_variance.map(item => (
        <div key={`${item.item_name}-${item.sku}`} class="mb-3 last:mb-0">
          <div class="flex items-center justify-between">
            <div>
              <span class="text-xs font-semibold text-slate-700">{item.item_name}</span>
              {item.sku && <span class="ml-1 text-xs text-slate-400">({item.sku})</span>}
            </div>
            <span class="text-xs text-slate-500">
              Base: {formatCurrency(item.base_price)}
            </span>
          </div>
          <div class="mt-1">
            {item.customer_rates.map(cr => (
              <div key={cr.customer_name} class="flex items-center justify-between py-0.5 text-xs">
                <span class="text-slate-600">{cr.customer_name}</span>
                <div>
                  <span class="font-medium text-slate-700">{formatCurrency(cr.rate)}</span>
                  {cr.variance_pct !== 0 && (
                    <span class={`ml-1 ${cr.variance_pct > 0 ? 'text-red-500' : 'text-green-600'}`}>
                      {cr.variance_pct > 0 ? '+' : ''}{cr.variance_pct}%
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
