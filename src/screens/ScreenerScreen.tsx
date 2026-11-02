import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors } from '../theme';
import { getScreenerResults } from '../services/marketApi';
import { Stock } from '../types';

const filterOptions = ['Momentum', 'Breakout', 'Value', 'AI Bias'];

export default function ScreenerScreen() {
  const [items, setItems] = useState<Stock[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>('AI Bias');

  useEffect(() => {
    const load = async () => {
      const filtered = await getScreenerResults(selectedFilter);
      setItems(filtered);
    };

    load();
  }, [selectedFilter]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 30 }}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Scanner</Text>
        <TouchableOpacity style={styles.filterButton}>
          <Text style={styles.filterText}>Filters</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterChipsRow}>
        {filterOptions.map((chip) => (
          <TouchableOpacity
            key={chip}
            style={[styles.chip, chip === selectedFilter && styles.activeChip]}
            onPress={() => setSelectedFilter(chip)}
          >
            <Text style={[styles.chipText, chip === selectedFilter && styles.activeChipText]}>{chip}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {items.map((stock) => (
        <View key={stock.symbol} style={styles.stockCard}>
          <View style={styles.stockHeader}>
            <View>
              <Text style={styles.symbol}>{stock.symbol}</Text>
              <Text style={styles.name}>{stock.name}</Text>
            </View>
            <Text style={[styles.price, stock.changePercent >= 0 ? styles.positive : styles.negative]}>
              {stock.changePercent >= 0 ? '+' : ''}
              {stock.changePercent.toFixed(2)}%
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Price</Text>
            <Text style={styles.metaValue}>${stock.price.toFixed(2)}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Volume</Text>
            <Text style={styles.metaValue}>{stock.volume.toLocaleString()}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Sentiment</Text>
            <Text style={[styles.metaValue, stock.sentiment === 'Bullish' ? styles.positive : styles.negative]}>
              {stock.sentiment}
            </Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 18,
    paddingTop: 28,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '800',
  },
  filterButton: {
    backgroundColor: colors.panel,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  filterText: {
    color: colors.text,
    fontWeight: '700',
  },
  filterChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 18,
    gap: 8,
  },
  chip: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  activeChip: {
    backgroundColor: '#0F3B35',
    borderColor: colors.green,
  },
  chipText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  activeChipText: {
    color: colors.green,
  },
  stockCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  stockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  symbol: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  name: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  price: {
    fontSize: 18,
    fontWeight: '800',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metaLabel: {
    color: colors.muted,
    fontSize: 12,
  },
  metaValue: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  positive: {
    color: colors.green,
  },
  negative: {
    color: colors.red,
  },
});
