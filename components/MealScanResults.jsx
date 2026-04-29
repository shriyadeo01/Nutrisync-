import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import {
  Dimensions,
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getMealPlanFitLabel } from '../utils/dietPlan';

const { width: SCREEN_W } = Dimensions.get('window');

function NutrientTile({
  icon,
  valueText,
  subText,
  label,
  valueAccent,
}) {
  return (
    <View style={styles.tile}>
      <Ionicons
        name="checkmark-circle"
        size={18}
        color="#22c55e"
        style={styles.tileCheck}
      />
      <Ionicons name={icon} size={22} color="#e5e7eb" style={styles.tileIcon} />
      <Text
        style={[
          styles.tileValue,
          valueAccent ? styles.tileValueAccent : styles.tileValueWhite,
        ]}
        numberOfLines={1}
      >
        {valueText}
      </Text>
      {subText ? (
        <Text style={styles.tileSub} numberOfLines={1}>
          {subText}
        </Text>
      ) : null}
      <Text style={styles.tileLabel} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

function ScoreGauge({ score }) {
  const s = Math.max(0, Math.min(100, Math.round(Number(score) || 0)));

  return (
    <View style={styles.gaugeWrap}>
      <View style={styles.gaugeBarTrack}>
        <View style={[styles.gaugeBarFill, { width: `${s}%` }]} />
      </View>
      <View style={styles.gaugeInner}>
        <Ionicons name="heart" size={14} color="#fff" />
        <Text style={styles.gaugeScore}>{s}</Text>
        <Text style={styles.gaugeScoreCaption}>SCORE</Text>
      </View>
    </View>
  );
}

export function parseMealScanResult(rawJson) {
  let d = {};
  try {
    d = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson || {};
  } catch {
    d = {};
  }
  const num = (v, fallback = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };
  return {
    dish_name: String(d.dish_name || ''),
    ingredients: Array.isArray(d.ingredients)
      ? d.ingredients.map((x) => String(x || '').trim()).filter(Boolean)
      : [],
    meal_summary: String(d.meal_summary || ''),
    calories: Math.round(num(d.calories)),
    calories_label: String(d.calories_label || '—'),
    sodium_mg: Math.round(num(d.sodium_mg)),
    sodium_label: String(d.sodium_label || '—'),
    protein_g: num(d.protein_g),
    protein_label: String(d.protein_label || '—'),
    fiber_g: num(d.fiber_g),
    fiber_label: String(d.fiber_label || '—'),
    fat_g: num(d.fat_g),
    fat_label: String(d.fat_label || '—'),
    sugar_g: num(d.sugar_g),
    sugar_label: String(d.sugar_label || '—'),
    is_good_for_plan: String(d.is_good_for_plan || ''),
    plan_feedback: String(d.plan_feedback || ''),
    score: Math.round(num(d.score, 50)),
    score_reason: String(d.score_reason || ''),
  };
}

export default function MealScanResults({
  imageUri,
  result,
  onDismiss,
  hideHint,
  onHideHint,
  user,
}) {
  const insets = useSafeAreaInsets();
  const planFitText = useMemo(() => {
    const aiFeedback = String(result?.plan_feedback || '').trim();
    if (aiFeedback) return aiFeedback;
    return getMealPlanFitLabel(result, user);
  }, [result, user]);

  const fitBadgeText = useMemo(() => {
    const raw = String(result?.is_good_for_plan || '').toUpperCase();
    if (raw === 'YES') return 'GOOD FOR YOUR PLAN';
    if (raw === 'MODERATE') return 'MODERATE FOR YOUR PLAN';
    if (raw === 'NO') return 'NOT IDEAL FOR YOUR PLAN';
    return 'PLAN FIT CHECK';
  }, [result]);

  const ingredientText = useMemo(() => {
    const list = Array.isArray(result?.ingredients) ? result.ingredients : [];
    if (!list.length) return 'Ingredients could not be confidently detected.';
    return list.slice(0, 8).join(', ');
  }, [result]);
  const tiles = useMemo(() => {
    const r = result || {};
    const fmt = (n, dec = 1) =>
      Number.isFinite(n) ? (dec === 0 ? String(Math.round(n)) : n.toFixed(dec)) : '—';
    return [
      {
        key: 'cal',
        icon: 'flame-outline',
        valueText: fmt(r.calories, 0),
        subText: null,
        label: r.calories_label || 'CALORIES',
        valueAccent: true,
      },
      {
        key: 'fiber',
        icon: 'leaf-outline',
        valueText: `${fmt(r.fiber_g)} g`,
        subText: null,
        label: r.fiber_label || 'FIBER',
        valueAccent: false,
      },
      {
        key: 'na',
        icon: 'cube-outline',
        valueText: `${fmt(r.sodium_mg, 0)} mg`,
        subText: null,
        label: r.sodium_label || 'SODIUM',
        valueAccent: true,
      },
      {
        key: 'fat',
        icon: 'water-outline',
        valueText: `${fmt(r.fat_g)} g`,
        subText: null,
        label: r.fat_label || 'FAT',
        valueAccent: true,
      },
      {
        key: 'pro',
        icon: 'barbell-outline',
        valueText: `${fmt(r.protein_g)} g`,
        subText: null,
        label: r.protein_label || 'PROTEIN',
        valueAccent: true,
      },
      {
        key: 'sug',
        icon: 'nutrition-outline',
        valueText: `${fmt(r.sugar_g)} g`,
        subText: null,
        label: r.sugar_label || 'SUGAR',
        valueAccent: true,
      },
    ];
  }, [result]);

  const gap = 10;
  const pad = 16;
  const tileW = (SCREEN_W - pad * 2 - gap) / 2;

  return (
    <View style={styles.root}>
      <ImageBackground source={{ uri: imageUri }} style={styles.bg} resizeMode="cover">
        <View style={styles.scrim} pointerEvents="none" />

        <ScrollView style={styles.contentLayer} contentContainerStyle={{ paddingBottom: 120 }}>
          <View style={[styles.banner, { marginTop: Math.max(insets.top, 12) + 40 }]}>
            <Text style={styles.bannerTitle}>Meal scan</Text>
          </View>

          <View style={styles.grid}>
            {tiles.map((t) => (
              <View key={t.key} style={[styles.tileOuter, { width: tileW }]}>
                <NutrientTile
                  icon={t.icon}
                  valueText={t.valueText}
                  subText={t.subText}
                  label={t.label}
                  valueAccent={t.valueAccent}
                />
              </View>
            ))}
          </View>

          <View style={styles.gaugeSection}>
            <ScoreGauge score={result?.score} />
          </View>

          <View style={styles.metaCard}>
            <Text style={styles.metaDish} numberOfLines={2}>
              {result?.dish_name || 'Detected dish'}
            </Text>
            <Text style={styles.metaLabel}>Ingredients</Text>
            <Text style={styles.metaText} numberOfLines={5}>
              {ingredientText}
            </Text>
            <Text style={styles.metaLabel}>Diet-plan check</Text>
            <Text style={styles.metaFitBadge}>{fitBadgeText}</Text>
            <Text style={styles.metaText}>
              {planFitText}
            </Text>
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) + 16 }]} pointerEvents="box-none">
          <TouchableOpacity style={styles.ctaPill} onPress={onDismiss} activeOpacity={0.8}>
            <Text style={styles.ctaText}>Continue</Text>
          </TouchableOpacity>
          {!hideHint ? (
            <Pressable onPress={onHideHint} hitSlop={12}>
              <Text style={styles.dismissHint}>Don&apos;t show me this again</Text>
            </Pressable>
          ) : null}
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  bg: {
    flex: 1,
    width: '100%',
    justifyContent: 'space-between',
  },
  contentLayer: {
    flex: 1,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  banner: {
    alignSelf: 'center',
    backgroundColor: 'rgba(30,30,30,0.92)',
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 14,
  },
  bannerTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    gap: 10,
    marginTop: 18,
  },
  tileOuter: {
    marginBottom: 2,
  },
  tile: {
    backgroundColor: 'rgba(35,35,35,0.88)',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    minHeight: 118,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  tileCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  tileIcon: {
    marginBottom: 8,
    opacity: 0.9,
  },
  tileValue: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 2,
  },
  tileValueAccent: {
    color: '#4ade80',
  },
  tileValueWhite: {
    color: '#fff',
  },
  tileSub: {
    color: '#9ca3af',
    fontSize: 12,
    marginBottom: 2,
  },
  tileLabel: {
    color: '#f3f4f6',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    lineHeight: 14,
  },
  gaugeSection: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  gaugeWrap: {
    width: 100,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 4,
  },
  gaugeBarTrack: {
    width: 100,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
    marginBottom: 10,
  },
  gaugeBarFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#22c55e',
  },
  gaugeInner: {
    alignItems: 'center',
  },
  gaugeScore: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    marginTop: 2,
  },
  gaugeScoreCaption: {
    color: '#9ca3af',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: 2,
  },
  metaCard: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: 'rgba(20,20,20,0.84)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  metaDish: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  metaLabel: {
    color: '#a7f3d0',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 3,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  metaText: {
    color: '#f3f4f6',
    fontSize: 13,
    lineHeight: 18,
  },
  metaFitBadge: {
    color: '#34d399',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 3,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 20,
    alignItems: 'center',
    gap: 14,
    zIndex: 2,
    backgroundColor: 'rgba(0,0,0,0.4)', // Slightly darken behind the persistent footer
  },
  ctaPill: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  ctaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  dismissHint: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 13,
  },
});
