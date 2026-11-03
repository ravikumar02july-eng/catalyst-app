import {
  marketOverview,
  screenerResults,
  watchlist,
  marketAlerts,
  portfolioHoldings,
} from '../data/mockData';
import { fetchBreezeScannerResults, breezeResultToInsight, isBreezeConfigured } from './breezeApi';
import {
  AlertItem,
  MarketOverview,
  PatternInsight,
  PortfolioHolding,
  Stock,
} from '../types';

// Alpha Vantage key is supplied at build time through Expo's EXPO_PUBLIC_ env vars.
// This is suitable for a local MVP only: public client keys can be extracted from an app.
const API_KEY = process.env.EXPO_PUBLIC_ALPHA_VANTAGE_API_KEY?.trim() ?? '';
const API_ROOT = 'https://www.alphavantage.co/query';
const CACHE_MS = 60_000;
const quoteCache = new Map<string, { stock: Stock; expiresAt: number }>();
const candleCache = new Map<string, { values: number[]; expiresAt: number }>();
const catalog: Stock[] = [...screenerResults, ...watchlist].filter(
  (stock, index, list) => list.findIndex((candidate) => candidate.symbol === stock.symbol) === index,
);

const requestJson = async (params: Record<string, string>) => {
  if (!API_KEY) throw new Error('Missing API key. Add EXPO_PUBLIC_ALPHA_VANTAGE_API_KEY to your .env file.');
  const query = new URLSearchParams({ ...params, apikey: API_KEY });
  const response = await fetch(`${API_ROOT}?${query.toString()}`);
  if (!response.ok) throw new Error(`Market data request failed (${response.status}).`);
  const json = await response.json();
  if (json.Note || json.Information || json['Error Message']) throw new Error(json.Note ?? json.Information ?? json['Error Message']);
  return json;
};

const parseQuote = (symbol: string, name: string, quote: Record<string, string>): Stock => {
  const price = Number(quote['05. price']);
  const change = Number(quote['09. change']);
  const changePercent = Number.parseFloat(quote['10. change percent']?.replace('%', '') ?? '0');
  const volume = Number(quote['06. volume']);
  if (![price, change, changePercent, volume].every(Number.isFinite) || price <= 0) throw new Error(`No valid quote returned for ${symbol}.`);
  return {
    symbol, name, price, change, changePercent, volume, marketCap: '—',
    sentiment: changePercent > 0 ? 'Bullish' : changePercent < 0 ? 'Bearish' : 'Neutral',
    sparkline: [],
  };
};

export const isLiveMarketDataConfigured = () => Boolean(API_KEY);
export const isBreezeMarketDataConfigured = isBreezeConfigured;

export const getStockQuote = async (symbol: string, fallback?: Stock): Promise<Stock> => {
  const normalized = symbol.trim().toUpperCase();
  const cached = quoteCache.get(normalized);
  if (cached && cached.expiresAt > Date.now()) return cached.stock;
  const existing = fallback ?? catalog.find((stock) => stock.symbol.toUpperCase() === normalized);
  try {
    const data = await requestJson({ function: 'GLOBAL_QUOTE', symbol: normalized });
    const quote = data['Global Quote'] as Record<string, string> | undefined;
    if (!quote || !quote['05. price']) throw new Error(`No quote available for ${normalized}.`);
    const stock = parseQuote(normalized, existing?.name ?? normalized, quote);
    quoteCache.set(normalized, { stock, expiresAt: Date.now() + CACHE_MS });
    return stock;
  } catch (error) {
    if (existing) return existing;
    throw error;
  }
};

export const searchStocks = async (query: string): Promise<Stock[]> => {
  const keyword = query.trim();
  if (!keyword) return [];
  const localMatches = () => {
    const lower = keyword.toLowerCase();
    return catalog.filter((stock) => stock.symbol.toLowerCase().includes(lower) || stock.name.toLowerCase().includes(lower)).slice(0, 5);
  };
  if (!API_KEY) return localMatches();
  try {
    const data = await requestJson({ function: 'SYMBOL_SEARCH', keywords: keyword });
    const matches = Array.isArray(data.bestMatches) ? data.bestMatches : [];
    return matches.slice(0, 5).map((match: Record<string, string>) => {
      const symbol = match['1. symbol'];
      return catalog.find((stock) => stock.symbol.toUpperCase() === symbol?.toUpperCase()) ?? {
        symbol, name: match['2. name'] ?? symbol, price: 0, change: 0, changePercent: 0,
        volume: 0, marketCap: '—', sentiment: 'Neutral', sparkline: [],
      };
    }).filter((stock: Stock) => Boolean(stock.symbol));
  } catch (error) {
    console.warn('Symbol search failed; showing local matches instead.', error);
    return localMatches();
  }
};

export const getMarketOverview = async (): Promise<MarketOverview[]> => marketOverview;
export const getWatchlist = async (): Promise<Stock[]> => watchlist;
export const getScreenerResults = async (): Promise<Stock[]> => screenerResults;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const buildPatternInsight = (stock: Stock, closes: number[] = stock.sparkline): PatternInsight => {
  const valid = closes.filter((value) => Number.isFinite(value) && value > 0);
  const series = valid.length >= 5 ? valid : stock.sparkline.length >= 5 ? stock.sparkline : [stock.price * 0.97, stock.price * 0.985, stock.price * 0.99, stock.price * 1.005, stock.price];
  const first = series[0];
  const last = series[series.length - 1];
  const recent = series.slice(-Math.min(5, series.length));
  const older = series.slice(-Math.min(10, series.length), -Math.min(5, series.length));
  const recentMean = recent.reduce((sum, value) => sum + value, 0) / recent.length;
  const olderMean = older.length ? older.reduce((sum, value) => sum + value, 0) / older.length : recentMean;
  const previous = series.slice(0, -1);
  const previousHigh = Math.max(...previous.slice(-Math.min(20, previous.length)));
  const previousLow = Math.min(...previous.slice(-Math.min(20, previous.length)));
  const rises = series.slice(1).filter((value, index) => value > series[index]).length;
  const falls = series.slice(1).filter((value, index) => value < series[index]).length;
  const risingTrend = recentMean > olderMean;
  const fallingTrend = recentMean < olderMean;

  let direction: PatternInsight['direction'] = 'Neutral';
  let pattern = 'Range bound';
  if (last > previousHigh && risingTrend) {
    direction = 'Upward'; pattern = 'Closing-price breakout';
  } else if (last < previousLow && fallingTrend) {
    direction = 'Downward'; pattern = 'Closing-price breakdown';
  } else if (risingTrend && rises > falls) {
    direction = 'Upward'; pattern = 'Higher short-term trend';
  } else if (fallingTrend && falls > rises) {
    direction = 'Downward'; pattern = 'Lower short-term trend';
  }

  const trendMovePct = Math.abs((recentMean - olderMean) / Math.max(Math.abs(olderMean), 0.01)) * 100;
  const consistency = Math.max(rises, falls) / Math.max(series.length - 1, 1);
  const confidence = clamp(Math.round(35 + consistency * 25 + Math.min(trendMovePct * 4, 20)), 35, 80);
  const historicalMovePct = Math.abs((last - first) / Math.max(Math.abs(first), 0.01)) * 100;
  return {
    symbol: stock.symbol,
    name: stock.name,
    direction,
    confidence,
    pattern,
    expectedMove: direction === 'Neutral'
      ? 'No clear directional bias in recent closes'
      : `${direction} bias; observed ${historicalMovePct.toFixed(1)}% move across sampled closes (not a forecast)`,
    support: Number(Math.min(...series).toFixed(2)),
    resistance: Number(Math.max(...series).toFixed(2)),
    lastPrice: Number(stock.price.toFixed(2)),
    changePercent: stock.changePercent,
    volume: stock.volume,
    score: direction === 'Upward' ? confidence : direction === 'Downward' ? -confidence : 0,
    note: 'Rule-based technical analysis of recent closing prices. Signal strength is not a validated probability or investment advice.',
  };
};

export const getPatternInsights = async (): Promise<PatternInsight[]> => {
  if (isBreezeConfigured()) {
    try {
      const liveResults = await fetchBreezeScannerResults(watchlist.map((stock) => stock.symbol));
      if (liveResults.length > 0) {
        return liveResults
          .map((item) => breezeResultToInsight(item, buildPatternInsight))
          .sort((a, b) => Math.abs(b.score) - Math.abs(a.score));
      }
    } catch (error) {
      console.warn('Breeze scanner unavailable; using local sample data.', error);
    }
  }

  return watchlist
    .map((stock) => buildPatternInsight(stock))
    .sort((a, b) => Math.abs(b.score) - Math.abs(a.score));
};

export const getAlerts = async (): Promise<AlertItem[]> => marketAlerts;
export const getPortfolio = async (): Promise<PortfolioHolding[]> => portfolioHoldings;

export const getCandlesForSymbol = async (symbol: string): Promise<number[]> => {
  const normalized = symbol.trim().toUpperCase();
  const cached = candleCache.get(normalized);
  if (cached && cached.expiresAt > Date.now()) return cached.values;
  if (API_KEY) {
    try {
      const data = await requestJson({ function: 'TIME_SERIES_DAILY', symbol: normalized, outputsize: 'compact' });
      const series = data['Time Series (Daily)'] as Record<string, Record<string, string>> | undefined;
      if (series) {
        const prices = Object.keys(series).sort().slice(-30).map((date) => Number(series[date]['4. close']));
        if (prices.length && prices.every(Number.isFinite)) {
          candleCache.set(normalized, { values: prices, expiresAt: Date.now() + CACHE_MS });
          return prices;
        }
      }
    } catch (error) {
      console.warn(`Could not fetch daily candles for ${normalized}; using sample series if available.`, error);
    }
  }
  return catalog.find((stock) => stock.symbol.toUpperCase() === normalized)?.sparkline ?? [];
};
