import React, { useContext, useMemo, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Alert,
  Modal,
  Switch,
  TextInput,
  ActivityIndicator,
  Pressable,
  Appearance,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import moment from 'moment';
import { useQuery } from 'convex/react';
import { signOut } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { UserContext } from '../../context/UserContext';
import { auth } from '../../services/FirebaseConfig';
import { api } from '../../convex/_generated/api';
import { getAppTheme, BLUE_ACCENT } from '../../constants/appTheme';
import {
  STORAGE_USER_OPENROUTER_KEY,
  STORAGE_NOTIFICATIONS_ENABLED,
  STORAGE_DARK_MODE,
} from '../../constants/settingsStorage';
import { isProfileComplete } from '../../utils/profileCompletion';
import DietaryPreferencesCard from '../../components/DietaryPreferencesCard';

const ICON_GREEN = '#22C55E';
const AMBER = '#F59E0B';
const BLUE = '#3B82F6';

function buildDateRange(daysBack, newestFirst) {
  const out = [];
  for (let i = 0; i < daysBack; i++) {
    const d = newestFirst ? moment().subtract(i, 'days') : moment().subtract(daysBack - 1 - i, 'days');
    out.push(d.format('DD/MM/YYYY'));
  }
  return out;
}

export default function Profile() {
  const { user, setUser, isDarkMode, setIsDarkMode } = useContext(UserContext);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Settings Panel States
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [hasCustomKey, setHasCustomKey] = useState(false);
  const [keyModalOpen, setKeyModalOpen] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [keySaving, setKeySaving] = useState(false);
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [storageApproxKb, setStorageApproxKb] = useState(0);

  const today = moment().format('DD/MM/YYYY');
  const streakDates = useMemo(() => buildDateRange(60, true), []);
  const weekDates = useMemo(() => buildDateRange(7, false), []);
  const last30Dates = useMemo(() => buildDateRange(30, true), []);
  const last10Dates = useMemo(() => buildDateRange(10, false), []);

  const dailyGoal = Math.max(1, parseInt(String(user?.calories ?? '2000'), 10) || 2000);

  // Queries (Restored original logic)
  const todaysPlan = useQuery(api.mealPlan.GetTodaysMealPlan, user?._id ? { userId: user._id, date: today } : 'skip');
  const caloriesConsumed = useQuery(api.mealPlan.GetTotalCaloriesConsumed, user?._id ? { userId: user._id, date: today } : 'skip');
  const streak = useQuery(api.mealPlan.getMealStreakDays, user?._id ? { userId: user._id, datesNewestFirst: streakDates } : 'skip');
  const weekCalories = useQuery(api.mealPlan.getCaloriesConsumedByDates, user?._id ? { userId: user._id, dates: weekDates } : 'skip');
  const plannedDays30 = useQuery(api.mealPlan.countPlannedDaysInDates, user?._id ? { userId: user._id, dates: last30Dates } : 'skip');
  const last10Calories = useQuery(api.mealPlan.getCaloriesConsumedByDates, user?._id ? { userId: user._id, dates: last10Dates } : 'skip');
  const userRecipes = useQuery(api.recipes.getUserRecipes, user?._id ? { userId: user._id } : 'skip');

  const THEME = getAppTheme(isDarkMode);

  const refreshSettingsState = useCallback(async () => {
    try {
      const k = await AsyncStorage.getItem(STORAGE_USER_OPENROUTER_KEY);
      setHasCustomKey(Boolean(k?.trim()));
      const n = await AsyncStorage.getItem(STORAGE_NOTIFICATIONS_ENABLED);
      setNotificationsOn(n === null ? true : n === 'true');
      
      const keys = await AsyncStorage.getAllKeys();
      let chars = 0;
      for (const key of keys) {
        const v = await AsyncStorage.getItem(key);
        chars += key.length + (v?.length ?? 0);
      }
      setStorageApproxKb(Math.max(0, Math.round(chars / 1024)));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (settingsModalOpen) refreshSettingsState();
  }, [settingsModalOpen, refreshSettingsState]);

  const onToggleDarkMode = async (value) => {
    setIsDarkMode(value);
    try {
      await AsyncStorage.setItem(STORAGE_DARK_MODE, value ? 'true' : 'false');
      Appearance.setColorScheme(value ? 'dark' : 'light');
    } catch { /* ignore */ }
  };

  const onToggleNotifications = async (value) => {
    setNotificationsOn(value);
    try {
      await AsyncStorage.setItem(STORAGE_NOTIFICATIONS_ENABLED, value ? 'true' : 'false');
    } catch { /* ignore */ }
  };

  const saveApiKey = async () => {
    const trimmed = keyInput.trim();
    if (!trimmed) return;
    setKeySaving(true);
    try {
      await AsyncStorage.setItem(STORAGE_USER_OPENROUTER_KEY, trimmed);
      setHasCustomKey(true);
      setKeyModalOpen(false);
      setKeyInput('');
      Alert.alert('Saved', 'API key stored locally.');
    } catch (e) { Alert.alert('Error', String(e?.message ?? e)); }
    finally { setKeySaving(false); }
  };

  const clearApiKey = () => {
    Alert.alert('Remove API key?', 'Fall back to default.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', onPress: async () => {
          await AsyncStorage.removeItem(STORAGE_USER_OPENROUTER_KEY);
          setHasCustomKey(false);
      }}
    ]);
  };

  const mealsProgress = useMemo(() => {
    const list = todaysPlan ?? [];
    return { planned: list.length, completed: list.filter((x) => x?.mealPlan?.status === true).length };
  }, [todaysPlan]);

  const caloriePercentOfGoal = useMemo(() => {
    const c = typeof caloriesConsumed === 'number' ? caloriesConsumed : 0;
    return Math.min(100, Math.round((c / dailyGoal) * 100));
  }, [caloriesConsumed, dailyGoal]);

  const weeklyAvgPercent = useMemo(() => {
    if (!weekCalories?.length) return 0;
    const pcts = weekCalories.map(({ consumed }) => Math.min(100, Math.round((consumed / dailyGoal) * 100)));
    return Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length);
  }, [weekCalories, dailyGoal]);

  const healthyEaterUnlocked = useMemo(() => {
    if (!last10Calories?.length) return false;
    const low = dailyGoal * 0.85;
    const high = dailyGoal * 1.15;
    return last10Calories.every(({ consumed }) => consumed >= low && consumed <= high && consumed > 0);
  }, [last10Calories, dailyGoal]);

  const achievements = useMemo(() => {
    const s = streak ?? 0;
    return [
      { id: 'week', title: 'First Week', subtitle: 'Complete 7 days of meal planning', icon: 'star', unlocked: s >= 7 },
      { id: 'protein', title: 'Protein Master', subtitle: 'Meet protein goals for 5 consecutive days', icon: 'nutrition', unlocked: s >= 5 && weeklyAvgPercent >= 75 },
      { id: 'healthy', title: 'Healthy Eater', unlocked: healthyEaterUnlocked, icon: 'leaf', subtitle: 'Stay within calorie goals for 10 days' },
      { id: 'king', title: 'Consistency King', icon: 'pulse', unlocked: (plannedDays30 ?? 0) >= 30, subtitle: 'Plan meals for 30 consecutive days' },
    ];
  }, [streak, weeklyAvgPercent, healthyEaterUnlocked, plannedDays30]);

  const onSwitchAccount = () => {
    Alert.alert('Switch account?', 'Log out now?', [
       { text: 'Cancel', style: 'cancel' },
       { text: 'Continue', onPress: async () => {
           await signOut(auth);
           setUser(null);
           router.replace('/auth/SignIn');
       }}
    ]);
  };

  const logout = () => {
    Alert.alert('Log out?', 'You will need to sign in again.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut(auth);
            setUser(null);
            router.replace('/auth/SignIn');
          } catch (e) {
            Alert.alert('Error', String(e?.message ?? e));
          }
        },
      },
    ]);
  };

  const onHelpSupport = async () => {
    const url = 'mailto:support@example.com?subject=MyDietApp%20Help';
    try {
      const can = await Linking.canOpenURL(url);
      if (can) await Linking.openURL(url);
      else Alert.alert('Help & Support', 'Email us at support@example.com');
    } catch {
      Alert.alert('Help & Support', 'Email us at support@example.com');
    }
  };

  const onShare = async () => {
    try {
      await Share.share({ message: `Tracking meals with My Diet App. Progress: ${mealsProgress.completed}/${mealsProgress.planned} today.` });
    } catch {}
  };

  const quickActions = [
    { label: 'Edit Profile', icon: 'person-outline', onPress: () => router.push('/preferance') },
    { label: 'Notifications', icon: 'notifications-outline', onPress: () => setSettingsModalOpen(true) },
    { label: 'Help & Support', icon: 'help-circle-outline', onPress: onHelpSupport },
    { label: 'Share Progress', icon: 'share-outline', onPress: onShare },
  ];

  const initial = (user?.name?.trim()?.[0] || user?.email?.trim()?.[0] || '?').toUpperCase();
  const profileDone = isProfileComplete(user);

  return (
    <View style={[styles.screen, { paddingTop: insets.top, backgroundColor: THEME.bg }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.headerTitle, { color: THEME.text }]}>Profile</Text>
        <TouchableOpacity onPress={() => setSettingsModalOpen(true)} style={styles.gearBtn}>
          <Ionicons name="settings-outline" size={26} color={THEME.text} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollInner, { paddingBottom: insets.bottom + 100 }]}>
        <View style={[styles.userCard, { backgroundColor: THEME.card }]}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{initial}</Text></View>
          <View style={styles.userTextCol}>
            <Text style={[styles.userName, { color: THEME.text }]}>{user.name || 'User'}</Text>
            <Text style={[styles.userEmail, { color: THEME.muted }]}>{user.email}</Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: THEME.text }]}>Your Stats</Text>
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: THEME.card }]}>
            <View style={[styles.statIconWrap, { backgroundColor: '#FEF3C7' }]}><Ionicons name="flame" size={22} color={AMBER} /></View>
            <Text style={[styles.statKind, { color: THEME.muted }]}>Total Calories</Text>
            <Text style={[styles.statValue, { color: THEME.text }]}>{Math.round(caloriesConsumed || 0)} kcal</Text>
            <Text style={[styles.statSub, { color: THEME.muted }]}>{caloriePercentOfGoal}% of daily goal</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: THEME.card }]}>
            <View style={[styles.statIconWrap, { backgroundColor: '#FEF3C7' }]}><Ionicons name="trophy" size={22} color={AMBER} /></View>
            <Text style={[styles.statKind, { color: THEME.muted }]}>Streak</Text>
            <Text style={[styles.statValue, { color: THEME.text }]}>{streak ?? 0} days</Text>
            <Text style={[styles.statSub, { color: THEME.muted }]}>Current streak</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: THEME.card }]}>
            <View style={[styles.statIconWrap, { backgroundColor: '#DCFCE7' }]}><Ionicons name="checkmark-circle" size={22} color={ICON_GREEN} /></View>
            <Text style={[styles.statKind, { color: THEME.muted }]}>Meals Completed</Text>
            <Text style={[styles.statValue, { color: THEME.text }]}>{mealsProgress.planned ? `${mealsProgress.completed}/${mealsProgress.planned}` : '0/0'}</Text>
            <Text style={[styles.statSub, { color: THEME.muted }]}>{"Today's progress"}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: THEME.card }]}>
            <View style={[styles.statIconWrap, { backgroundColor: '#DBEAFE' }]}><Ionicons name="trending-up" size={22} color={BLUE} /></View>
            <Text style={[styles.statKind, { color: THEME.muted }]}>Weekly Average</Text>
            <Text style={[styles.statValue, { color: THEME.text }]}>{weeklyAvgPercent}%</Text>
            <Text style={[styles.statSub, { color: THEME.muted }]}>Goal completion</Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: THEME.text }]}>Achievements</Text>
        {achievements.map((a) => (
          <View key={a.id} style={[styles.achievementCard, { backgroundColor: THEME.card, borderColor: THEME.border }, !a.unlocked && styles.achievementLocked]}>
            <View style={[styles.achievementIcon, { backgroundColor: a.unlocked ? '#DCFCE7' : (isDarkMode ? '#334155' : '#F3F4F6') }]}><Ionicons name={a.icon} size={24} color={a.unlocked ? ICON_GREEN : THEME.muted} /></View>
            <View style={styles.achievementText}><Text style={[styles.achievementTitle, { color: THEME.text }]}>{a.title}</Text><Text style={[styles.achievementSub, { color: THEME.muted }]}>{a.subtitle}</Text></View>
          </View>
        ))}

        {profileDone ? (
          <>
            <Text style={[styles.sectionTitle, { color: THEME.text, marginTop: 8 }]}>
              Diet & allergies
            </Text>
            <DietaryPreferencesCard />
          </>
        ) : (
          <View
            style={[
              styles.dietLockedCard,
              { backgroundColor: THEME.card, borderColor: THEME.border },
            ]}
          >
            <Ionicons name="restaurant-outline" size={28} color={THEME.muted} />
            <Text style={[styles.dietLockedTitle, { color: THEME.text }]}>
              Dietary preferences
            </Text>
            <Text style={[styles.dietLockedSub, { color: THEME.muted }]}>
              Finish your profile (weight, height, age, gender, goal) first. Then you can add
              restrictions and allergies here.
            </Text>
            <TouchableOpacity
              style={styles.dietLockedBtn}
              onPress={() => router.push('/preferance')}
            >
              <Text style={styles.dietLockedBtnText}>Complete profile</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={[styles.sectionTitle, { color: THEME.text, marginTop: 15 }]}>Appearance</Text>
        <View style={[styles.actionRow, { backgroundColor: THEME.card, borderColor: THEME.border }]}>
          <View style={[styles.actionIconWrap, { backgroundColor: THEME.actionIconTintBg }]}><Ionicons name="moon-outline" size={22} color={ICON_GREEN} /></View>
          <Text style={[styles.actionLabel, { color: THEME.text }]}>Dark mode</Text>
          <Switch value={isDarkMode} onValueChange={onToggleDarkMode} thumbColor={isDarkMode ? BLUE_ACCENT : '#DDD'} trackColor={{ false: '#EEE', true: '#93C5FD' }} />
        </View>

        <Text style={[styles.sectionTitle, { color: THEME.text, marginTop: 15 }]}>Quick Actions</Text>
        {quickActions.map((action) => (
          <TouchableOpacity key={action.label} style={[styles.actionRow, { backgroundColor: THEME.card, borderColor: THEME.border }]} onPress={action.onPress}>
            <View style={[styles.actionIconWrap, { backgroundColor: THEME.actionIconTintBg }]}><Ionicons name={action.icon} size={22} color={ICON_GREEN} /></View>
            <Text style={[styles.actionLabel, { color: THEME.text }]}>{action.label}</Text>
            <Ionicons name="chevron-forward" size={20} color={THEME.muted} />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Settings Panel Restoration */}
      <Modal visible={settingsModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.backdrop} onPress={() => setSettingsModalOpen(false)} />
          <View style={[styles.panel, { backgroundColor: THEME.card, paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.panelHeader}><View style={styles.dragHandle} /><View style={styles.panelTopRow}><Text style={[styles.panelTitle, { color: THEME.text }]}>Settings</Text><TouchableOpacity onPress={() => setSettingsModalOpen(false)}><Ionicons name="close-circle" size={28} color={THEME.muted}/></TouchableOpacity></View></View>
            <ScrollView style={{ padding: 20 }}>
               <View style={styles.settingRow}>
                  <View style={styles.rowInfo}><Ionicons name="moon-outline" size={22} color={BLUE_ACCENT} /><Text style={[styles.rowTitle, { color: THEME.text, marginLeft: 12 }]}>Dark mode</Text></View>
                  <Switch value={isDarkMode} onValueChange={onToggleDarkMode} thumbColor={isDarkMode ? BLUE_ACCENT : '#DDD'} trackColor={{ false: '#EEE', true: '#93C5FD' }} />
               </View>
               <View style={[styles.divider, { backgroundColor: THEME.border }]} />
               <TouchableOpacity style={styles.settingRow} onPress={onSwitchAccount}>
                  <View style={styles.rowInfo}><Ionicons name="swap-horizontal-outline" size={22} color={ICON_GREEN} /><Text style={[styles.rowTitle, { color: THEME.text, marginLeft: 12 }]}>Switch account</Text></View>
                  <Ionicons name="chevron-forward" size={20} color={THEME.muted} />
               </TouchableOpacity>
               <View style={[styles.divider, { backgroundColor: THEME.border }]} />
               <View style={styles.settingRow}>
                  <View style={styles.rowInfo}><Ionicons name="notifications-outline" size={22} color={ICON_GREEN} /><Text style={[styles.rowTitle, { color: THEME.text, marginLeft: 12 }]}>Notifications</Text></View>
                  <Switch value={notificationsOn} onValueChange={onToggleNotifications} />
               </View>
               <View style={[styles.divider, { backgroundColor: THEME.border }]} />
               <TouchableOpacity style={styles.settingRow} onPress={() => setKeyModalOpen(true)}>
                  <View style={styles.rowInfo}><Ionicons name="key-outline" size={22} color={AMBER} /><Text style={[styles.rowTitle, { color: THEME.text, marginLeft: 12 }]}>API Configuration</Text></View>
               </TouchableOpacity>
               <TouchableOpacity style={[styles.actionRow, { borderBottomWidth: 0, marginTop: 20, backgroundColor: '#EF4444' }]} onPress={logout}><Ionicons name="log-out-outline" size={22} color="#fff" /><Text style={{ color: '#fff', fontWeight: 'bold', marginLeft: 10 }}>Log Out</Text></TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* API Key Modal */}
      <Modal visible={keyModalOpen} transparent animationType="fade">
        <View style={styles.overlayCenter}><View style={[styles.keyModal, { backgroundColor: THEME.card }]}>
           <Text style={[styles.keyTitle, { color: THEME.text }]}>Enter API Key</Text>
           <TextInput style={[styles.keyInput, { color: THEME.text, borderColor: THEME.border }]} placeholder="sk-or-v1-..." value={keyInput} onChangeText={setKeyInput} secureTextEntry autoCapitalize="none" />
           <TouchableOpacity style={styles.pBtn} onPress={saveApiKey} disabled={keySaving}>{keySaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.pBtnText}>Save Key</Text>}</TouchableOpacity>
           <TouchableOpacity onPress={() => setKeyModalOpen(false)} style={{ marginTop: 15 }}><Text style={{ color: THEME.muted }}>Cancel</Text></TouchableOpacity>
        </View></View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  headerTitle: { fontSize: 28, fontWeight: '800' },
  gearBtn: { padding: 8 },
  scrollInner: { paddingHorizontal: 20 },
  userCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 18, padding: 16, marginBottom: 20 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: ICON_GREEN, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 24, fontWeight: '700', color: '#fff' },
  userTextCol: { marginLeft: 14, flex: 1 },
  userName: { fontSize: 18, fontWeight: '700' },
  userEmail: { fontSize: 14, marginTop: 4 },
  switchAccountRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, marginBottom: 20, borderWidth: 1 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  statCard: { width: '48%', borderRadius: 16, padding: 14, marginBottom: 12 },
  statIconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statKind: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: '800' },
  statSub: { fontSize: 12, marginTop: 4, fontWeight: '500' },
  achievementCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1 },
  achievementLocked: { opacity: 0.5 },
  achievementIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  achievementText: { flex: 1 },
  achievementTitle: { fontSize: 15, fontWeight: '700' },
  achievementSub: { fontSize: 12, marginTop: 2 },
  actionRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1 },
  actionIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  actionLabel: { flex: 1, fontSize: 15, fontWeight: '600' },
  logoutBtn: { backgroundColor: '#EF4444', flexDirection: 'row', paddingVertical: 16, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  logoutText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject },
  panel: { borderTopLeftRadius: 35, borderTopRightRadius: 35, maxHeight: '80%' },
  panelHeader: { padding: 15, alignItems: 'center' },
  dragHandle: { width: 40, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, marginBottom: 10 },
  panelTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingHorizontal: 5 },
  panelTitle: { fontSize: 22, fontWeight: '800' },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 18 },
  rowInfo: { flexDirection: 'row', alignItems: 'center' },
  rowTitle: { fontSize: 16, fontWeight: '600' },
  divider: { height: 1, opacity: 0.3 },
  overlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 25 },
  keyModal: { borderRadius: 25, padding: 25 },
  keyTitle: { fontSize: 20, fontWeight: '800', marginBottom: 15 },
  keyInput: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 20 },
  pBtn: { backgroundColor: BLUE, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  pBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  rowText: { flex: 1, marginLeft: 12 },
  rowIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dietLockedCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
    alignItems: 'center',
  },
  dietLockedTitle: { fontSize: 17, fontWeight: '800', marginTop: 10, textAlign: 'center' },
  dietLockedSub: { fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 8 },
  dietLockedBtn: {
    marginTop: 14,
    backgroundColor: BLUE,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 14,
  },
  dietLockedBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
