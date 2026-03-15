import type { Trends } from '../types';
import { formatCurrency, pctChange } from '../utils';

export function TrendTable({ trends }: { trends: Trends }) {
  const lastIdx = trends.months.length - 1;

  return (
    <div class="mb-4 rounded-lg border border-slate-200 bg-white p-3">
      <h2 class="mb-2 text-sm font-bold text-slate-700">Monthly Trends (Last 6 Months)</h2>
      <div class="overflow-x-auto -mx-3">
        <table class="w-full text-xs">
          <thead>
            <tr class="border-b border-slate-200">
              <th class="px-2 py-1.5 text-left font-semibold text-slate-600">Month</th>
              <th class="px-2 py-1.5 text-right font-semibold text-slate-600">DCs</th>
              <th class="px-2 py-1.5 text-right font-semibold text-slate-600">Payments</th>
              <th class="px-2 py-1.5 text-right font-semibold text-slate-600">FG</th>
              <th class="px-2 py-1.5 text-right font-semibold text-slate-600">Invoices</th>
            </tr>
          </thead>
          <tbody>
            {trends.months.map((month, i) => {
              const isCurrentMonth = i === lastIdx;
              return (
                <tr
                  key={month}
                  class={`border-b border-slate-50 ${isCurrentMonth ? 'bg-blue-50' : ''}`}
                >
                  <td class="px-2 py-1.5 font-medium text-slate-700">{month}</td>
                  <td class="px-2 py-1.5 text-right text-slate-700">
                    <span class="font-semibold">{formatCurrency(trends.dc_amounts[i])}</span>
                    <br />
                    <span class="text-slate-400">{trends.dc_counts[i]} nos</span>
                    {i > 0 && (
                      <span class={`ml-1 ${trends.dc_amounts[i] >= trends.dc_amounts[i - 1] ? 'text-green-600' : 'text-red-500'}`}>
                        {pctChange(trends.dc_amounts[i], trends.dc_amounts[i - 1])}
                      </span>
                    )}
                  </td>
                  <td class="px-2 py-1.5 text-right text-slate-700">
                    <span class="font-semibold">{formatCurrency(trends.payment_amounts[i])}</span>
                    <br />
                    <span class="text-slate-400">{trends.payment_counts[i]} nos</span>
                  </td>
                  <td class="px-2 py-1.5 text-right text-slate-700">
                    <span class="font-semibold">{formatCurrency(trends.fg_amounts[i])}</span>
                    <br />
                    <span class="text-slate-400">{trends.fg_counts[i]} nos</span>
                  </td>
                  <td class="px-2 py-1.5 text-right text-slate-700">
                    <span class="font-semibold">{formatCurrency(trends.invoice_amounts[i])}</span>
                    <br />
                    <span class="text-slate-400">{trends.invoice_counts[i]} nos</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
