import type { Overview } from '../types';
import { formatCurrency, formatNumber } from '../utils';

function Card({ label, amount, count, extra }: {
  label: string;
  amount: number;
  count: number;
  extra?: string;
}) {
  return (
    <div class="rounded-lg border border-slate-200 bg-white p-3">
      <p class="text-xs font-medium text-slate-500">{label}</p>
      <p class="mt-1 text-lg font-bold text-slate-800">{formatCurrency(amount)}</p>
      <p class="text-xs text-slate-400">
        {formatNumber(count)} entries{extra ? ` · ${extra}` : ''}
      </p>
    </div>
  );
}

export function SummaryCards({ overview }: { overview: Overview }) {
  return (
    <div class="mb-4 grid grid-cols-2 gap-2">
      <Card label="Active DCs" amount={overview.active_dc_total} count={overview.active_dc_count} />
      <Card label="Open Payments" amount={overview.open_payments_total} count={overview.open_payments_count} />
      <Card
        label="FG Received (Open)"
        amount={overview.fg_received_open_total}
        count={overview.fg_received_open_count}
        extra={`${formatNumber(overview.fg_received_open_qty)} pcs`}
      />
      <Card label="Carry-Forward Bal." amount={overview.carry_forward_balance_total} count={overview.active_customers} extra="customers" />
    </div>
  );
}
