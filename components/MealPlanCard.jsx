import React, { useContext, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { UserContext } from '../context/UserContext';
import { getAppTheme } from '../constants/appTheme';
import RecipeThumbnail from './RecipeThumbnail';

export default function MealPlanCard({ mealPlanInfo, refreshData }) {
  const { isDarkMode } = useContext(UserContext);
  const t = getAppTheme(isDarkMode);
  const checkboxEmpty = useMemo(() => (isDarkMode ? '#475569' : '#E5E7EB'), [isDarkMode]);
  const router = useRouter();
  const updateStatus = useMutation(api.mealPlan.updateStatus);
  const { mealPlan, recipe } = mealPlanInfo;

  if (!recipe || !mealPlan) return null;

  const jd = recipe.jsonData || {};

  const onCheck = async (status) => {
    try {
      const caloriesVal = mealPlanInfo?.recipe?.jsonData?.calories || mealPlanInfo?.recipe?.calories || 0;
      await updateStatus({
        id: mealPlanInfo?.mealPlan?._id,
        status: status,
        calories: Number(caloriesVal)
      });
      if (refreshData) refreshData();
    } catch (e) {
      console.log("Error updating status:", e);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: t.card, borderColor: t.border }]}>
      <TouchableOpacity 
        style={{ flex: 1, flexDirection: 'row' }}
        onPress={() => {
          const base = recipe.jsonData || recipe;
          router.push({
            pathname: '/recipe-detail',
            params: {
              recipe: JSON.stringify({
                ...base,
                imageUrl: recipe.imageUrl || base?.imageUrl,
              }),
            },
          });
        }}
      >
        <RecipeThumbnail
          recipeName={recipe.recipeName ?? jd.recipeName}
          imageUrl={recipe.imageUrl}
          jsonData={jd}
          style={[styles.image, { backgroundColor: t.barChartTrack }]}
        />
        
        <View style={styles.details}>
          <Text style={styles.mealType}>{mealPlan.mealType}</Text>
          <Text style={[styles.recipeName, { color: t.text }]} numberOfLines={2}>
            {recipe.recipeName}
          </Text>
          {(recipe.recipeNameHI || (recipe.jsonData && recipe.jsonData.recipeNameHI)) && (
            <Text style={[styles.translatedName, { color: t.muted }]}>
              {recipe.recipeNameHI || recipe.jsonData.recipeNameHI}
            </Text>
          )}
          <Text style={[styles.calories, { color: t.muted }]}>{recipe.jsonData?.calories || recipe?.calories || 'N/A'} kcal</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.checkIcon}>
        {mealPlanInfo?.mealPlan?.status !== true ? (
          <TouchableOpacity onPress={() => onCheck(true)}>
            <Ionicons name="square-outline" size={32} color={checkboxEmpty} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => onCheck(false)}>
            <Ionicons name="checkbox" size={32} color="#10B981" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 15,
    padding: 8,
    marginBottom: 10,
    borderWidth: 1,
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    // Elevation for Android
    elevation: 1,
  },
  image: {
    width: 75,
    height: 75,
    borderRadius: 12,
  },
  details: {
    flex: 1,
    paddingLeft: 12,
    justifyContent: 'center',
    paddingVertical: 10,
  },
  mealType: {
    fontSize: 12,
    color: '#6C63FF',
    fontWeight: '700',
    marginBottom: 1,
  },
  recipeName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 0,
  },
  translatedName: {
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 2,
  },
  calories: {
    fontSize: 12,
    fontWeight: '600',
  },
  checkIcon: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  }
});
