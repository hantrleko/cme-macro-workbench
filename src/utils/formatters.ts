export function formatPct(val: number, decimals = 2, showSign = false): string {
  const formatted = val.toFixed(decimals);
  if (showSign && val > 0) return `+${formatted}%`;
  return `${formatted}%`;
}

export function formatBps(bps: number, showSign = true): string {
  const rounded = Math.round(bps);
  if (showSign && rounded > 0) return `+${rounded} bps`;
  return `${rounded} bps`;
}

export function formatSigned(val: number, decimals = 2): string {
  const formatted = val.toFixed(decimals);
  return val > 0 ? `+${formatted}` : formatted;
}
