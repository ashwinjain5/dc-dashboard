import type { Meta } from '../types';
import { formatTimestamp } from '../utils';

export function Header({ meta }: { meta: Meta }) {
  return (
    <div class="mb-4">
      <h1 class="text-lg font-bold text-slate-800">Dhariwal DC Dashboard</h1>
      <p class="text-xs text-slate-500">
        Data as of {formatTimestamp(meta.snapshot_date)}
      </p>
    </div>
  );
}
