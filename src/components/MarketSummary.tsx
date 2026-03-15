import type { MarketSummary as MarketSummaryType } from '../types';
import { formatCurrency, formatNumber } from '../utils';

export function MarketSummary({ market }: { market: MarketSummaryType }) {
  if (market.total_market_items === 0) return null;

  return (
    <div class="mb-4 rounded-lg border border-slate-200 bg-white p-3">
      <h2 class="mb-2 text-sm font-bold text-slate-700">Market Purchases</h2>
      <div class="mb-2 flex gap-4 text-xs">
        <span class="text-slate-700">
          Total: <span class="font-semibold">{formatCurrency(market.total_market_amount)}</span>
        </span>
        <span class="text-slate-700">
          {market.total_market_items} items
        </span>
        <span class="text-slate-500">
          {market.pending_count} pending · {market.filled_count} filled
        </span>
      </div>

      {market.by_item.length > 0 && (
        <table class="w-full text-xs">
          <thead>
            <tr class="border-b border-slate-200">
              <th class="py-1 text-left font-medium text-slate-500">Item</th>
              <th class="py-1 text-right font-medium text-slate-500">Qty</th>
              <th class="py-1 text-right font-medium text-slate-500">Amount</th>
              <th class="py-1 text-right font-medium text-slate-500">Count</th>
            </tr>
          </thead>
          <tbody>
            {market.by_item.map(m => (
              <tr key={m.item_name} class="border-b border-slate-50">
                <td class="py-1 text-slate-700">{m.item_name}</td>
                <td class="py-1 text-right text-slate-700">{formatNumber(m.total_qty)}</td>
                <td class="py-1 text-right font-medium text-slate-700">{formatCurrency(m.total_amount)}</td>
                <td class="py-1 text-right text-slate-500">{m.purchase_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
