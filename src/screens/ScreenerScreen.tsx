import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme';
import { getPatternInsights, isBreezeMarketDataConfigured } from '../services/marketApi';
import { PatternInsight, SignalDirection } from '../types';

const filters: Array<'All' | SignalDirection> = ['All', 'Upward', 'Downward', 'Neutral'];

export default function ScreenerScreen() {
  const navigation = useNavigation<any>();
  const [items, setItems] = useState<PatternInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'All' | SignalDirection>('All');

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const results = await getPatternInsights();
      setItems(results.slice().sort((a, b) => Math.abs(b.score) - Math.abs(a.score)));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load scanner results.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const visibleItems = useMemo(
    () => selectedFilter === 'All' ? items : items.filter((item) => item.direction === selectedFilter),
    [items, selectedFilter],
  );
  const count = (direction: SignalDirection) => items.filter((item) => item.direction === direction).length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.green} />}
    >
      <View style={styles.header}>
        <View><Text style={styles.eyebrow}>MARKET SIGNALS</Text><Text style={styles.title}>Scanner</Text></View>
        <TouchableOpacity style={styles.refreshButton} onPress={() => load(true)} disabled={loading || refreshing}>
          <Text style={styles.refreshText}>{refreshing ? 'Updating…' : '↻ Refresh'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sourceBanner}>
        <View style={[styles.sourceDot, isBreezeMarketDataConfigured() ? styles.configuredDot : styles.sampleDot]} />
        <Text style={styles.sourceText}>
          {isBreezeMarketDataConfigured() ? 'Breeze endpoint configured · values depend on backend session' : 'Sample market data · Breeze can be connected when backend is configured'}
        </Text>
      </View>

      <View style={styles.summaryRow}>
        <SummaryCard label="Upward" value={count('Upward')} color={colors.green} />
        <SummaryCard label="Downward" value={count('Downward')} color={colors.red} />
        <SummaryCard label="Neutral" value={count('Neutral')} color={colors.text} />
      </View>

      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>Rule-based technical signals</Text>
        <Text style={styles.noticeBody}>Pattern and signal strength summarize recent closing prices. Strength is not a probability or guaranteed forecast; this is not financial advice.</Text>
      </View>

      <View style={styles.filters}>
        {filters.map((filter) => (
          <TouchableOpacity key={filter} onPress={() => setSelectedFilter(filter)} style={[styles.filterChip, selectedFilter === filter && styles.activeFilterChip]}>
            <Text style={[styles.filterText, selectedFilter === filter && styles.activeFilterText]}>{filter}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.stateCard}><ActivityIndicator color={colors.green} /><Text style={styles.stateText}>Scanning recent price patterns…</Text></View>
      ) : error ? (
        <View style={styles.stateCard}>
          <Text style={styles.stateTitle}>Couldn’t load scanner</Text><Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity style={styles.tryAgainButton} onPress={() => load()}><Text style={styles.tryAgainText}>Try again</Text></TouchableOpacity>
        </View>
      ) : visibleItems.length === 0 ? (
        <View style={styles.stateCard}><Text style={styles.stateTitle}>No matching stocks</Text><Text style={styles.stateText}>Choose another direction filter.</Text></View>
      ) : visibleItems.map((insight) => {
        const signalColor = insight.direction === 'Upward' ? colors.green : insight.direction === 'Downward' ? colors.red : colors.blue;
        return (
          <TouchableOpacity key={insight.symbol} activeOpacity={0.85} style={styles.stockCard} onPress={() => navigation.navigate('StockDetail', { symbol: insight.symbol, name: insight.name })}>
            <View style={styles.cardHeader}>
              <View style={styles.stockIdentity}><Text style={styles.symbol}>{insight.symbol}</Text><Text style={styles.name} numberOfLines={1}>{insight.name}</Text></View>
              <View style={[styles.directionBadge, { borderColor: signalColor }]}><Text style={[styles.directionText, { color: signalColor }]}>{insight.direction === 'Upward' ? '↑ UPWARD' : insight.direction === 'Downward' ? '↓ DOWNWARD' : '↔ NEUTRAL'}</Text></View>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.price}>₹{insight.lastPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</Text>
              <Text style={[styles.change, { color: insight.changePercent >= 0 ? colors.green : colors.red }]}>{insight.changePercent >= 0 ? '+' : ''}{insight.changePercent.toFixed(2)}%</Text>
            </View>
            <View style={styles.patternRow}><Text style={styles.mutedLabel}>Pattern</Text><Text style={styles.pattern}>{insight.pattern}</Text></View>
            <View style={styles.strengthHeader}><Text style={styles.mutedLabel}>Signal strength</Text><Text style={[styles.strengthValue, { color: signalColor }]}>{insight.confidence}/100</Text></View>
            <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.min(100, Math.max(0, insight.confidence))}%`, backgroundColor: signalColor }]} /></View>
            <Text style={styles.expectedMove}>{insight.expectedMove}</Text>
            <View style={styles.levelsRow}>
              <View style={styles.level}><Text style={styles.levelLabel}>Sample support</Text><Text style={styles.levelValue}>₹{insight.support.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</Text></View>
              <View style={styles.levelDivider} />
              <View style={styles.level}><Text style={styles.levelLabel}>Sample resistance</Text><Text style={styles.levelValue}>₹{insight.resistance.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</Text></View>
            </View>
            <Text style={styles.note}>{insight.note}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return <View style={styles.summaryCard}><Text style={styles.summaryLabel}>{label}</Text><Text style={[styles.summaryValue, { color }]}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 18, paddingTop: 26, paddingBottom: 36 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  eyebrow: { color: colors.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1.4 },
  title: { color: colors.text, fontSize: 30, fontWeight: '800', marginTop: 3 },
  refreshButton: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12 },
  refreshText: { color: colors.text, fontWeight: '700', fontSize: 12 },
  sourceBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.panel, borderRadius: 10, padding: 10, marginBottom: 13 },
  sourceDot: { width: 7, height: 7, borderRadius: 5, marginRight: 8 },
  configuredDot: { backgroundColor: colors.green },
  sampleDot: { backgroundColor: colors.blue },
  sourceText: { color: colors.muted, fontSize: 10, flex: 1 },
  summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 13 },
  summaryCard: { flex: 1, backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, borderRadius: 13, padding: 11 },
  summaryLabel: { color: colors.muted, fontSize: 10 },
  summaryValue: { fontSize: 20, fontWeight: '800', marginTop: 4 },
  notice: { backgroundColor: '#111A2A', borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 14 },
  noticeTitle: { color: colors.text, fontSize: 12, fontWeight: '700', marginBottom: 4 },
  noticeBody: { color: colors.muted, fontSize: 10, lineHeight: 15 },
  filters: { flexDirection: 'row', gap: 7, marginBottom: 14 },
  filterChip: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  activeFilterChip: { backgroundColor: '#0F3B35', borderColor: colors.green },
  filterText: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  activeFilterText: { color: colors.green },
  stateCard: { backgroundColor: colors.card, borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  stateTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  stateText: { color: colors.muted, fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 9 },
  tryAgainButton: { marginTop: 12, backgroundColor: colors.green, paddingHorizontal: 15, paddingVertical: 9, borderRadius: 10 },
  tryAgainText: { color: colors.background, fontWeight: '800', fontSize: 12 },
  stockCard: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 13 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stockIdentity: { flex: 1, marginRight: 8 },
  symbol: { color: colors.text, fontSize: 19, fontWeight: '800' },
  name: { color: colors.muted, fontSize: 11, marginTop: 3 },
  directionBadge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6 },
  directionText: { fontSize: 10, fontWeight: '800' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 14, marginBottom: 13 },
  price: { color: colors.text, fontSize: 24, fontWeight: '800' },
  change: { fontSize: 12, fontWeight: '700', marginLeft: 9 },
  patternRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  mutedLabel: { color: colors.muted, fontSize: 11 },
  pattern: { color: colors.text, fontSize: 11, fontWeight: '700' },
  strengthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 },
  strengthValue: { fontSize: 12, fontWeight: '800' },
  progressTrack: { height: 6, backgroundColor: colors.panel, borderRadius: 8, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 8 },
  expectedMove: { color: colors.text, fontSize: 11, fontWeight: '700', marginTop: 13, marginBottom: 12 },
  levelsRow: { flexDirection: 'row', backgroundColor: colors.panel, borderRadius: 12, paddingVertical: 10 },
  level: { flex: 1, alignItems: 'center' },
  levelDivider: { width: 1, backgroundColor: colors.border },
  levelLabel: { color: colors.muted, fontSize: 9, marginBottom: 4 },
  levelValue: { color: colors.text, fontSize: 12, fontWeight: '700' },
  note: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 11 },
});
