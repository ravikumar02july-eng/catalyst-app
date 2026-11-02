import { marketOverview, screenerResults, watchlist, marketAlerts, portfolioHoldings } from './mockData';
import { MarketOverview, Stock, AlertItem, PortfolioHolding, PatternInsight } from '../types';

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const buildPatternInsight = (stock: Stock): PatternInsight => {
  const series = stock.sparkline.length ? stock.sparkline : [stock.price, stock.price * 0.98, stock.price, stock.price * 1.02, stock.price * 1.03, stock.price * 1.04, stock.price];
  const first = series[0];
  const last = series[series.length - 1];
  const mid = series[Math.floor(series.length / 2)];
  const delta = last - first;
  const trend = last - mid;
  const avg = series.reduce((sum, item) => sum + item, 0) / series.length;
  const positive = series.slice(1).filter((value, index) => value > series[index]).length;
  const negative = series.slice(1).filter((value, index) => value < series[index]).length;

  let direction: 'Upward' | 'Downward' | 'Neutral' = 'Neutral';
  let pattern = 'Range bound';

  if (delta > 0 && trend > 0) {
    direction = 'Upward';
    pattern = 'Bullish continuation';
  } else if (delta < 0 && trend < 0) {
    direction = 'Downward';
    pattern = 'Bearish breakdown';
  } else if (positive > negative) {
    direction = 'Upward';
    pattern = 'Momentum squeeze';
  } else if (negative > positive) {
    direction = 'Downward';
    pattern = 'Distribution phase';
  }

  const score = clamp(
    Math.round(
      (Math.abs(delta) / Math.max(avg * 0.04, 1)) * 18 +
        (positive - negative) * 8 +
        stock.changePercent * 6 +
        (direction === 'Upward' ? 20 : direction === 'Downward' ? -20 : 0)
    ),
    12,
    95
  );

  return {
    symbol: stock.symbol,
    name: stock.name,
    direction,
    confidence: clamp(Math.abs(score), 35, 92),
    pattern,
    expectedMove:
      direction === 'Upward'
        ? `Upward bias: +${Math.max(0.5, Math.abs(stock.changePercent)).toFixed(1)}%`
        : direction === 'Downward'
          ? `Downward bias: -${Math.max(0.5, Math.abs(stock.changePercent)).toFixed(1)}%`
          : 'Sideways bias: low conviction',
    support: Number((Math.min(...series) * 0.995).toFixed(2)),
    resistance: Number((Math.max(...series) * 1.005).toFixed(2)),
    lastPrice: Number(last.toFixed(2)),
    changePercent: stock.changePercent,
    volume: stock.volume,
    score,
    note: `${pattern} with ${direction === 'Upward' ? 'bullish participation' : direction === 'Downward' ? 'weakening demand' : 'balanced flow'} detected.`,
  };
};

export const getMarketOverview = async (): Promise<MarketOverview[]> => {
  return marketOverview;
};

export const getWatchlist = async (): Promise<Stock[]> => {
  return watchlist;
};

export const getScreenerResults = async (): Promise<Stock[]> => {
  return screenerResults;
};

export const getPatternInsights = async (): Promise<PatternInsight[]> => {
  return screenerResults.map(buildPatternInsight);
};

export const getAlerts = async (): Promise<AlertItem[]> => {
  return marketAlerts;
};

export const getPortfolio = async (): Promise<PortfolioHolding[]> => {
  return portfolioHoldings;
};

export const getCandlesForSymbol = async (symbol: string) => {
  const seedMap: Record<string, number[]> = {
    AAPL: [182, 186, 184, 190, 188, 196, 201, 205, 212, 218],
    MSFT: [420, 425, 430, 438, 440, 448, 451, 454, 459, 455],
    TSLA: [210, 214, 217, 220, 228, 234, 240, 247, 244, 247],
    RELIANCE: [2920, 2965, 3010, 3040, 3072, 3104, 3120, 3145, 3138, 3145],
    INFY: [1450, 1488, 1495, 1520, 1545, 1560, 1582, 1598, 1606, 1598],
    default: [100, 102, 101, 105, 104, 108, 110, 109, 112, 115],
  };

  return seedMap[symbol] ?? seedMap.default;
};
