// EUR/USD exchange rate - updated periodically
// Current rate as of Feb 2026 (approximate)
const USD_TO_EUR_RATE = 0.92; // 1 USD = 0.92 EUR

/**
 * Safely convert any value to a number
 */
function toNumber(value: unknown): number {
  if (value == null) return 0;
  const num = Number(value);
  return isNaN(num) ? 0 : num;
}

/**
 * Check if a symbol is from a European exchange (prices already in EUR)
 */
export function isEuropeanSymbol(symbol: string | null | undefined): boolean {
  if (!symbol) return false;
  const upperSymbol = symbol.toUpperCase();
  // German (Xetra), Amsterdam, Paris, Milan exchanges use EUR
  return upperSymbol.endsWith('.DE') || 
         upperSymbol.endsWith('.AS') || 
         upperSymbol.endsWith('.PA') || 
         upperSymbol.endsWith('.MI');
}

/**
 * Check if symbol uses GBP (London Stock Exchange)
 */
export function isGBPSymbol(symbol: string | null | undefined): boolean {
  if (!symbol) return false;
  return symbol.toUpperCase().endsWith('.L');
}

/**
 * Check if symbol uses CHF (Swiss Exchange)
 */
export function isCHFSymbol(symbol: string | null | undefined): boolean {
  if (!symbol) return false;
  return symbol.toUpperCase().endsWith('.SW');
}

/**
 * Convert USD to EUR
 */
export function usdToEur(usdAmount: number | string | null | undefined): number {
  const amount = toNumber(usdAmount);
  return amount * USD_TO_EUR_RATE;
}

/**
 * Convert price to EUR based on the symbol's native currency
 */
export function convertToEUR(
  value: number | string | null | undefined, 
  symbol?: string | null
): number {
  const numValue = toNumber(value);
  
  // If European symbol, price is already in EUR
  if (isEuropeanSymbol(symbol)) {
    return numValue;
  }
  
  // If GBP symbol, convert GBP to EUR (approximate rate)
  if (isGBPSymbol(symbol)) {
    return numValue * 1.17; // 1 GBP ≈ 1.17 EUR
  }
  
  // If CHF symbol, convert CHF to EUR (approximate rate)
  if (isCHFSymbol(symbol)) {
    return numValue * 1.06; // 1 CHF ≈ 1.06 EUR
  }
  
  // Default: assume USD and convert to EUR
  return numValue * USD_TO_EUR_RATE;
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
 * Format price as EUR, converting from the symbol's native currency
 */
export function formatPriceEUR(
  value: number | string | null | undefined,
  symbol?: string | null
): string {
  const eurValue = convertToEUR(value, symbol);
  return formatEUR(eurValue);
}

/**
 * Format a number with K, M, B suffixes (in EUR)
 */
export function formatCompactEUR(
  value: number | string | null | undefined,
  symbol?: string | null
): string {
  const numValue = convertToEUR(value, symbol);
  
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
