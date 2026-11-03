import { PatternInsight, Stock } from '../types';

export type BreezeScannerQuote = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  candles: number[];
};

type BreezeScannerResponse = { results?: BreezeScannerQuote[] };

const API_URL = process.env.EXPO_PUBLIC_BREEZE_API_URL?.trim().replace(/\/$/, '') ?? '';

export const isBreezeConfigured = () => Boolean(API_URL);

export const fetchBreezeScannerResults = async (symbols: string[]): Promise<BreezeScannerQuote[]> => {
  if (!API_URL) throw new Error('Breeze backend URL is not configured.');
  const query = encodeURIComponent(symbols.join(','));
  const response = await fetch(`${API_URL}/api/scanner?symbols=${query}`);
  if (!response.ok) throw new Error(`Breeze backend request failed (${response.status}).`);
  const payload = (await response.json()) as BreezeScannerResponse;
  if (!Array.isArray(payload.results)) throw new Error('Breeze backend returned an unexpected response.');
  return payload.results.filter((item) =>
    item && typeof item.symbol === 'string' &&
    Number.isFinite(item.price) && Number.isFinite(item.changePercent) &&
    Number.isFinite(item.volume) && Array.isArray(item.candles),
  );
};

export const breezeResultToStock = (item: BreezeScannerQuote): Stock => ({
  symbol: item.symbol,
  name: item.name,
  price: item.price,
  change: item.change,
  changePercent: item.changePercent,
  volume: item.volume,
  marketCap: '—',
  sentiment: item.changePercent > 0 ? 'Bullish' : item.changePercent < 0 ? 'Bearish' : 'Neutral',
  sparkline: item.candles,
});

// Display label for the price move is deliberately historical context, not a forecast.
export const breezeResultToInsight = (
  item: BreezeScannerQuote,
  analyze: (stock: Stock, closes: number[]) => PatternInsight,
): PatternInsight => analyze(breezeResultToStock(item), item.candles);
