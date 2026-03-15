import type { Overview } from '../types';
import { formatCurrency } from '../utils';

export function HeroTotal({ overview }: { overview: Overview }) {
  return (
    <div class="mb-4 rounded-lg bg-slate-800 p-4 text-white">
      <p class="text-xs font-medium uppercase tracking-wide text-slate-300">
        Total Outstanding
      </p>
      <p class="mt-1 text-2xl font-bold">
        {formatCurrency(overview.total_outstanding)}
      </p>
      <div class="mt-3 flex gap-4 text-xs">
        <div>
          <span class="text-slate-400">DCs </span>
          <span class="font-semibold">{formatCurrency(overview.active_dc_total)}</span>
        </div>
        <div>
          <span class="text-slate-400">+ Pay </span>
          <span class="font-semibold">{formatCurrency(overview.open_payments_total)}</span>
        </div>
        <div>
          <span class="text-slate-400">- FG </span>
          <span class="font-semibold">{formatCurrency(overview.fg_received_open_total)}</span>
        </div>
      </div>
    </div>
  );
}
