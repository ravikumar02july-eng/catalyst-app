import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme';
import { getPatternInsights } from '../services/marketApi';
import { PatternInsight } from '../types';

export default function ScreenerScreen() {
  const navigation = useNavigation<any>();
  const [items, setItems] = useState<PatternInsight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const insights = await getPatternInsights();
        if (mounted) setItems([...insights].sort((a, b) => b.confidence - a.confidence));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>MARKET SIGNALS</Text>
          <Text style={styles.title}>Scanner</Text>
        </View>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Pattern scan</Text>
        </View>
      </View>

      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>Directional analysis, not a prediction</Text>
        <Text style={styles.noticeBody}>
          Signals are heuristic chart summaries and are not statistically validated probabilities or financial advice.
        </Text>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.green} />
          <Text style={styles.loadingText}>Analyzing chart patterns…</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No scanner results</Text>
          <Text style={styles.emptyText}>Try again when market data is available.</Text>
        </View>
      ) : (
        items.map((insight) => {
          const upward = insight.direction === 'Upward';
          const downward = insight.direction === 'Downward';
          const signalColor = upward ? colors.green : downward ? colors.red : colors.blue;

          return (
            <TouchableOpacity
              key={insight.symbol}
              activeOpacity={0.85}
              style={styles.card}
              onPress={() => navigation.navigate('StockDetail', { symbol: insight.symbol, name: insight.name })}
            >
              <View style={styles.cardHeader}>
                <View style={styles.stockIdentity}>
                  <Text style={styles.symbol}>{insight.symbol}</Text>
                  <Text style={styles.companyName} numberOfLines={1}>{insight.name}</Text>
                </View>
                <View style={[styles.directionBadge, { borderColor: signalColor }]}>
                  <Text style={[styles.directionText, { color: signalColor }]}>
                    {upward ? '↑ UPWARD' : downward ? '↓ DOWNWARD' : '↔ NEUTRAL'}
                  </Text>
                </View>
              </View>

              <View style={styles.priceRow}>
                <Text style={styles.lastPrice}>${insight.lastPrice.toFixed(2)}</Text>
                <Text style={[styles.change, { color: insight.changePercent >= 0 ? colors.green : colors.red }]}>
                  {insight.changePercent >= 0 ? '+' : ''}{insight.changePercent.toFixed(2)}%
                </Text>
              </View>

              <View style={styles.patternRow}>
                <Text style={styles.patternLabel}>Chart pattern</Text>
                <Text style={styles.patternName}>{insight.pattern}</Text>
              </View>

              <View style={styles.confidenceHeader}>
                <Text style={styles.metaLabel}>Signal strength</Text>
                <Text style={[styles.confidence, { color: signalColor }]}>{insight.confidence}%</Text>
              </View>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${insight.confidence}%`, backgroundColor: signalColor }]} />
              </View>

              <Text style={styles.expectedMove}>{insight.expectedMove}</Text>
              <View style={styles.levelsRow}>
                <View style={styles.levelBox}>
                  <Text style={styles.levelLabel}>Support</Text>
                  <Text style={styles.levelValue}>${insight.support.toFixed(2)}</Text>
                </View>
                <View style={styles.levelDivider} />
                <View style={styles.levelBox}>
                  <Text style={styles.levelLabel}>Resistance</Text>
                  <Text style={styles.levelValue}>${insight.resistance.toFixed(2)}</Text>
                </View>
              </View>
              <Text style={styles.note}>{insight.note}</Text>
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 18, paddingTop: 28, paddingBottom: 36 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  eyebrow: { color: colors.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1.4 },
  title: { color: colors.text, fontSize: 30, fontWeight: '800', marginTop: 3 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.panel, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 8 },
  liveDot: { width: 7, height: 7, borderRadius: 5, backgroundColor: colors.green, marginRight: 7 },
  liveText: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  notice: { backgroundColor: '#111A2A', borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 13, marginBottom: 16 },
  noticeTitle: { color: colors.text, fontSize: 12, fontWeight: '700', marginBottom: 4 },
  noticeBody: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  loading: { padding: 28, alignItems: 'center' },
  loadingText: { color: colors.muted, marginTop: 10, fontSize: 12 },
  emptyCard: { backgroundColor: colors.card, borderRadius: 16, padding: 20, alignItems: 'center' },
  emptyTitle: { color: colors.text, fontWeight: '700', fontSize: 16 },
  emptyText: { color: colors.muted, marginTop: 6, fontSize: 12 },
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 13 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stockIdentity: { flex: 1, marginRight: 8 },
  symbol: { color: colors.text, fontSize: 19, fontWeight: '800' },
  companyName: { color: colors.muted, fontSize: 11, marginTop: 3 },
  directionBadge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6 },
  directionText: { fontSize: 10, fontWeight: '800' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 14, marginBottom: 14 },
  lastPrice: { color: colors.text, fontSize: 24, fontWeight: '800' },
  change: { fontSize: 12, fontWeight: '700', marginLeft: 9 },
  patternRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  patternLabel: { color: colors.muted, fontSize: 11 },
  patternName: { color: colors.text, fontSize: 11, fontWeight: '700' },
  confidenceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 },
  metaLabel: { color: colors.muted, fontSize: 11 },
  confidence: { fontSize: 12, fontWeight: '800' },
  track: { height: 6, backgroundColor: colors.panel, borderRadius: 8, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 8 },
  expectedMove: { color: colors.text, fontSize: 12, fontWeight: '700', marginTop: 13, marginBottom: 12 },
  levelsRow: { flexDirection: 'row', backgroundColor: colors.panel, borderRadius: 12, paddingVertical: 10 },
  levelBox: { flex: 1, alignItems: 'center' },
  levelDivider: { width: 1, backgroundColor: colors.border },
  levelLabel: { color: colors.muted, fontSize: 10, marginBottom: 4 },
  levelValue: { color: colors.text, fontSize: 12, fontWeight: '700' },
  note: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 11 },
});
