import { Image } from 'expo-image'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useMemo, useState, useContext, useRef } from 'react'
import { ActivityIndicator, ScrollView, Text, View, TouchableOpacity, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useMutation } from 'convex/react'
import * as Speech from 'expo-speech'
import { api } from '../convex/_generated/api'
import { UserContext } from '../context/UserContext'
import {
  GenerateRecipeImage,
  PEXELS_FALLBACK_IMAGE,
  completeRecipeTrilingualFields,
} from '../services/AiModel'
import LoadingDialog from '../components/LoadingDialog'
import AddToMealActionSheet from '../components/AddToMealActionSheet'
import Button from '../components/shared/Button'
import { getAppTheme } from '../constants/appTheme'
import {
  mergeEnrichedRecipe,
  mergeTranslatedSteps,
  normalizeIngredientsList,
  recipeNeedsTrilinguaCompletion,
} from '../utils/recipeI18n'

function localizedIngredientQuantity(item, lang) {
  if (lang === 'hi') {
    const q = String(item.quantityHI ?? '').trim()
    return q || String(item.quantity ?? '').trim()
  }
  if (lang === 'mr') {
    const q = String(item.quantityMR ?? '').trim()
    return q || String(item.quantity ?? '').trim()
  }
  return String(item.quantity ?? '').trim()
}

export default function RecipeDetail() {
  const { recipe } = useLocalSearchParams()
  const parsedRecipe = useMemo(() => (recipe ? JSON.parse(recipe) : null), [recipe])
  const [refinedRecipe, setRefinedRecipe] = useState(null)
  const [i18nFixing, setI18nFixing] = useState(false)
  const i18nEnrichAttempts = useRef(0)

  const recipeData = refinedRecipe ?? parsedRecipe

  const [selectedLanguage, setSelectedLanguage] = useState('en')
  const [imageLoading, setImageLoading] = useState(false)
  const [recipeImage, setRecipeImage] = useState(null)
  const [isReading, setIsReading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showActionSheet, setShowActionSheet] = useState(false)
  const { user, isDarkMode } = useContext(UserContext)
  const t = getAppTheme(isDarkMode)
  const saveRecipeMutation = useMutation(api.recipes.saveRecipe)
  const createMealPlanMutation = useMutation(api.mealPlan.CreateMealPlan)
  const router = useRouter()

  useEffect(() => {
    return () => {
      Speech.stop()
    }
  }, [])

  useEffect(() => {
    setRefinedRecipe(null)
    i18nEnrichAttempts.current = 0
  }, [parsedRecipe])

  /** When user opens Hindi/Marathi, fill any missing *HI / *MR fields once (or retry once if still incomplete). */
  useEffect(() => {
    if (!parsedRecipe) return undefined
    if (selectedLanguage !== 'hi' && selectedLanguage !== 'mr') return undefined

    const base = refinedRecipe ?? parsedRecipe
    if (!recipeNeedsTrilinguaCompletion(base)) return undefined
    if (i18nEnrichAttempts.current >= 2) return undefined

    i18nEnrichAttempts.current += 1
    let cancelled = false
    setI18nFixing(true)
    completeRecipeTrilingualFields(parsedRecipe)
      .then((enriched) => {
        if (!cancelled) {
          setRefinedRecipe(mergeEnrichedRecipe(parsedRecipe, enriched))
        }
      })
      .catch((e) => console.log('Recipe translation repair:', e?.message || e))
      .finally(() => {
        if (!cancelled) setI18nFixing(false)
      })

    return () => {
      cancelled = true
    }
  }, [parsedRecipe, selectedLanguage, refinedRecipe])

  const onReadRecipe = () => {
    if (isReading) {
      Speech.stop()
      setIsReading(false)
      return
    }

    if (!recipeData) return

    setIsReading(true)
    let fullText = ""

    const ings = normalizeIngredientsList(recipeData.ingredients)

    if (selectedLanguage === 'hi') {
        const ingredientsText = ings
          .map((i) => {
            const name = i.ingredientHI || i.ingredient || ''
            const q = localizedIngredientQuantity(i, 'hi')
            return q ? `${name} (${q})` : name
          })
          .filter(Boolean)
          .join(', ')
        const stepsMerged = mergeTranslatedSteps(recipeData.steps, recipeData.stepsHI)
        const stepsText = stepsMerged.join('. ')
        fullText = `नुस्खा का नाम: ${recipeData.recipeNameHI || recipeData.recipeName}. विवरण: ${recipeData.descriptionHI || recipeData.description}. सामग्री हैं: ${ingredientsText}. कदम हैं: ${stepsText}.`
    } else if (selectedLanguage === 'mr') {
        const ingredientsText = ings
          .map((i) => {
            const name = i.ingredientMR || i.ingredient || ''
            const q = localizedIngredientQuantity(i, 'mr')
            return q ? `${name} (${q})` : name
          })
          .filter(Boolean)
          .join(', ')
        const stepsMerged = mergeTranslatedSteps(recipeData.steps, recipeData.stepsMR)
        const stepsText = stepsMerged.join('. ')
        fullText = `रेसिपीचे नाव: ${recipeData.recipeNameMR || recipeData.recipeName}. वर्णन: ${recipeData.descriptionMR || recipeData.description}. घटक आहेत: ${ingredientsText}. पायऱ्या आहेत: ${stepsText}.`
    } else {
        const ingredientsText = ings
          .map((i) => {
            const name = i.ingredient || ''
            const q = localizedIngredientQuantity(i, 'en')
            return q ? `${name} (${q})` : name
          })
          .filter(Boolean)
          .join(', ')
        const stepsText = (Array.isArray(recipeData.steps) ? recipeData.steps : []).join('. ')
        fullText = `Recipe Name: ${recipeData.recipeName}. Description: ${recipeData.description}. Ingredients are: ${ingredientsText}. Steps are: ${stepsText}.`
    }
    
    Speech.speak(fullText, { 
      rate: 0.8,
      language: selectedLanguage === 'hi' ? 'hi-IN' : selectedLanguage === 'mr' ? 'mr-IN' : 'en-US',
      onDone: () => setIsReading(false),
      onStopped: () => setIsReading(false),
      onError: () => setIsReading(false)
    })
  }


  const onSaveRecipe = async (mealDate, mealType) => {
    if (!user?._id) {
      Alert.alert('Error', 'User not logged in')
      return
    }

    if (!mealDate || !mealType) {
        Alert.alert('Error!', 'Please Select All Details')
        return
    }

    try {
      setLoading(true)

      let imageUrl = String(recipeImage || recipeData.imageUrl || '').trim()
      if (!imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
        const fetched = await GenerateRecipeImage(
          recipeData.recipeName,
          recipeData.description || ''
        )
        imageUrl = String(fetched || '').trim()
      }
      if (!imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
        imageUrl = PEXELS_FALLBACK_IMAGE
      }

      const jsonData = { ...recipeData, imageUrl }

      const recipeId = await saveRecipeMutation({
        userId: user._id,
        recipeName: recipeData.recipeName,
        imageUrl,
        jsonData,
      })

      // 2. Create Meal Plan entry
      await createMealPlanMutation({
        recipeId: recipeId,
        date: mealDate,
        mealType: mealType,
        userId: user._id
      })

      setShowActionSheet(false)
      Alert.alert('Success', `Recipe added to your meal plan for ${mealDate} (${mealType})!`, [
        { text: 'OK', onPress: () => router.replace('/(tabs)/Home') }
      ])
    } catch (e) {
      console.log('SAVE ERROR:', e)
      Alert.alert('Error', 'Failed to save to meal plan')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!recipeData) return

    const existing = String(recipeData.imageUrl || '').trim()
    if (existing.startsWith('http') || existing.startsWith('data:')) {
      setRecipeImage(existing)
      setImageLoading(false)
      return
    }

    let cancelled = false

    const run = async () => {
      setImageLoading(true)
      try {
        const result = await GenerateRecipeImage(
          recipeData.recipeName,
          recipeData.description
        )
        if (cancelled) return

        let imageUri = result || PEXELS_FALLBACK_IMAGE
        if (!imageUri.startsWith('data:image') && !imageUri.startsWith('http')) {
          imageUri = `data:image/png;base64,${imageUri}`
        }
        setRecipeImage(imageUri)
      } catch (e) {
        if (!cancelled) {
          console.error('IMAGE GENERATION ERROR:', e)
          setRecipeImage(PEXELS_FALLBACK_IMAGE)
        }
      } finally {
        if (!cancelled) setImageLoading(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [recipeData])

  const getTranslatedData = () => {
    if (!recipeData) return null

    const ings = normalizeIngredientsList(recipeData.ingredients)

    if (selectedLanguage === 'hi') {
      return {
        ...recipeData,
        recipeName: recipeData.recipeNameHI || recipeData.recipeName,
        description: recipeData.descriptionHI || recipeData.description || '',
        ingredients: ings.map((i) => ({
          ...i,
          ingredient: i.ingredientHI || i.ingredient || '',
          quantity: localizedIngredientQuantity(i, 'hi'),
        })),
        steps: mergeTranslatedSteps(recipeData.steps, recipeData.stepsHI),
      }
    }
    if (selectedLanguage === 'mr') {
      return {
        ...recipeData,
        recipeName: recipeData.recipeNameMR || recipeData.recipeName,
        description: recipeData.descriptionMR || recipeData.description || '',
        ingredients: ings.map((i) => ({
          ...i,
          ingredient: i.ingredientMR || i.ingredient || '',
          quantity: localizedIngredientQuantity(i, 'mr'),
        })),
        steps: mergeTranslatedSteps(recipeData.steps, recipeData.stepsMR),
      }
    }
    return {
      ...recipeData,
      ingredients: ings.map((i) => ({
        ...i,
        ingredient: i.ingredient || '',
        quantity: localizedIngredientQuantity(i, 'en'),
      })),
      steps: Array.isArray(recipeData.steps) ? recipeData.steps : [],
    }
  }

  if (!recipeData) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: t.bg }}>
        <Text style={{ color: t.text }}>No recipe found</Text>
      </View>
    )
  }

  const displayData = getTranslatedData()

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }}>
      {imageLoading ? (
        <View
          style={{
            width: '100%',
            height: 320,
            backgroundColor: t.inputBg,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <ActivityIndicator size="large" color="#6C63FF" />
          <Text style={{ marginTop: 10, color: t.muted }}>
            Generating recipe image...
          </Text>
        </View>
      ) : recipeImage ? (
        <Image
          source={{ uri: recipeImage }}
          style={{
            width: '100%',
            height: 320,
          }}
          transition={500}
          contentFit="cover"
        />
      ) : null}

      <View style={{ padding: 20 }}>
        {/* Language Selection */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
          {['en', 'hi', 'mr'].map((lang) => (
            <TouchableOpacity
              key={lang}
              onPress={() => setSelectedLanguage(lang)}
              style={{
                paddingVertical: 6,
                paddingHorizontal: 15,
                borderRadius: 20,
                backgroundColor: selectedLanguage === lang ? '#6C63FF' : t.inputBg,
                borderWidth: 1,
                borderColor: selectedLanguage === lang ? '#6C63FF' : t.border
              }}
            >
              <Text style={{ 
                color: selectedLanguage === lang ? '#fff' : t.muted,
                fontWeight: 'bold',
                textTransform: 'uppercase'
              }}>
                {lang === 'en' ? 'English' : lang === 'hi' ? 'हिंदी' : 'मराठी'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {i18nFixing ? (
          <Text style={{ color: t.muted, fontSize: 13, marginBottom: 12 }}>
            Completing Hindi and Marathi translations…
          </Text>
        ) : null}

        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 10
        }}>
          <Text
            style={{
              fontSize: 28,
              fontWeight: 'bold',
              color: '#6C63FF',
              flex: 1
            }}
          >
            {displayData.recipeName}
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity 
              onPress={onReadRecipe}
              style={{
                backgroundColor: isReading ? '#6C63FF' : t.inputBg,
                padding: 8,
                borderRadius: 50
              }}
            >
              <Ionicons 
                name={isReading ? "stop-circle-outline" : "volume-medium-outline"} 
                size={30} 
                color={isReading ? "#fff" : "#6C63FF"} 
              />
            </TouchableOpacity>
          </View>
        </View>

        <Text
          style={{
            fontSize: 16,
            color: t.muted,
            marginTop: 8,
          }}
        >
          {displayData.description}
        </Text>

        <View style={{ marginTop: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: t.text }}>{selectedLanguage === 'hi' ? 'नुस्खा जानकारी' : selectedLanguage === 'mr' ? 'रेसिपी माहिती' : 'Recipe Info'}</Text>

          <Text style={{ marginTop: 8, fontSize: 16, color: t.text }}>
            {selectedLanguage === 'hi' ? 'कैलोरी' : selectedLanguage === 'mr' ? 'कॅलरी' : 'Calories'}: {recipeData?.calories || 'N/A'}
          </Text>

          <Text style={{ marginTop: 4, fontSize: 16, color: t.text }}>
            {selectedLanguage === 'hi' ? 'प्रोटीन' : selectedLanguage === 'mr' ? 'प्रथिने' : 'Proteins'}: {recipeData?.proteins || 'N/A'} {selectedLanguage === 'en' ? 'g' : 'ग्राम'}
          </Text>

          <Text style={{ marginTop: 4, fontSize: 16, color: t.text }}>
            {selectedLanguage === 'hi' ? 'परोसें' : selectedLanguage === 'mr' ? 'वाढणी' : 'Serves'}: {recipeData?.serveTo || 'N/A'}
          </Text>
        </View>

        <View style={{ marginTop: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: t.text }}>{selectedLanguage === 'hi' ? 'सामग्री' : selectedLanguage === 'mr' ? 'साहित्य' : 'Ingredients'}</Text>

          {displayData?.ingredients?.map((item, index) => (
            <View key={index} style={{ marginTop: 8 }}>
              <Text style={{ fontSize: 16, color: t.text }}>
                • {item?.icon ? `${item.icon} ` : ''}
                {item?.ingredient}
                {item?.quantity ? ` - ${item.quantity}` : ''}
              </Text>
            </View>
          ))}
        </View>

        <View style={{ marginTop: 20, marginBottom: 30 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: t.text }}>{selectedLanguage === 'hi' ? 'कदम' : selectedLanguage === 'mr' ? 'पायऱ्या' : 'Steps'}</Text>

          {displayData?.steps?.map((step, index) => (
            <Text
              key={index}
              style={{
                fontSize: 16,
                lineHeight: 24,
                color: t.text,
                marginBottom: 10
              }}
            >
              {index + 1}. {step}
            </Text>
          ))}
        </View>

        <View style={{ marginTop: 20, marginBottom: 40 }}>
           <Button title={selectedLanguage === 'hi' ? 'भोजन योजना में जोड़ें' : selectedLanguage === 'mr' ? 'जेवणाच्या नियोजनात जोडा' : "Add to meal plan"} onPress={() => setShowActionSheet(true)} />
        </View>
      </View>
      
      <LoadingDialog loading={loading} message="Saving to meal plan..." />

      {showActionSheet && (
        <AddToMealActionSheet 
          onClose={() => setShowActionSheet(false)}
          onSave={onSaveRecipe}
        />
      )}
    </ScrollView>
  )
}
