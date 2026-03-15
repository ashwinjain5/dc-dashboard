export const PERIOD_OPTIONS = [
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'Last 3 Months', value: '3months' },
  { label: 'Last 6 Months', value: '6months' },
  { label: 'Last 1 Year', value: '1year' },
  { label: 'All Time', value: 'all' },
] as const;

export type PeriodValue = typeof PERIOD_OPTIONS[number]['value'];

export function getDateCutoff(period: PeriodValue): Date | null {
  if (period === 'all') return null;
  const now = new Date();
  switch (period) {
    case 'week': {
      const d = new Date(now);
      d.setDate(d.getDate() - d.getDay()); // start of week (Sunday)
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case 'month': {
      return new Date(now.getFullYear(), now.getMonth(), 1);
    }
    case '3months': {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 3);
      return d;
    }
    case '6months': {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 6);
      return d;
    }
    case '1year': {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - 1);
      return d;
    }
  }
}

export function isInPeriod(dateStr: string, cutoff: Date | null): boolean {
  if (!cutoff) return true;
  if (!dateStr) return false;
  return new Date(dateStr) >= cutoff;
}

export function isInDateRange(dateStr: string, from: string, to: string): boolean {
  if (!dateStr) return false;
  if (from && dateStr < from) return false;
  if (to && dateStr > to) return false;
  return true;
}
