import React, { useContext } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useQuery } from 'convex/react';
import moment from 'moment';
import { api } from '../convex/_generated/api';
import { UserContext } from '../context/UserContext';
import MealPlanCard from './MealPlanCard';
import { useRouter } from 'expo-router';
import { getAppTheme } from '../constants/appTheme';

export default function TodaysMealPlan() {
  const { user, isDarkMode } = useContext(UserContext);
  const t = getAppTheme(isDarkMode);
  const router = useRouter();

  const today = moment().format('DD/MM/YYYY');
  const mealPlan = useQuery(api.mealPlan.GetTodaysMealPlan, {
    date: today,
    userId: user?._id
  });

  const loading = mealPlan === undefined;

  return (
    <View style={[styles.container, { backgroundColor: t.card }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: t.text }]}>{"Today's Meal Plan"}</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#6C63FF" style={{ marginTop: 20 }} />
      ) : mealPlan?.length > 0 ? (
        <FlatList
          data={mealPlan}
          renderItem={({ item }) => <MealPlanCard mealPlanInfo={item} />}
          keyExtractor={(item, index) => index.toString()}
          scrollEnabled={false}
          style={{ marginTop: 10 }}
        />
      ) : (
        <View style={[styles.emptyContainer, { backgroundColor: t.surfaceMuted }]}>
          <Text style={[styles.emptyText, { color: t.muted }]}>No meals planned for today.</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => router.push('/home')} 
          >
            <Text style={styles.addButtonText}>Add Now</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 15,
    borderRadius: 16,
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  seeAll: {
    color: '#6C63FF',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    borderRadius: 20,
    marginTop: 10,
  },
  emptyText: {
    fontSize: 16,
    marginBottom: 15,
  },
  addButton: {
    backgroundColor: '#6C63FF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  }
});