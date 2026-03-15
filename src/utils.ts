export function formatCurrency(amount: number): string {
  if (amount === 0) return '0';
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  // Indian numbering: 1,00,000 format
  if (abs >= 10000000) {
    return sign + (abs / 10000000).toFixed(2) + ' Cr';
  }
  if (abs >= 100000) {
    return sign + (abs / 100000).toFixed(2) + ' L';
  }

  // Format with Indian commas
  const str = Math.round(abs).toString();
  let result = '';
  const len = str.length;
  for (let i = 0; i < len; i++) {
    if (i > 0 && i < len) {
      const fromRight = len - i;
      if (fromRight === 3 || (fromRight > 3 && (fromRight - 3) % 2 === 0)) {
        result += ',';
      }
    }
    result += str[i];
  }
  return sign + result;
}

export function formatNumber(n: number): string {
  if (n === 0) return '0';
  return Math.round(n).toLocaleString('en-IN');
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatTimestamp(dateStr: string | null | undefined): string {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const hours = d.getHours();
  const mins = d.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h12 = hours % 12 || 12;
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}, ${h12}:${mins} ${ampm}`;
}

export function pctChange(current: number, prev: number): string {
  if (prev === 0) return current > 0 ? '+100%' : '--';
  const pct = Math.round(((current - prev) / Math.abs(prev)) * 100);
  return pct >= 0 ? `+${pct}%` : `${pct}%`;
}
