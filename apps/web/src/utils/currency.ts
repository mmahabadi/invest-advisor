// EUR/USD exchange rate - in production, this would be fetched from an API
// For now using a reasonable approximate rate
const EUR_USD_RATE = 0.92; // 1 USD = 0.92 EUR (approximate)

/**
 * Convert USD to EUR
 */
export function usdToEur(usdAmount: number | string | null | undefined): number {
  const amount = toNumber(usdAmount);
  return amount * EUR_USD_RATE;
}

/**
 * Format a number as EUR currency
 */
export function formatEUR(value: number | string | null | undefined): string {
  const numValue = toNumber(value);
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numValue);
}

/**
 * Format a number as EUR currency, converting from USD first
 */
export function formatUSDasEUR(usdValue: number | string | null | undefined): string {
  const eurValue = usdToEur(usdValue);
  return formatEUR(eurValue);
}

/**
 * Safely convert any value to a number
 */
function toNumber(value: unknown): number {
  if (value == null) return 0;
  const num = Number(value);
  return isNaN(num) ? 0 : num;
}

/**
 * Format a number with K, M, B suffixes (in EUR)
 */
export function formatCompactEUR(value: number | string | null | undefined): string {
  const numValue = toNumber(value);
  
  if (Math.abs(numValue) >= 1e9) {
    return `€${(numValue / 1e9).toFixed(1)}B`;
  }
  if (Math.abs(numValue) >= 1e6) {
    return `€${(numValue / 1e6).toFixed(1)}M`;
  }
  if (Math.abs(numValue) >= 1e3) {
    return `€${(numValue / 1e3).toFixed(1)}K`;
  }
  return formatEUR(numValue);
}
