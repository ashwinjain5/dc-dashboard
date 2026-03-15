import { useState } from 'preact/hooks';
import type { Material } from '../types';
import { formatNumber } from '../utils';

export function MaterialSummary({ material }: { material: Material }) {
  const [showAllStock, setShowAllStock] = useState(false);
  const stockList = showAllStock ? material.stock_summary : material.stock_summary.slice(0, 10);

  return (
    <div class="mb-4 rounded-lg border border-slate-200 bg-white p-3">
      <h2 class="mb-2 text-sm font-bold text-slate-700">Material & Inventory</h2>

      {/* Stock Summary */}
      {material.stock_summary.length > 0 && (
        <div class="mb-3">
          <p class="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Stock at Kaarighars ({material.stock_summary.length} items)
          </p>
          <table class="w-full text-xs">
            <thead>
              <tr class="border-b border-slate-200">
                <th class="py-1 text-left font-medium text-slate-500">Item</th>
                <th class="py-1 text-right font-medium text-slate-500">Balance</th>
                <th class="py-1 text-right font-medium text-slate-500">Holders</th>
              </tr>
            </thead>
            <tbody>
              {stockList.map(s => (
                <tr key={s.item_name} class="border-b border-slate-50">
                  <td class="py-1 text-slate-700">
                    {s.item_name}
                    {s.sku && <span class="ml-1 text-slate-400">({s.sku})</span>}
                  </td>
                  <td class="py-1 text-right font-medium text-slate-700">
                    {formatNumber(s.total_balance)} {s.unit}
                  </td>
                  <td class="py-1 text-right text-slate-500">{s.customers_holding}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {material.stock_summary.length > 10 && (
            <button
              class="mt-1 text-xs font-medium text-blue-600"
              onClick={() => setShowAllStock(!showAllStock)}
            >
              {showAllStock ? 'Show less' : `Show all ${material.stock_summary.length} items`}
            </button>
          )}
        </div>
      )}

      {/* Extra Material */}
      <div class="mb-3">
        <p class="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Extra Material</p>
        <div class="flex gap-4 text-xs">
          <span class="text-slate-700">
            <span class="font-semibold">{material.extra_material.total_active_entries}</span> entries
          </span>
          <span class="text-slate-700">
            <span class="font-semibold">{formatNumber(material.extra_material.total_active_quantity)}</span> total qty
          </span>
        </div>
        {material.extra_material.by_customer.length > 0 && (
          <div class="mt-1">
            {material.extra_material.by_customer.slice(0, 5).map(c => (
              <div key={c.name} class="flex justify-between text-xs">
                <span class="text-slate-600">{c.name}</span>
                <span class="text-slate-700">{c.entries} entries · {formatNumber(c.quantity)} qty</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending Material */}
      <div>
        <p class="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Pending Material</p>
        <div class="flex gap-4 text-xs">
          <span class="text-slate-700">
            <span class="font-semibold">{material.pending_material.total_pending_entries}</span> entries
          </span>
          <span class="text-slate-700">
            <span class="font-semibold">{formatNumber(material.pending_material.total_pending_quantity)}</span> total qty
          </span>
        </div>
        {material.pending_material.by_customer.length > 0 && (
          <div class="mt-1">
            {material.pending_material.by_customer.slice(0, 5).map(c => (
              <div key={c.name} class="flex justify-between text-xs">
                <span class="text-slate-600">{c.name}</span>
                <span class="text-slate-700">{c.entries} entries · {formatNumber(c.quantity)} qty</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
