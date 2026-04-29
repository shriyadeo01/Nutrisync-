import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio'
import * as FileSystem from 'expo-file-system/legacy'
import { useRouter } from 'expo-router'
import * as Speech from 'expo-speech'
import { useMutation } from 'convex/react'
import { useContext, useState } from 'react'
import { ScrollView, Text, TextInput, View, Alert } from 'react-native'

import LoadingDialog from '../../components/LoadingDialog'
import RecipeOptionList from '../../components/RecipeOptionList'
import { api } from '../../convex/_generated/api'
import { UserContext } from '../../context/UserContext'
import {
  GenerateRecipeImage,
  GenerateRecipeOptions as GenerateRecipeOptionsAiModel,
  PEXELS_FALLBACK_IMAGE,
  TranscribeAudioAI,
} from '../../services/AiModel'
import Prompt from '../../Shared/Prompt'
import Button from './../../components/shared/Button'
import VoiceAssistantButton from './../../components/shared/VoiceAssistantButton'
import { getAppTheme } from '../../constants/appTheme'

export default function GenerateAiRecipe() {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [recipes, setRecipes] = useState([])
  const [isListening, setIsListening] = useState(false)
  const [recipeLoading, setRecipeLoading] = useState(false)

  const { user, isDarkMode } = useContext(UserContext)
  const t = getAppTheme(isDarkMode)
  const saveRecipeMutation = useMutation(api.recipes.saveRecipe)

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY)
  const router = useRouter()

  const GenerateRecipeOptions = async (spokenInput) => {
    setLoading(true)

    try {
      const finalInput = spokenInput || input

      if (!finalInput?.trim()) {
        setLoading(false)
        return
      }

      const PROMPT = Prompt.RecipeGeneratorOption.replace('{INPUT}', finalInput)
      const result = await GenerateRecipeOptionsAiModel(PROMPT, { maxTokens: 6144 })

      if (!result || typeof result !== 'string') {
        throw new Error("Invalid AI response")
      }

      // Improved JSON extraction using regex to find the first { and last }
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
         console.log("FULL AI RESPONSE:", result);
         throw new Error("No valid JSON found in AI response");
      }
      
      let JSONContent;
      try {
        let cleanJson = jsonMatch[0];
        // Remove potential trailing commas before closing braces/brackets
        cleanJson = cleanJson.replace(/,\s*([\]}])/g, '$1');
        // Remove common AI prefixes like "json" if they accidentally got caught
        cleanJson = cleanJson.replace(/^json\s+/, '');
        
        JSONContent = JSON.parse(cleanJson);
      } catch (parseError) {
        console.log("FAILED TO PARSE JSON. RAW CONTENT:", jsonMatch[0]);
        throw new Error("Invalid JSON format from AI");
      }

      setRecipes(JSONContent.recipes || [])
      Speech.speak('I generated three recipe ideas for you')
      setLoading(false)
    } catch (e) {
      console.log(e)
      setLoading(false)
      Speech.speak('Sorry, I could not generate recipes')
    }
  }

  const startVoiceAssistant = async () => {
    try {
      if (isListening) return

      const permission = await requestRecordingPermissionsAsync()

      if (!permission.granted) {
        Speech.speak('Microphone permission is required')
        return
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      })

      await recorder.prepareToRecordAsync()
      recorder.record()
      setIsListening(true)
    } catch (e) {
      console.log(e)
      setIsListening(false)
      Speech.speak('Sorry, voice assistant failed')
    }
  }

  const stopVoiceAssistant = async () => {
    try {
      if (!isListening) return

      await recorder.stop()
      const audioUri = recorder.uri
      setIsListening(false)

      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      })

      if (!audioUri) {
        Speech.speak('I could not capture audio')
        return
      }

      setLoading(true)
      Speech.speak('Transcribing your request...')

      const base64Audio = await FileSystem.readAsStringAsync(audioUri, {
        encoding: FileSystem.EncodingType.Base64,
      })

      const format = audioUri.split('.').pop()?.toLowerCase() || 'wav'
      const transcript = await TranscribeAudioAI(base64Audio, format)

      if (!transcript) {
        setLoading(false)
        Speech.speak('I could not understand the audio')
        return
      }

      setInput(transcript)
      Speech.speak(`Generating recipe for ${transcript}`)
      
      await GenerateAndAddRecipe(transcript)
    } catch (e) {
      console.log(e)
      setLoading(false)
      setIsListening(false)
      Speech.speak('Sorry, voice assistant failed')
    }
  }

  const GenerateAndAddRecipe = async (transcript) => {
    try {
      const PROMPT = Prompt.RecipeGeneratorOption.replace('{INPUT}', transcript)
      const result = await GenerateRecipeOptionsAiModel(PROMPT, { maxTokens: 6144 })

      if (!result || typeof result !== 'string') {
        throw new Error("Invalid AI response")
      }

      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
         throw new Error("No valid JSON found in AI response");
      }
      
      let JSONContent;
      try {
        let cleanJson = jsonMatch[0];
        cleanJson = cleanJson.replace(/,\s*([\]}])/g, '$1');
        cleanJson = cleanJson.replace(/^json\s+/, '');
        JSONContent = JSON.parse(cleanJson);
      } catch (parseError) {
        throw new Error("Invalid JSON format from AI");
      }

      const recipeList = JSONContent.recipes || [];
      if (recipeList.length > 0) {
        const item = recipeList[0];

        let imageUrl = PEXELS_FALLBACK_IMAGE;
        try {
          const fromPexels = await GenerateRecipeImage(
            item.recipeName,
            item.description || ''
          );
          if (fromPexels && String(fromPexels).trim()) {
            imageUrl = String(fromPexels).trim();
          }
        } catch (e) {
          console.log('GenerateAiRecipe: recipe image', e?.message || e);
        }
        const itemWithImage = { ...item, imageUrl };

        if (user?._id) {
          await saveRecipeMutation({
            userId: user._id,
            recipeName: item.recipeName,
            imageUrl,
            jsonData: itemWithImage,
          });
          Speech.speak(`Perfect! I added ${item.recipeName} to your recipes.`);
        }

        setLoading(false);
        router.push({
          pathname: '/recipe-detail',
          params: {
            recipe: JSON.stringify(itemWithImage),
          },
        });
      } else {
        setLoading(false)
        Speech.speak('I could not find any recipes for that')
      }
    } catch (e) {
      console.log(e)
      setLoading(false)
      Speech.speak('Sorry, I failed to generate the recipe')
    }
  }

  const onRecipeOptionSelect = (item) => {
    setRecipeLoading(true)

    setTimeout(() => {
      setRecipeLoading(false)
      router.push({
        pathname: '/recipe-detail',
        params: {
          recipe: JSON.stringify(item),
        },
      })
    }, 700)
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView
        style={{
          padding: 20,
          backgroundColor: t.bg,
          flex: 1,
        }}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <View style={{ marginTop: 20 }}>
          <Text
            style={{
              fontSize: 30,
              fontWeight: 'bold',
              color: t.text,
            }}
          >
            AI Recipe Generator
          </Text>

          <Text
            style={{
              marginTop: 5,
              color: t.muted,
              fontSize: 18,
            }}
          >
            Generate Personalized recipes using AI
          </Text>

          <TextInput
            multiline={true}
            numberOfLines={5}
            style={{
              padding: 15,
              borderWidth: 1,
              borderRadius: 10,
              fontSize: 20,
              marginTop: 15,
              height: 150,
              textAlignVertical: 'top',
              backgroundColor: t.card,
              borderColor: t.border,
              color: t.text,
            }}
            placeholder="Enter your ingredients or recipe name"
            placeholderTextColor={t.muted}
            value={input}
            onChangeText={(value) => setInput(value)}
          />

          <View style={{ marginTop: 25 }}>
            <Button
              title={loading ? 'Generating...' : 'Generate Recipe'}
              onPress={() => GenerateRecipeOptions()}
            />
          </View>

          {recipes?.length > 0 && (
            <RecipeOptionList
              recipeOption={recipes}
              onRecipeOptionSelect={onRecipeOptionSelect}
            />
          )}
        </View>
      </ScrollView>

      <VoiceAssistantButton
        onPressIn={startVoiceAssistant}
        onPressOut={stopVoiceAssistant}
        isListening={isListening}
      />

      <LoadingDialog loading={loading} message="Generating recipes..." />
      <LoadingDialog loading={recipeLoading} message="Opening recipe..." />
    </View>
  )
}