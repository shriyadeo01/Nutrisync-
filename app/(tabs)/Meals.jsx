import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import moment from 'moment';
import React, { useContext, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAppTheme } from '../../constants/appTheme';
import { UserContext } from '../../context/UserContext';
import { api as convexApi } from '../../convex/_generated/api';
import {
  GenerateRecipeImage,
  GenerateRecipeOptions,
  PEXELS_FALLBACK_IMAGE,
  resolveRecipeThumbnailUrl,
} from '../../services/AiModel';
import Prompt from '../../Shared/Prompt';
import AddToMealActionSheet from '../../components/AddToMealActionSheet';
import RecipeThumbnail from '../../components/RecipeThumbnail';
import { getDietPlanFromUser } from '../../utils/dietPlan';

const { height } = Dimensions.get('window');

export default function MealsScreen() {
  const { user, isDarkMode } = useContext(UserContext);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [planDate, setPlanDate] = useState(() => moment().startOf('day'));
  const planDateStr = planDate.format('DD/MM/YYYY');
  const isViewingToday = planDate.isSame(moment(), 'day');

  const todaysMealPlan = useQuery(
    convexApi.mealPlan.GetTodaysMealPlan,
    user?._id ? { userId: user._id, date: planDateStr } : 'skip'
  );

  const THEME = getAppTheme(isDarkMode);

  const saveRecipeMutation = useMutation(convexApi.recipes.saveRecipe);
  const createMealPlanMutation = useMutation(convexApi.mealPlan.CreateMealPlan);
  const deleteMealPlanMutation = useMutation(convexApi.mealPlan.deleteMealPlan);
  const clearMealPlansForDayMutation = useMutation(convexApi.mealPlan.clearMealPlansForDay);

  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [showMealSelector, setShowMealSelector] = useState(false);
  const [aiMealSlot, setAiMealSlot] = useState(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [dietPlanPanelOpen, setDietPlanPanelOpen] = useState(false);
  const dietPlan = useMemo(() => getDietPlanFromUser(user), [user]);

  const calendarDayOptions = useMemo(() => {
    const start = moment().startOf('day');
    const y0 = start.format('YYYY');
    const out = [];
    for (let i = 0; i < 120; i++) {
      const d = start.clone().add(i, 'days');
      out.push({
        key: d.format('YYYY-MM-DD'),
        moment: d,
        dateStr: d.format('DD/MM/YYYY'),
        label:
          i === 0
            ? 'Today'
            : i === 1
              ? 'Tomorrow'
              : d.format('ddd, MMM D'),
        sublabel: d.format('YYYY') === y0 ? null : d.format('YYYY'),
      });
    }
    return out;
  }, [calendarOpen]);

  /** Order matches AddToMealActionSheet: Breakfast, Lunch, Snacks, Dinner */
  const MEAL_SLOTS = [
    { name: 'Breakfast', icon: 'cafe-outline', hint: 'Morning fuel', timeLabel: '7 AM' },
    { name: 'Lunch', icon: 'sunny-outline', hint: 'Midday meal', timeLabel: '12 PM' },
    { name: 'Snacks', icon: 'nutrition-outline', hint: 'Light bite', timeLabel: '3 PM' },
    { name: 'Dinner', icon: 'moon-outline', hint: 'Evening meal', timeLabel: '7 PM' },
  ];

  const planBySlot = useMemo(() => {
    const m = {};
    if (!todaysMealPlan?.length) return m;
    for (const item of todaysMealPlan) {
      const type = item?.mealPlan?.mealType;
      if (type && m[type] === undefined) m[type] = item;
    }
    return m;
  }, [todaysMealPlan]);

  const nutritionTotals = useMemo(() => {
    const empty = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    if (!todaysMealPlan?.length) return empty;
    return todaysMealPlan.reduce((acc, item) => {
      const jd = item.recipe?.jsonData || {};
      const cal = Number(jd.calories ?? item.recipe?.calories ?? 0) || 0;
      const p = Number(jd.proteins ?? jd.protein ?? item.recipe?.proteins ?? 0) || 0;
      const c = Number(jd.carbs ?? 0) || 0;
      const f = Number(jd.fats ?? jd.fat ?? 0) || 0;
      return {
        calories: acc.calories + cal,
        protein: acc.protein + p,
        carbs: acc.carbs + c,
        fat: acc.fat + f,
      };
    }, empty);
  }, [todaysMealPlan]);

  const openAiPanel = () => {
    setAiMealSlot(null);
    setSuggestions([]);
    setSelectedRecipe(null);
    setIsPanelOpen(true);
  };

  const openAiPanelForSlot = (slotName) => {
    setSelectedRecipe(null);
    setSuggestions([]);
    setAiMealSlot(slotName);
    setIsPanelOpen(true);
    getAiSuggestions(slotName);
  };

  const closeAiPanel = () => {
    setShowMealSelector(false);
    setIsPanelOpen(false);
    setAiMealSlot(null);
    setSuggestions([]);
    setSelectedRecipe(null);
  };

  const attachPreviewImages = async (recipes) => {
    const list = Array.isArray(recipes) ? recipes : [];
    return Promise.all(
      list.map(async (r) => {
        let imageUrl = PEXELS_FALLBACK_IMAGE;
        try {
          const fromPexels = await GenerateRecipeImage(
            r.recipeName,
            r.description || ''
          );
          if (fromPexels && String(fromPexels).trim()) {
            imageUrl = String(fromPexels).trim();
          }
        } catch (e) {
          console.log('Meals: suggestion thumbnail error', e?.message || e);
        }
        return { ...r, imageUrl };
      })
    );
  };

  const getAiSuggestions = async (mealType) => {
    if (!mealType) return;
    setLoadingSuggestions(true);
    setSuggestions([]);
    try {
      const userDataStr = JSON.stringify({
        age: user?.age,
        weight: user?.weight,
        height: user?.height,
        gender: user?.gender,
        goal: user?.goal,
        calories: user?.calories,
        dietType: user?.dietType,
        dietaryRestrictions: user?.dietaryRestrictions ?? [],
        allergies: user?.allergies ?? [],
        ingredients: user?.likedIngredients || 'General healthy ingredients',
      });

      const prompt = Prompt.MealSlotRecipeSuggestions.replace(
        '{USER_DATA}',
        userDataStr
      ).replace('{MEAL_TYPE}', mealType);

      const result = await GenerateRecipeOptions(prompt, { maxTokens: 8192 });
      const parsed = JSON.parse(result);
      const raw = parsed.recipes || [];
      const withImages = await attachPreviewImages(raw);
      setSuggestions(withImages);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      Alert.alert('Error', 'Failed to get suggestions. Please try again.');
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const pickMealSlot = (name) => {
    setAiMealSlot(name);
    getAiSuggestions(name);
  };

  const handleRecipeSelect = (recipe) => {
    setSelectedRecipe(recipe);
    setShowMealSelector(true);
  };

  const onSaveMeal = async (date, mealType) => {
    if (!selectedRecipe || !user) return;
    
    try {
      setLoadingSuggestions(true);
      const sameSlot =
        todaysMealPlan?.filter((x) => x.mealPlan?.mealType === mealType) || [];
      for (const x of sameSlot) {
        await deleteMealPlanMutation({ id: x.mealPlan._id });
      }

      const previewUrl = String(selectedRecipe.imageUrl || '').trim();
      const imageUrl = await resolveRecipeThumbnailUrl(
        selectedRecipe.recipeName,
        selectedRecipe.description || '',
        previewUrl
      );

      const jsonData = { ...selectedRecipe, imageUrl };

      const recipeId = await saveRecipeMutation({
        userId: user._id,
        recipeName: selectedRecipe.recipeName,
        imageUrl,
        jsonData,
      });

      await createMealPlanMutation({
        recipeId,
        date: date,
        mealType: mealType,
        userId: user._id
      });

      setShowMealSelector(false);
      closeAiPanel();
    } catch (error) {
      console.error("Error saving meal:", error);
      Alert.alert("Error", "Failed to add to meal plan.");
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const removeSlotMeal = (mealPlanId) => {
    Alert.alert('Remove meal?', 'This slot will be empty until you add something else.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => deleteMealPlanMutation({ id: mealPlanId }),
      },
    ]);
  };

  const clearTodaysMeals = () => {
    if (!user?._id || !todaysMealPlan?.length) return;
    const dayLabel = isViewingToday
      ? 'today'
      : planDate.format('dddd, MMM Do');
    Alert.alert('Clear this day?', `Remove all meals planned for ${dayLabel}.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear all',
        style: 'destructive',
        onPress: () =>
          clearMealPlansForDayMutation({
            userId: user._id,
            date: planDateStr,
          }),
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: THEME.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: isDarkMode ? THEME.bg : '#fff' }]}>
        <View style={styles.headerTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: THEME.text }]}>
              {isViewingToday ? "Today's Meals" : 'Meal plan'}
            </Text>
            <Text style={[styles.subtitle, { color: THEME.muted }]}>
              {planDate.format(
                planDate.year() === moment().year() ? 'dddd, MMM Do' : 'dddd, MMM Do YYYY'
              )}
              {!isViewingToday ? ' · tap calendar to change' : ''}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => setCalendarOpen(true)}
              style={styles.headerIconBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityLabel="Choose date"
            >
              <Ionicons name="calendar-outline" size={24} color={THEME.text} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={clearTodaysMeals}
              disabled={!todaysMealPlan?.length}
              style={[styles.headerIconBtn, !todaysMealPlan?.length && styles.headerIconBtnDisabled]}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons
                name="trash-outline"
                size={24}
                color={todaysMealPlan?.length ? '#EF4444' : THEME.muted}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollInner, { paddingBottom: insets.bottom + 100 }]}>
        {todaysMealPlan === undefined ? (
          <ActivityIndicator size="large" color="#6C63FF" style={{ marginTop: 50 }} />
        ) : (
          <>
            <View style={[styles.nutritionCard, { backgroundColor: THEME.card, borderColor: THEME.border }]}>
              <Text style={[styles.nutritionTitle, { color: THEME.text }]}>
                {isViewingToday ? "Today's Nutrition" : 'Day nutrition'}
              </Text>
              <View style={styles.nutritionGrid}>
                <View style={styles.nutritionCell}>
                  <Text style={[styles.nutritionLabel, { color: THEME.muted }]}>Calories</Text>
                  <Text style={[styles.nutritionValue, { color: THEME.text }]}>
                    {Math.round(nutritionTotals.calories)} kcal
                  </Text>
                </View>
                <View style={styles.nutritionCell}>
                  <Text style={[styles.nutritionLabel, { color: THEME.muted }]}>Protein</Text>
                  <Text style={[styles.nutritionValue, { color: THEME.text }]}>
                    {Math.round(nutritionTotals.protein)}g
                  </Text>
                </View>
                <View style={styles.nutritionCell}>
                  <Text style={[styles.nutritionLabel, { color: THEME.muted }]}>Carbs</Text>
                  <Text style={[styles.nutritionValue, { color: THEME.text }]}>
                    {Math.round(nutritionTotals.carbs)}g
                  </Text>
                </View>
                <View style={styles.nutritionCell}>
                  <Text style={[styles.nutritionLabel, { color: THEME.muted }]}>Fat</Text>
                  <Text style={[styles.nutritionValue, { color: THEME.text }]}>
                    {Math.round(nutritionTotals.fat)}g
                  </Text>
                </View>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.secondaryAction, { backgroundColor: THEME.actionIconTintBg, borderColor: THEME.border }]}
              onPress={() => setDietPlanPanelOpen(true)}
            >
              <Ionicons name="sparkles-outline" size={22} color={isDarkMode ? '#6EE7B7' : '#059669'} />
              <Text style={[styles.secondaryActionText, { color: isDarkMode ? '#6EE7B7' : '#047857' }]}>
                Diet Plan for You
              </Text>
            </TouchableOpacity>

            <Text style={[styles.sectionTitle, { color: THEME.text }]}>
              {isViewingToday ? "Today's meals" : 'Meals this day'}
            </Text>

            {MEAL_SLOTS.map((slot) => {
              const entry = planBySlot[slot.name];
              const recipe = entry?.recipe;
              const mealPlan = entry?.mealPlan;
              const hasMeal = Boolean(recipe && mealPlan);
              const jd = recipe?.jsonData || {};
              const dishName = recipe?.recipeName || jd.recipeName || '';
              const cal = jd.calories ?? recipe?.calories;
              const prot = jd.proteins ?? jd.protein ?? recipe?.proteins;
              const carbs = jd.carbs;
              const fats = jd.fats ?? jd.fat;

              return (
                <View
                  key={slot.name}
                  style={[styles.slotCard, { backgroundColor: THEME.card, borderColor: THEME.border }]}
                >
                  <View style={styles.slotHeaderRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.slotTitle, { color: THEME.text }]}>{slot.name}</Text>
                      <Text style={[styles.slotTime, { color: THEME.muted }]}>{slot.timeLabel}</Text>
                    </View>
                    <View style={styles.slotActions}>
                      {hasMeal ? (
                        <TouchableOpacity
                          onPress={() => removeSlotMeal(mealPlan._id)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Ionicons name="trash-outline" size={22} color="#EF4444" />
                        </TouchableOpacity>
                      ) : null}
                      <TouchableOpacity
                        style={styles.slotAddCircle}
                        onPress={() => openAiPanelForSlot(slot.name)}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="add" size={26} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {hasMeal ? (
                    <TouchableOpacity
                      activeOpacity={0.85}
                      style={styles.slotMealRow}
                      onPress={() => {
                        const base = recipe.jsonData || recipe;
                        router.push({
                          pathname: '/recipe-detail',
                          params: {
                            recipe: JSON.stringify({
                              ...base,
                              imageUrl: recipe.imageUrl || base?.imageUrl || jd.imageUrl,
                            }),
                          },
                        });
                      }}
                    >
                      <RecipeThumbnail
                        recipeName={dishName}
                        imageUrl={recipe?.imageUrl}
                        jsonData={jd}
                        style={styles.slotThumb}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.slotDishName, { color: THEME.text }]} numberOfLines={2}>
                          {dishName}
                        </Text>
                        <Text style={[styles.slotMacros, { color: THEME.muted }]}>
                          {cal != null ? `${cal} kcal` : '— kcal'}
                          {prot != null ? ` · ${prot}g protein` : ''}
                          {carbs != null ? ` · ${carbs}g carbs` : ''}
                          {fats != null ? ` · ${fats}g fat` : ''}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.slotEmpty}>
                      <Text style={[styles.slotEmptyTitle, { color: THEME.muted }]}>No meal planned</Text>
                      <Text style={[styles.slotEmptyHint, { color: THEME.muted }]}>
                        Tap + for AI ideas or add a dish
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}

            <TouchableOpacity
              style={[styles.secondaryAction, { backgroundColor: THEME.actionIconTintBg, borderColor: THEME.border }]}
              onPress={openAiPanel}
            >
              <Ionicons name="bulb-outline" size={22} color={isDarkMode ? '#6EE7B7' : '#059669'} />
              <Text style={[styles.secondaryActionText, { color: isDarkMode ? '#6EE7B7' : '#047857' }]}>
                AI recommendations (pick meal type)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryAction, { backgroundColor: THEME.actionIconTintBg, borderColor: THEME.border }]}
              onPress={() => router.push('/generate-ai-recipe')}
            >
              <Ionicons name="add-circle-outline" size={22} color={isDarkMode ? '#6EE7B7' : '#059669'} />
              <Text style={[styles.secondaryActionText, { color: isDarkMode ? '#6EE7B7' : '#047857' }]}>
                Add custom recipe
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      <Modal visible={isPanelOpen} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.panel, { backgroundColor: THEME.card }]}>
            <View style={styles.panelHeader}>
              <View style={[styles.handle, { backgroundColor: isDarkMode ? '#334155' : '#E2E8F0' }]} />
              <View style={styles.panelTopRow}>
                <Text style={[styles.panelTitle, { color: THEME.text }]}>
                  {aiMealSlot ? `AI ideas · ${aiMealSlot}` : 'AI meal ideas'}
                </Text>
                <TouchableOpacity onPress={closeAiPanel}>
                  <Ionicons name="close-circle" size={28} color={THEME.muted} />
                </TouchableOpacity>
              </View>
              {aiMealSlot ? (
                <Text style={[styles.panelSubtitle, { color: THEME.muted }]}>
                  Pick a dish to add to your plan, or refresh for new options.
                </Text>
              ) : (
                <Text style={[styles.panelSubtitle, { color: THEME.muted }]}>
                  Choose breakfast, lunch, snacks, or dinner — we will suggest 5–6 fits for that slot.
                </Text>
              )}
            </View>

            <View style={styles.panelBody}>
              {loadingSuggestions && suggestions.length === 0 ? (
                <View style={styles.panelCenter}>
                  <ActivityIndicator size="large" color="#6C63FF" />
                  <Text style={[styles.loadingText, { color: THEME.muted }]}>
                    Finding {aiMealSlot ? `${aiMealSlot.toLowerCase()} ` : ''}options for you...
                  </Text>
                </View>
              ) : suggestions.length > 0 && aiMealSlot ? (
                <ScrollView showsVerticalScrollIndicator={false}>
                  <TouchableOpacity
                    style={[styles.changeMealBtn, { borderColor: THEME.border }]}
                    onPress={() => {
                      setAiMealSlot(null);
                      setSuggestions([]);
                    }}
                  >
                    <Ionicons name="swap-horizontal" size={18} color="#6C63FF" />
                    <Text style={styles.changeMealBtnText}>Change meal type</Text>
                  </TouchableOpacity>
                  {suggestions.map((recipe, index) => {
                    const previewUri = String(recipe.imageUrl || '').trim();
                    const showThumb =
                      previewUri.startsWith('http') || previewUri.startsWith('data:');
                    return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.suggestionCard,
                        {
                          backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC',
                          borderColor: THEME.border,
                        },
                      ]}
                      onPress={() => handleRecipeSelect(recipe)}
                    >
                      {showThumb ? (
                        <Image
                          source={{ uri: previewUri }}
                          style={styles.suggestThumb}
                          resizeMode="cover"
                        />
                      ) : (
                        <View
                          style={[
                            styles.suggestThumb,
                            { backgroundColor: isDarkMode ? '#1E293B' : '#E2E8F0' },
                          ]}
                        />
                      )}
                      <View style={styles.suggestInfo}>
                        <View style={styles.suggestTitleRow}>
                          <Text style={[styles.sRecipeName, { color: THEME.text, flex: 1 }]} numberOfLines={2}>
                            {recipe.recipeName}
                          </Text>
                          <Text style={styles.sKcalBadge}>{recipe.calories} kcal</Text>
                        </View>
                        <Text style={[styles.sRecipeDesc, { color: THEME.muted }]} numberOfLines={2}>
                          {recipe.description}
                        </Text>
                        <View style={styles.sStatsRow}>
                          <View style={styles.sStat}>
                            <Text style={[styles.sStatText, { color: THEME.muted }]}>
                              {recipe.proteins ?? '—'}g protein
                            </Text>
                          </View>
                          <View style={styles.sStat}>
                            <Text style={[styles.sStatText, { color: THEME.muted }]}>
                              {recipe.carbs ?? '—'}g carbs
                            </Text>
                          </View>
                          <View style={styles.sStat}>
                            <Text style={[styles.sStatText, { color: THEME.muted }]}>
                              {recipe.fats ?? recipe.fat ?? '—'}g fat
                            </Text>
                          </View>
                        </View>
                      </View>
                      <Ionicons name="add-circle" size={32} color="#10B981" />
                    </TouchableOpacity>
                  );
                  })}
                  <TouchableOpacity
                    style={[styles.refreshBtnRow, { borderColor: THEME.border }]}
                    onPress={() => getAiSuggestions(aiMealSlot)}
                    disabled={loadingSuggestions}
                  >
                    <Ionicons name="refresh" size={20} color="#6C63FF" />
                    <Text style={styles.refreshText}>Refresh suggestions</Text>
                  </TouchableOpacity>
                </ScrollView>
              ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.mealSlotScroll}>
                  <Text style={[styles.mealSlotSectionTitle, { color: THEME.text }]}>Which meal?</Text>
                  <View style={styles.mealSlotGrid}>
                    {MEAL_SLOTS.map((slot) => (
                      <TouchableOpacity
                        key={slot.name}
                        style={[
                          styles.mealSlotCard,
                          {
                            backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC',
                            borderColor: THEME.border,
                          },
                        ]}
                        onPress={() => pickMealSlot(slot.name)}
                        activeOpacity={0.85}
                      >
                        <View style={[styles.mealSlotIconWrap, { backgroundColor: isDarkMode ? '#1E293B' : '#ECFDF5' }]}>
                          <Ionicons name={slot.icon} size={26} color="#10B981" />
                        </View>
                        <Text style={[styles.mealSlotName, { color: THEME.text }]}>{slot.name}</Text>
                        <Text style={[styles.mealSlotHint, { color: THEME.muted }]}>{slot.hint}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Image
                    source={{ uri: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg' }}
                    style={styles.pImg}
                  />
                  <Text style={[styles.pMsg, { color: THEME.muted }]}>
                    You will get 5–6 AI suggestions tailored to your profile and the meal you chose.
                  </Text>
                  <TouchableOpacity
                    style={styles.pManualBtn}
                    onPress={() => {
                      closeAiPanel();
                      router.push('/generate-ai-recipe');
                    }}
                  >
                    <Text style={styles.pManualText}>Or build a custom recipe</Text>
                  </TouchableOpacity>
                </ScrollView>
              )}
            </View>
          </View>
        </View>

        {showMealSelector && (
          <AddToMealActionSheet
            onSave={onSaveMeal}
            onClose={() => setShowMealSelector(false)}
            initialMealType={aiMealSlot}
            initialDate={planDateStr}
            lockMealType={Boolean(aiMealSlot)}
          />
        )}
      </Modal>

      <Modal visible={calendarOpen} animationType="fade" transparent>
        <View style={styles.calendarOverlay}>
          <View style={[styles.calendarSheet, { backgroundColor: THEME.card, borderColor: THEME.border }]}>
            <View style={styles.calendarSheetHeader}>
              <Text style={[styles.calendarSheetTitle, { color: THEME.text }]}>Choose a day</Text>
              <TouchableOpacity
                onPress={() => setCalendarOpen(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={26} color={THEME.muted} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.calendarSheetHint, { color: THEME.muted }]}>
              Next 4 months — meal plan for the date you pick
            </Text>
            <FlatList
              data={calendarDayOptions}
              keyExtractor={(item) => item.key}
              showsVerticalScrollIndicator={false}
              initialNumToRender={18}
              contentContainerStyle={styles.calendarListContent}
              renderItem={({ item }) => {
                const selected = item.dateStr === planDateStr;
                return (
                  <TouchableOpacity
                    style={[
                      styles.calendarRow,
                      { borderColor: THEME.border, backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC' },
                      selected && { borderColor: '#6C63FF', backgroundColor: isDarkMode ? '#1E1B4B' : '#F5F3FF' },
                    ]}
                    onPress={() => {
                      setPlanDate(item.moment.clone().startOf('day'));
                      setCalendarOpen(false);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.calendarRowLabel, { color: THEME.text }]}>{item.label}</Text>
                      {item.sublabel ? (
                        <Text style={[styles.calendarRowSub, { color: THEME.muted }]}>{item.sublabel}</Text>
                      ) : null}
                    </View>
                    <Text style={[styles.calendarRowDate, { color: THEME.muted }]}>{item.moment.format('MMM D')}</Text>
                    {selected ? (
                      <Ionicons name="checkmark-circle" size={22} color="#6C63FF" style={{ marginLeft: 8 }} />
                    ) : null}
                  </TouchableOpacity>
                );
              }}
            />
            <TouchableOpacity
              style={[styles.calendarTodayBtn, { borderColor: THEME.border }]}
              onPress={() => {
                setPlanDate(moment().startOf('day'));
                setCalendarOpen(false);
              }}
            >
              <Ionicons name="today-outline" size={20} color="#6C63FF" />
              <Text style={styles.calendarTodayBtnText}>Jump to today</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={dietPlanPanelOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.panel, { backgroundColor: THEME.card, height: height * 0.66 }]}>
            <View style={styles.panelHeader}>
              <View style={[styles.handle, { backgroundColor: isDarkMode ? '#334155' : '#E2E8F0' }]} />
              <View style={styles.panelTopRow}>
                <Text style={[styles.panelTitle, { color: THEME.text }]}>Diet plan for you</Text>
                <TouchableOpacity onPress={() => setDietPlanPanelOpen(false)}>
                  <Ionicons name="close-circle" size={28} color={THEME.muted} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.panelSubtitle, { color: THEME.muted }]}>
                Based on your selected goal: {dietPlan.goalTitle}.
              </Text>
            </View>
            <ScrollView style={styles.panelBody} showsVerticalScrollIndicator={false}>
              <View style={[styles.planCard, { backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC', borderColor: THEME.border }]}>
                <Text style={[styles.planItemTitle, { color: THEME.text }]}>Daily nutrition target</Text>
                <Text style={[styles.planItemText, { color: THEME.muted }]}>Protein: {dietPlan.proteinTarget} g</Text>
                <Text style={[styles.planItemText, { color: THEME.muted }]}>Carbs: {dietPlan.carbTarget} g</Text>
                <Text style={[styles.planItemText, { color: THEME.muted }]}>Fats: {dietPlan.fatTarget} g</Text>
              </View>
              <View style={[styles.planCard, { backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC', borderColor: THEME.border }]}>
                <Text style={[styles.planItemTitle, { color: THEME.text }]}>Workout suggestion</Text>
                <Text style={[styles.planItemText, { color: THEME.muted }]}>Type: {dietPlan.workoutType}</Text>
                <Text style={[styles.planItemText, { color: THEME.muted }]}>Time: {dietPlan.workoutMinutes} min/day</Text>
              </View>
              {(dietPlan.workoutPreference === 'gym' || dietPlan.workoutPreference === 'both') ? (
                <View style={[styles.planCard, { backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC', borderColor: THEME.border }]}>
                  <Text style={[styles.planItemTitle, { color: THEME.text }]}>Gym workout names</Text>
                  <Text style={[styles.planItemText, { color: THEME.muted }]}>
                    {dietPlan.gymWorkouts.slice(0, 4).join(' • ')}
                  </Text>
                </View>
              ) : null}
              {(dietPlan.workoutPreference === 'home' || dietPlan.workoutPreference === 'both') ? (
                <View style={[styles.planCard, { backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC', borderColor: THEME.border }]}>
                  <Text style={[styles.planItemTitle, { color: THEME.text }]}>Home workout names</Text>
                  <Text style={[styles.planItemText, { color: THEME.muted }]}>
                    {dietPlan.homeWorkouts.slice(0, 4).join(' • ')}
                  </Text>
                </View>
              ) : null}
              <View style={[styles.planCard, { backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC', borderColor: THEME.border }]}>
                <Text style={[styles.planItemTitle, { color: THEME.text }]}>Walking target</Text>
                <Text style={[styles.planItemText, { color: THEME.muted }]}>
                  {dietPlan.walkingSteps.toLocaleString()} steps ({dietPlan.walkingMinutes} min) daily
                </Text>
              </View>
              <TouchableOpacity
                style={styles.startBtn}
                onPress={() => {
                  setDietPlanPanelOpen(false);
                  router.push('/diet-plan-progress');
                }}
              >
                <Text style={styles.startBtnText}>Let&apos;s Start</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 15 },
  headerTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  headerActions: { flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 2 },
  headerIconBtn: { padding: 6 },
  headerIconBtnDisabled: { opacity: 0.35 },
  calendarOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  calendarSheet: {
    borderRadius: 20,
    borderWidth: 1,
    maxHeight: height * 0.72,
    paddingBottom: 16,
    overflow: 'hidden',
  },
  calendarSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 8,
  },
  calendarSheetTitle: { fontSize: 18, fontWeight: '800' },
  calendarSheetHint: { fontSize: 13, paddingHorizontal: 18, marginBottom: 10, lineHeight: 18 },
  calendarListContent: { paddingHorizontal: 14, paddingBottom: 8 },
  calendarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  calendarRowLabel: { fontSize: 16, fontWeight: '700' },
  calendarRowSub: { fontSize: 12, marginTop: 2 },
  calendarRowDate: { fontSize: 14, fontWeight: '600' },
  calendarTodayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 14,
    marginTop: 4,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  calendarTodayBtnText: { fontSize: 15, fontWeight: '700', color: '#6C63FF' },
  title: { fontSize: 28, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 16, color: '#6B7280', marginTop: 4 },
  scrollInner: { paddingHorizontal: 20, paddingTop: 4 },
  nutritionCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  nutritionTitle: { fontSize: 17, fontWeight: '700' },
  nutritionGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 14 },
  nutritionCell: { width: '50%', paddingVertical: 10, paddingRight: 8 },
  nutritionLabel: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  nutritionValue: { fontSize: 18, fontWeight: '800' },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginTop: 18, marginBottom: 10 },
  slotCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
  },
  slotHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  slotTitle: { fontSize: 17, fontWeight: '700' },
  slotTime: { fontSize: 13, marginTop: 2 },
  slotActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  slotAddCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotMealRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  slotThumb: {
    width: 64,
    height: 64,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
  },
  slotDishName: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  slotMacros: { fontSize: 13, lineHeight: 18 },
  slotEmpty: { paddingVertical: 6, paddingBottom: 4 },
  slotEmptyTitle: { fontSize: 15, fontWeight: '600' },
  slotEmptyHint: { fontSize: 13, marginTop: 4 },
  secondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 10,
    gap: 12,
  },
  secondaryActionText: { fontSize: 15, fontWeight: '700', flex: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  panel: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, height: height * 0.82 },
  panelHeader: { padding: 20, alignItems: 'center' },
  handle: { width: 40, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, marginBottom: 15 },
  panelTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' },
  panelTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  panelSubtitle: { fontSize: 14, lineHeight: 20, marginTop: 10, width: '100%' },
  panelBody: { flex: 1, paddingHorizontal: 20 },
  panelCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 40 },
  pImg: { width: 180, height: 130, borderRadius: 24, marginBottom: 20 },
  pMsg: { textAlign: 'center', color: '#475569', fontSize: 16, lineHeight: 24, marginBottom: 30, paddingHorizontal: 20 },
  pBtn: { backgroundColor: '#6C63FF', flexDirection: 'row', paddingHorizontal: 32, paddingVertical: 18, borderRadius: 20, alignItems: 'center', elevation: 4 },
  pBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  pManualBtn: { marginTop: 20 },
  pManualText: { color: '#6C63FF', fontWeight: '700', fontSize: 15 },
  mealSlotScroll: { paddingBottom: 28 },
  mealSlotSectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 14 },
  mealSlotGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, marginBottom: 20 },
  mealSlotCard: {
    width: '48%',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    marginBottom: 4,
  },
  mealSlotIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  mealSlotName: { fontSize: 16, fontWeight: '700' },
  mealSlotHint: { fontSize: 12, marginTop: 4 },
  changeMealBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  changeMealBtnText: { color: '#6C63FF', fontWeight: '700', fontSize: 14 },
  suggestThumb: {
    width: 64,
    height: 64,
    borderRadius: 14,
    marginRight: 12,
    backgroundColor: '#E2E8F0',
  },
  suggestionCard: { backgroundColor: '#F8FAFC', borderRadius: 20, padding: 18, flexDirection: 'row', alignItems: 'center', marginBottom: 14, borderWidth: 1, borderColor: '#F1F5F9' },
  suggestInfo: { flex: 1, paddingRight: 10 },
  suggestTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 4 },
  sKcalBadge: { fontSize: 13, fontWeight: '700', color: '#10B981' },
  sRecipeName: { fontSize: 17, fontWeight: '700', color: '#1E293B' },
  sRecipeDesc: { fontSize: 13, color: '#64748B', marginTop: 4 },
  sStatsRow: { flexDirection: 'row', marginTop: 10, flexWrap: 'wrap', gap: 10 },
  sStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sStatText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  refreshBtn: { alignItems: 'center', paddingVertical: 20 },
  refreshBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    marginTop: 4,
    marginBottom: 24,
    borderRadius: 14,
    borderWidth: 1,
  },
  refreshText: { color: '#6C63FF', fontWeight: '700', fontSize: 15 },
  loadingText: { marginTop: 15, fontSize: 16, color: '#64748B', fontWeight: '500' }
  ,
  planCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  planItemTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  planItemText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 2,
  },
  startBtn: {
    marginTop: 8,
    marginBottom: 20,
    borderRadius: 14,
    backgroundColor: '#6C63FF',
    paddingVertical: 14,
    alignItems: 'center',
  },
  startBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  }
});
