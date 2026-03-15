import type { Aging, AgingBucket } from '../types';
import { formatCurrency } from '../utils';

const BUCKET_LABELS: Record<string, string> = {
  '0_15': '0-15 days',
  '15_30': '15-30 days',
  '30_60': '30-60 days',
  '60_plus': '60+ days',
};

const BUCKET_COLORS: Record<string, string> = {
  '0_15': 'bg-green-500',
  '15_30': 'bg-yellow-500',
  '30_60': 'bg-orange-500',
  '60_plus': 'bg-red-500',
};

function AgingSection({ title, buckets }: { title: string; buckets: Record<string, AgingBucket> }) {
  const maxAmount = Math.max(...Object.values(buckets).map(b => b.amount), 1);
  const totalAmount = Object.values(buckets).reduce((s, b) => s + b.amount, 0);

  if (totalAmount === 0) return null;

  return (
    <div class="mt-3">
      <p class="mb-1.5 text-xs font-semibold text-slate-600">{title}</p>
      {Object.entries(buckets).map(([key, bucket]) => (
        <div key={key} class="mb-1.5 flex items-center gap-2">
          <span class="w-20 text-xs text-slate-500">{BUCKET_LABELS[key]}</span>
          <div class="flex-1">
            <div
              class={`h-4 rounded ${BUCKET_COLORS[key]}`}
              style={{ width: `${Math.max((bucket.amount / maxAmount) * 100, bucket.amount > 0 ? 4 : 0)}%` }}
            />
          </div>
          <span class="w-16 text-right text-xs font-medium text-slate-700">
            {formatCurrency(bucket.amount)}
          </span>
          <span class="w-8 text-right text-xs text-slate-400">{bucket.count}</span>
        </div>
      ))}
    </div>
  );
}

export function AgingBreakdown({ aging }: { aging: Aging }) {
  return (
    <div class="mb-4 rounded-lg border border-slate-200 bg-white p-3">
      <h2 class="text-sm font-bold text-slate-700">Aging Analysis</h2>
      <AgingSection title="Delivery Challans" buckets={aging.dc_aging} />
      <AgingSection title="Payments" buckets={aging.payment_aging} />
      <AgingSection title="FG Receipts" buckets={aging.fg_aging} />
    </div>
  );
}
