import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import type { DetectedItem } from '../analysis';

type Props = {
  items: DetectedItem[];
  totalCalories?: number;
  title?: string;
};

function kCal(n: number | undefined) {
  const v = Math.round(Number(n || 0));
  return `${v} kcal`;
}

export default function DetectedItemsPanel({
  items,
  totalCalories,
  title = 'Detected items',
}: Props) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const c = getPalette(isDark);

  return (
    <View style={[styles.wrap, { gap: 12 }]}>
      <View style={styles.header}>
        <Text style={[styles.h2, { color: c.text }]}>{title}</Text>
        {typeof totalCalories === 'number' ? (
          <Text style={[styles.h2Right, { color: c.muted }]}>
            Total: {kCal(totalCalories)}
          </Text>
        ) : null}
      </View>

      <View style={{ gap: 12 }}>
        {items.map((it) => (
          <View
            key={it.itemId}
            style={[
              styles.card,
              {
                backgroundColor: c.card,
                borderColor: c.border,
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <View>
                <Text style={[styles.itemName, { color: c.text }]}>
                  {it.name}
                </Text>
                <Text style={[styles.itemSub, { color: c.muted }]}>
                  Item #{it.itemId}
                </Text>
              </View>
              <Text style={[styles.itemCals, { color: c.accent }]}>
                {kCal(it.nutrition.calories)}
              </Text>
            </View>

            <View style={styles.rows}>
              <Row
                label="Protein"
                value={`${it.nutrition.protein} g`}
                color={c}
              />
              <Row label="Carbs" value={`${it.nutrition.carbs} g`} color={c} />
              <Row label="Fat" value={`${it.nutrition.fat} g`} color={c} />
              <Row
                label="Portion"
                value={`${it.portionSize.estimatedGrams || 0} g`}
                color={c}
              />
            </View>

            {!!it.ingredients?.length && (
              <Text style={[styles.ingredients, { color: c.muted }]}>
                Ingredients: {it.ingredients.join(', ')}
              </Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

function Row({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: ReturnType<typeof getPalette>;
}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: color.muted }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: color.text }]}>{value}</Text>
    </View>
  );
}

function getPalette(isDark: boolean) {
  return {
    bg: isDark ? '#0b1220' : '#f8fafc',
    card: isDark ? '#111827' : '#ffffff',
    border: isDark ? '#1f2937' : '#e5e7eb',
    text: isDark ? '#e5e7eb' : '#0f172a',
    muted: isDark ? '#9ca3af' : '#6b7280',
    accent: isDark ? '#60a5fa' : '#2563eb',
  };
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  h2: { fontSize: 18, fontWeight: '600' },
  h2Right: { fontSize: 12 },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  itemName: { textTransform: 'capitalize', fontSize: 16, fontWeight: '500' },
  itemSub: { fontSize: 12, marginTop: 2 },
  itemCals: { fontSize: 14, fontWeight: '600' },
  rows: { marginTop: 8, gap: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: {},
  rowValue: { fontWeight: '500' },
  ingredients: { marginTop: 8, fontSize: 12 },
});
