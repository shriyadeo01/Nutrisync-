import React, { useContext, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import moment from 'moment';
import { useQuery } from 'convex/react';
import { UserContext } from '../../context/UserContext';
import { api } from '../../convex/_generated/api';
import { getAppTheme } from '../../constants/appTheme';

const BLUE_ACCENT = '#3B82F6';
const PURPLE_ACCENT = '#6366F1';

export default function Progress() {
  const { user, isDarkMode } = useContext(UserContext);
  const t = getAppTheme(isDarkMode);
  const insets = useSafeAreaInsets();
  const last7Days = useMemo(() => {
    return [...Array(7)].map((_, i) => moment().subtract(6 - i, 'days').format('DD/MM/YYYY'));
  }, []);

  const weeklyData = useQuery(
    api.mealPlan.getCaloriesConsumedByDates,
    user?._id ? { userId: user._id, dates: last7Days } : 'skip'
  );

  const goal = parseInt(user?.calories || '2000');
  
  const weeklyAvg = useMemo(() => {
    if (!weeklyData || weeklyData.length === 0) return 0;
    const total = weeklyData.reduce((sum, d) => sum + (d.consumed || 0), 0);
    return Math.round(total / weeklyData.length);
  }, [weeklyData]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top, backgroundColor: t.bg }]}>
      <Text style={[styles.headerTitle, { color: t.text }]}>Progress Tracker</Text>
      
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
      >
        <View style={[styles.overviewCard, { backgroundColor: t.card }]}>
          <View style={styles.overviewRow}>
            <View>
              <Text style={[styles.overviewLabel, { color: t.muted }]}>Weekly Avg</Text>
              <Text style={[styles.overviewValue, { color: t.text }]}>{weeklyAvg} kcal</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: t.badgeBg }]}>
              <Text style={styles.badgeText}>{Math.round((weeklyAvg/goal)*100)}% of Goal</Text>
            </View>
          </View>
          <View style={[styles.progressBarBg, { backgroundColor: t.barChartTrack }]}>
            <View style={[styles.progressBar, { width: `${Math.min(100, (weeklyAvg/goal)*100)}%` }]} />
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: t.text }]}>Last 7 Days</Text>
        <View style={[styles.chartContainer, { backgroundColor: t.card }]}>
          {last7Days.map((date, index) => {
            const dayData = weeklyData?.find(d => d.date === date);
            const val = dayData ? dayData.consumed : 0;
            const height = Math.min(150, (val / goal) * 150);
            
            return (
              <View key={index} style={styles.barItem}>
                <View style={[styles.barOuter, { backgroundColor: t.barChartTrack }]}>
                   <View style={[styles.barInner, { height: height || 2 }]} />
                </View>
                <Text style={[styles.barLabel, { color: t.muted }]}>{moment(date, 'DD/MM/YYYY').format('ddd')}</Text>
              </View>
            );
          })}
        </View>

        <View style={[styles.statsList, { backgroundColor: t.card }]}>
           <View style={styles.statLine}>
              <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
              <Text style={[styles.statLabel, { color: t.text }]}>Best Day</Text>
              <Text style={[styles.statVal, { color: t.text }]}>{Math.max(...(weeklyData?.map(d => d.consumed) ?? [0]))} kcal</Text>
           </View>
           <View style={styles.statLine}>
              <View style={[styles.dot, { backgroundColor: '#F59E0B' }]} />
              <Text style={[styles.statLabel, { color: t.text }]}>Weight Goal</Text>
              <Text style={[styles.statVal, { color: t.text }]}>{user?.weight} kg → {user?.goal?.split(' ').pop()} kg</Text>
           </View>
        </View>

        <View style={[styles.tipCard, { backgroundColor: t.tipBg }]}>
           <Ionicons name="bulb-outline" size={24} color={PURPLE_ACCENT} />
           <Text style={[styles.tipText, { color: t.tipText }]}>
             Consistency is key! You have completed {weeklyData?.filter(d=>d.consumed > 0).length} of the last 7 days.
           </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerTitle: { fontSize: 28, fontWeight: '800', paddingHorizontal: 20, paddingVertical: 12 },
  scroll: { paddingHorizontal: 20 },
  overviewCard: { borderRadius: 20, padding: 20, marginBottom: 25, elevation: 2 },
  overviewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  overviewLabel: { fontSize: 14, fontWeight: '600' },
  overviewValue: { fontSize: 28, fontWeight: '800' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { color: BLUE_ACCENT, fontSize: 12, fontWeight: 'bold' },
  progressBarBg: { height: 10, borderRadius: 5, overflow: 'hidden' },
  progressBar: { height: 10, backgroundColor: PURPLE_ACCENT },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 15 },
  chartContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 200, borderRadius: 20, padding: 15, marginBottom: 25, elevation: 2 },
  barItem: { alignItems: 'center', width: '12%' },
  barOuter: { height: 150, width: 12, borderRadius: 6, justifyContent: 'flex-end' },
  barInner: { width: 12, backgroundColor: BLUE_ACCENT, borderRadius: 6 },
  barLabel: { fontSize: 10, marginTop: 8, fontWeight: '600' },
  statsList: { borderRadius: 20, padding: 20, marginBottom: 25, elevation: 2 },
  statLine: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  statLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
  statVal: { fontSize: 15, fontWeight: '700' },
  tipCard: { borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center' },
  tipText: { flex: 1, marginLeft: 12, fontSize: 14, lineHeight: 20 }
});
