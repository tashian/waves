/**
 * Format a frequency value with appropriate units
 */
export function formatFrequency(hz: number): string {
  if (hz >= 1000) {
    return `${(hz / 1000).toFixed(1)}kHz`;
  }
  return `${Math.round(hz)}Hz`;
}

/**
 * Format a time value in seconds with appropriate units
 */
export function formatTime(seconds: number): string {
  if (seconds < 0.01) {
    return `${(seconds * 1000).toFixed(1)}ms`;
  }
  if (seconds < 1) {
    return `${Math.round(seconds * 1000)}ms`;
  }
  return `${seconds.toFixed(2)}s`;
}

/**
 * Format a percentage value
 */
export function formatPercent(value: number, decimals: number = 0): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format a bipolar percentage value with sign
 */
export function formatBipolarPercent(value: number, decimals: number = 0): string {
  const percent = value * 100;
  const sign = percent > 0 ? '+' : '';
  return `${sign}${percent.toFixed(decimals)}%`;
}

/**
 * Format a decibel value
 */
export function formatDecibels(db: number, decimals: number = 1): string {
  const sign = db > 0 ? '+' : '';
  return `${sign}${db.toFixed(decimals)}dB`;
}

/**
 * Format a generic numeric value with optional unit
 */
export function formatValue(value: number, unit?: string, decimals: number = 0): string {
  const formatted = decimals > 0 ? value.toFixed(decimals) : Math.round(value).toString();
  return unit ? `${formatted}${unit}` : formatted;
}
