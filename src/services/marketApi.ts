import {
  marketOverview,
  screenerResults,
  watchlist,
  marketAlerts,
  portfolioHoldings,
} from '../data/mockData';
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
  if (json.Note || json.Information || json['Error Message']) {
    throw new Error(json.Note ?? json.Information ?? json['Error Message']);
  }
  return json;
};

const parseQuote = (symbol: string, name: string, quote: Record<string, string>): Stock => {
  const price = Number(quote['05. price']);
  const change = Number(quote['09. change']);
  const changePercent = Number.parseFloat(quote['10. change percent']?.replace('%', '') ?? '0');
  const volume = Number(quote['06. volume']);

  if (![price, change, changePercent, volume].every(Number.isFinite) || price <= 0) {
    throw new Error(`No valid quote returned for ${symbol}.`);
  }

  return {
    symbol,
    name,
    price,
    change,
    changePercent,
    volume,
    marketCap: '—',
    sentiment: changePercent > 0 ? 'Bullish' : changePercent < 0 ? 'Bearish' : 'Neutral',
    // Quote endpoint does not return a chart series; fetch candles separately for chart analysis.
    sparkline: [],
  };
};

export const isLiveMarketDataConfigured = () => Boolean(API_KEY);

export const getStockQuote = async (symbol: string, fallback?: Stock): Promise<Stock> => {
  const normalized = symbol.trim().toUpperCase();
  const cached = quoteCache.get(normalized);
  if (cached && cached.expiresAt > Date.now()) return cached.stock;

  const existing = fallback ?? catalog.find((stock) => stock.symbol.toUpperCase() === normalized);
  const name = existing?.name ?? normalized;
  try {
    const data = await requestJson({ function: 'GLOBAL_QUOTE', symbol: normalized });
    const quote = data['Global Quote'] as Record<string, string> | undefined;
    if (!quote || !quote['05. price']) throw new Error(`No quote available for ${normalized}.`);
    const stock = parseQuote(normalized, name, quote);
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
  if (!API_KEY) {
    const lower = keyword.toLowerCase();
    return catalog.filter((stock) =>
      stock.symbol.toLowerCase().includes(lower) || stock.name.toLowerCase().includes(lower),
    ).slice(0, 5);
  }

  try {
    const data = await requestJson({ function: 'SYMBOL_SEARCH', keywords: keyword });
    const matches = Array.isArray(data.bestMatches) ? data.bestMatches : [];
    return matches.slice(0, 5).map((match: Record<string, string>) => {
      const symbol = match['1. symbol'];
      const existing = catalog.find((stock) => stock.symbol.toUpperCase() === symbol?.toUpperCase());
      return existing ?? {
        symbol,
        name: match['2. name'] ?? symbol,
        price: 0,
        change: 0,
        changePercent: 0,
        volume: 0,
        marketCap: '—',
        sentiment: 'Neutral',
        sparkline: [],
      };
    }).filter((stock: Stock) => Boolean(stock.symbol));
  } catch (error) {
    console.warn('Symbol search failed; showing local matches instead.', error);
    const lower = keyword.toLowerCase();
    return catalog.filter((stock) =>
      stock.symbol.toLowerCase().includes(lower) || stock.name.toLowerCase().includes(lower),
    ).slice(0, 5);
  }
};

export const getMarketOverview = async (): Promise<MarketOverview[]> => marketOverview;

export const getWatchlist = async (): Promise<Stock[]> => {
  // Fetch only a few quotes per screen load; the provider's free tier is request-limited.
  const symbols = watchlist.slice(0, 4);
  return Promise.all(symbols.map((stock) => getStockQuote(stock.symbol, stock)));
};

export const getScreenerResults = async (): Promise<Stock[]> => {
  const symbols = screenerResults.slice(0, 5);
  return Promise.all(symbols.map((stock) => getStockQuote(stock.symbol, stock)));
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const buildPatternInsight = (stock: Stock): PatternInsight => {
  const series = stock.sparkline.length >= 5
    ? stock.sparkline
    : [stock.price * 0.97, stock.price * 0.985, stock.price * 0.99, stock.price * 1.005, stock.price];
  const first = series[0];
  const last = series[series.length - 1];
  const midpoint = series[Math.floor(series.length / 2)];
  const delta = last - first;
  const recentTrend = last - midpoint;
  const rising = series.slice(1).filter((value, index) => value > series[index]).length;
  const falling = series.slice(1).filter((value, index) => value < series[index]).length;

  let direction: PatternInsight['direction'] = 'Neutral';
  let pattern = 'Range bound';
  if (delta > 0 && recentTrend > 0 && rising > falling) {
    direction = 'Upward';
    pattern = 'Bullish continuation';
  } else if (delta < 0 && recentTrend < 0 && falling > rising) {
    direction = 'Downward';
    pattern = 'Bearish continuation';
  } else if (rising > falling) {
    direction = 'Upward';
    pattern = 'Short-term momentum';
  } else if (falling > rising) {
    direction = 'Downward';
    pattern = 'Short-term weakness';
  }

  const consistency = Math.max(rising, falling) / Math.max(series.length - 1, 1);
  const movePct = Math.abs((last - first) / Math.max(Math.abs(first), 0.01)) * 100;
  const confidence = clamp(Math.round(35 + consistency * 30 + Math.min(movePct * 3, 25)), 35, 80);
  const directionSign = direction === 'Upward' ? '+' : direction === 'Downward' ? '−' : '';
  const expectedMove = direction === 'Neutral'
    ? 'No clear directional bias'
    : `${direction} bias; recent range ${directionSign}${movePct.toFixed(1)}% (historical move, not a forecast)`;

  return {
    symbol: stock.symbol,
    name: stock.name,
    direction,
    confidence,
    pattern,
    expectedMove,
    support: Number(Math.min(...series).toFixed(2)),
    resistance: Number(Math.max(...series).toFixed(2)),
    lastPrice: Number(stock.price.toFixed(2)),
    changePercent: stock.changePercent,
    volume: stock.volume,
    score: direction === 'Upward' ? confidence : direction === 'Downward' ? -confidence : 0,
    note: 'Rule-based technical summary of recent closes; not machine-learning output or a validated probability.',
  };
};

export const getPatternInsights = async (): Promise<PatternInsight[]> => {
  const stocks = await getScreenerResults();
  const withCandles = await Promise.all(stocks.map(async (stock) => {
    try {
      const prices = await getCandlesForSymbol(stock.symbol);
      return { ...stock, sparkline: prices };
    } catch {
      return stock;
    }
  }));
  return withCandles.map(buildPatternInsight).sort((a, b) => Math.abs(b.score) - Math.abs(a.score));
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
        if (prices.length > 0 && prices.every(Number.isFinite)) {
          candleCache.set(normalized, { values: prices, expiresAt: Date.now() + CACHE_MS });
          return prices;
        }
      }
    } catch (error) {
      console.warn(`Could not fetch daily candles for ${normalized}; using sample series if available.`, error);
    }
  }

  const fallback = catalog.find((stock) => stock.symbol.toUpperCase() === normalized)?.sparkline;
  if (fallback?.length) return fallback;
  return [];
};
