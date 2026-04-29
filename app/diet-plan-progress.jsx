import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import moment from 'moment';
import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Pedometer } from 'expo-sensors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAppTheme } from '../constants/appTheme';
import { UserContext } from '../context/UserContext';
import { getDietPlanFromUser } from '../utils/dietPlan';
import { useStepTracker } from '../hooks/useStepTracker';

const STORAGE_KEY = 'diet_plan_daily_progress_v1';

export default function DietPlanProgressScreen() {
  const { user, isDarkMode } = useContext(UserContext);
  const insets = useSafeAreaInsets();
  const t = getAppTheme(isDarkMode);

  const todayKey = moment().format('YYYY-MM-DD');
  const plan = useMemo(() => getDietPlanFromUser(user), [user]);
  const checklist = useMemo(
    () => [
      { key: 'protein', label: `Protein target (${plan.proteinTarget}g)` },
      { key: 'carbs', label: `Carbs target (${plan.carbTarget}g)` },
      { key: 'fats', label: `Fats target (${plan.fatTarget}g)` },
      { key: 'workout_time', label: `Workout time (${plan.workoutMinutes} min)` },
      { key: 'workout_type', label: `Workout type (${plan.workoutType})` },
      { key: 'walking', label: `Walking (${plan.walkingSteps} steps)` },
    ],
    [plan]
  );

  const [history, setHistory] = useState({});
  const [stepInput, setStepInput] = useState('');
  const {
    displaySteps: liveSteps,
    distanceKm,
    caloriesBurned,
    isReady,
    error,
    permissionStatus,
    requestPermission,
    openSettings,
    dietSuggestion,
    resetSteps
  } = useStepTracker();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!active) return;
        setHistory(raw ? JSON.parse(raw) : {});
      } catch {
        if (active) setHistory({});
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const todayState = history[todayKey] || {};
  const todayDone = checklist.filter((item) => Boolean(todayState[item.key])).length;

  const toggleCheck = async (key) => {
    const next = {
      ...history,
      [todayKey]: {
        ...todayState,
        [key]: !todayState[key],
      },
    };
    setHistory(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore storage failures in UI
    }
  };

  const updateTodaySteps = async (steps) => {
    const normalized = Number.isFinite(steps) && steps > 0 ? Math.round(steps) : 0;
    const next = {
      ...history,
      [todayKey]: {
        ...todayState,
        stepsCompleted: normalized,
        walking: normalized >= plan.walkingSteps,
      },
    };
    setHistory(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore storage failures
    }
  };

  const saveManualSteps = async () => {
    const parsed = Number(String(stepInput || '').replace(/[^\d]/g, ''));
    await updateTodaySteps(parsed);
    setStepInput('');
  };

  const syncLiveSteps = async () => {
    await updateTodaySteps(liveSteps);
  };

  const weeklyData = useMemo(() => {
    return [...Array(7)].map((_, i) => {
      const date = moment().subtract(6 - i, 'days');
      const key = date.format('YYYY-MM-DD');
      const dayState = history[key] || {};
      const completed = checklist.filter((item) => Boolean(dayState[item.key])).length;
      return {
        key,
        day: date.format('ddd'),
        completed,
      };
    });
  }, [history, checklist]);

  const weeklyPercent = useMemo(() => {
    const maxItems = checklist.length * 7;
    const done = weeklyData.reduce((sum, item) => sum + item.completed, 0);
    return maxItems ? Math.round((done / maxItems) * 100) : 0;
  }, [weeklyData, checklist.length]);

  return (
    <View style={[styles.screen, { backgroundColor: t.bg, paddingTop: insets.top + 4 }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 34 }}
      >
        <Text style={[styles.title, { color: t.text }]}>Diet Plan Progress</Text>
        <Text style={[styles.subtitle, { color: t.muted }]}>
          Track your daily targets for {plan.goalTitle.toLowerCase()} and follow weekly consistency.
        </Text>

        <View style={[styles.todayCard, { backgroundColor: t.card, borderColor: t.border }]}>
          <Text style={[styles.cardTitle, { color: t.text }]}>Today&apos;s checklist</Text>
          <View style={[styles.stepCard, { backgroundColor: t.surfaceMuted }]}>
            <Text style={[styles.stepTitle, { color: t.text }]}>
              Steps completed: {(todayState.stepsCompleted || 0).toLocaleString()} / {plan.walkingSteps.toLocaleString()}
            </Text>
            <Text style={[styles.stepSub, { color: t.muted }]}>
              {todayState.stepsCompleted >= plan.walkingSteps
                ? 'Walking target achieved for today'
                : `Remaining: ${(Math.max(0, plan.walkingSteps - (todayState.stepsCompleted || 0))).toLocaleString()} steps`}
            </Text>

            <View style={[styles.liveTrackingCard, { backgroundColor: t.card, borderColor: t.border }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={[styles.liveTrackingTitle, { color: t.text, marginBottom: 0 }]}>Live Activity Tracker</Text>
                {permissionStatus === 'granted' && (
                   <TouchableOpacity onPress={resetSteps} style={{ padding: 4 }}>
                     <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: '600' }}>Reset Stats</Text>
                   </TouchableOpacity>
                )}
              </View>

              {permissionStatus !== 'granted' && permissionStatus !== 'loading' && (
                <View style={{ paddingVertical: 10, marginBottom: 10, borderBottomWidth: 1, borderColor: t.border }}>
                   <Text style={{ color: '#ef4444', fontSize: 13, marginBottom: 6, fontWeight: '600' }}>
                     Permission Status: Denied
                   </Text>
                   <Text style={{ color: t.muted, fontSize: 11, marginBottom: 12 }}>
                     We need ACTIVITY_RECOGNITION permission to track your pedometer correctly.
                   </Text>
                   <View style={{ flexDirection: 'row', gap: 8 }}>
                     <TouchableOpacity style={{ backgroundColor: '#3b82f6', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 }} onPress={requestPermission}>
                       <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>Grant Permission</Text>
                     </TouchableOpacity>
                     <TouchableOpacity style={{ borderWidth: 1, borderColor: t.border, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 }} onPress={openSettings}>
                       <Text style={{ color: t.text, fontSize: 12, fontWeight: '600' }}>Open Settings</Text>
                     </TouchableOpacity>
                   </View>
                </View>
              )}

              {error && permissionStatus === 'granted' && (
                <Text style={{ color: '#ef4444', fontSize: 11, marginBottom: 10 }}>{error}</Text>
              )}
              {!isReady && !error && permissionStatus === 'granted' && (
                <Text style={{ color: t.muted, fontSize: 11, marginBottom: 10 }}>
                  Searching for internal step-tracking hardware...
                </Text>
              )}
              <View style={styles.liveTrackingStats}>
                <View>
                  <Text style={[styles.liveTrackingLabel, { color: t.muted }]}>Steps</Text>
                  <Text style={[styles.liveTrackingValue, { color: t.text }]}>{liveSteps}</Text>
                </View>
                <View>
                  <Text style={[styles.liveTrackingLabel, { color: t.muted }]}>Distance</Text>
                  <Text style={[styles.liveTrackingValue, { color: t.text }]}>{distanceKm} km</Text>
                </View>
                <View>
                  <Text style={[styles.liveTrackingLabel, { color: t.muted }]}>Calories</Text>
                  <Text style={[styles.liveTrackingValue, { color: t.text }]}>{caloriesBurned} kcal</Text>
                </View>
              </View>
              {dietSuggestion ? (
                <View style={{ marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: t.border }}>
                  <Text style={{ color: t.text, fontSize: 13, fontWeight: '600', fontStyle: 'italic' }}>
                    💡 {dietSuggestion}
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={styles.stepInputRow}>
              <TextInput
                value={stepInput}
                onChangeText={setStepInput}
                placeholder="Enter steps manually"
                placeholderTextColor={t.muted}
                keyboardType="numeric"
                style={[styles.stepInput, { color: t.text, borderColor: t.border, backgroundColor: t.card }]}
              />
              <TouchableOpacity style={styles.stepBtn} onPress={saveManualSteps}>
                <Text style={styles.stepBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.stepActionRow}>
              <TouchableOpacity
                style={[styles.secondaryStepBtn, { borderColor: t.border }]}
                onPress={syncLiveSteps}
              >
                <Text style={styles.secondaryStepBtnText}>
                  Mark {liveSteps} steps as done
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          {checklist.map((item) => {
            const done = Boolean(todayState[item.key]);
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.checkRow, { borderColor: t.border }]}
                activeOpacity={0.85}
                onPress={() => toggleCheck(item.key)}
              >
                <Ionicons
                  name={done ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={done ? '#10B981' : t.muted}
                />
                <Text style={[styles.checkText, { color: t.text }]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
          <Text style={[styles.progressLabel, { color: t.muted }]}>
            Completed today: {todayDone}/{checklist.length}
          </Text>
        </View>

        <View style={[styles.weeklyCard, { backgroundColor: t.card, borderColor: t.border }]}>
          <Text style={[styles.cardTitle, { color: t.text }]}>Weekly progress</Text>
          <View style={[styles.percentBadge, { backgroundColor: t.actionIconTintBg }]}>
            <Text style={styles.percentText}>{weeklyPercent}% completed</Text>
          </View>
          <View style={styles.weeklyRow}>
            {weeklyData.map((day) => {
              const barPct = Math.round((day.completed / checklist.length) * 100);
              return (
                <View key={day.key} style={styles.dayItem}>
                  <View style={[styles.dayBarTrack, { backgroundColor: t.surfaceMuted }]}>
                    <View style={[styles.dayBarFill, { height: `${barPct}%` }]} />
                  </View>
                  <Text style={[styles.dayLabel, { color: t.muted }]}>{day.day}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 16,
  },
  todayCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  checkText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
  },
  progressLabel: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '600',
  },
  weeklyCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  percentBadge: {
    alignSelf: 'flex-start',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 2,
    marginBottom: 12,
  },
  percentText: {
    color: '#4F46E5',
    fontSize: 12,
    fontWeight: '700',
  },
  weeklyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 150,
  },
  dayItem: {
    width: '12%',
    alignItems: 'center',
  },
  dayBarTrack: {
    width: 14,
    height: 110,
    borderRadius: 10,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  dayBarFill: {
    width: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 10,
    minHeight: 2,
  },
  dayLabel: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: '600',
  },
  stepCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  stepSub: {
    marginTop: 4,
    fontSize: 12,
  },
  stepInputRow: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
  },
  stepInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 14,
  },
  stepBtn: {
    backgroundColor: '#6C63FF',
    borderRadius: 10,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  stepBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
  stepActionRow: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 8,
  },
  secondaryStepBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
  },
  secondaryStepBtnText: {
    color: '#6366F1',
    fontSize: 12,
    fontWeight: '700',
  },
  liveTrackingCard: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  liveTrackingTitle: {
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 8,
  },
  liveTrackingStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  liveTrackingLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  liveTrackingValue: {
    fontSize: 15,
    fontWeight: '700',
  },
});
