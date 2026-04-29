import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from "axios";
import OpenAI from "openai";
import { STORAGE_USER_OPENROUTER_KEY } from '../constants/settingsStorage';

const AI_MODEL = "google/gemini-2.0-flash-001";

async function getOpenAIClient() {
  let apiKey = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY || '';
  try {
    const stored = await AsyncStorage.getItem(STORAGE_USER_OPENROUTER_KEY);
    if (stored?.trim()) {
      apiKey = stored.trim();
    }
  } catch {
    /* use env */
  }
  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: apiKey || "missing-api-key",
    dangerouslyAllowBrowser: true,
  });
}

const RECIPE_JSON_SYSTEM = `You are a professional diet planner and recipe generator. Return ONLY raw JSON. No markdown, no code fences, no notes. If output is long, never truncate mid-object; finish valid JSON. Escape strings for JSON; no trailing commas.

Trilingual requirement (every recipe in the user request):
- English fields: recipeName, description, steps[], ingredients[].ingredient, ingredients[].quantity.
- Hindi Devanagari: recipeNameHI, descriptionHI, stepsHI[], ingredients[].ingredientHI, ingredients[].quantityHI (full Hindi amounts and units, e.g. "१ कप", "दो चम्मच").
- Marathi Devanagari: recipeNameMR, descriptionMR, stepsMR[], ingredients[].ingredientMR, ingredients[].quantityMR.
- steps.length MUST equal stepsHI.length AND stepsMR.length. Each stepsHI[i] is a complete Hindi translation of steps[i] (same detail, no English). Same for stepsMR[i].
- Every ingredient object MUST include non-empty ingredient, ingredientHI, ingredientMR, quantity, quantityHI, quantityMR.
- Never omit *HI or *MR keys when the English counterpart exists. Do not summarize or shorten translations.`;

export const GenerateRecipeOptions = async (PROMPT, options = {}) => {
  const maxTokens = typeof options.maxTokens === 'number' ? options.maxTokens : 4000;
  const openai = await getOpenAIClient();
  try {
    console.log(`ATTEMPTING RECIPE GENERATION WITH OPENROUTER: ${AI_MODEL}`);
    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: 'system', content: RECIPE_JSON_SYSTEM },
        { role: "user", content: PROMPT }
      ],
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("AI returned an empty response. Please try again.");
    }

    return content;
  } catch (error) {
    console.log(`AI GENERATION ERROR:`, error?.message || error);
    throw new Error("Failed to generate recipe. " + (error?.message || "Internal Error"));
  }
};

/**
 * One-shot repair: fill missing or misaligned Hindi/Marathi fields on a recipe object.
 * @param {Record<string, unknown>} recipe
 */
export async function completeRecipeTrilingualFields(recipe) {
  const openai = await getOpenAIClient();
  const slim = { ...recipe };
  delete slim.imageUrl;
  const userMsg = `You repair recipe JSON for a trilingual app (English + Hindi + Marathi).

Return ONLY one JSON object with the SAME top-level structure and keys as the input. Preserve every English field, every number (calories, proteins, carbs, fats, serveTo), and every "icon" exactly. Do not remove keys.

Fix or add:
- recipeNameHI, recipeNameMR, descriptionHI, descriptionMR: full Devanagari (no English in these strings).
- ingredients[]: each item must have ingredient, ingredientHI, ingredientMR, quantity (English), quantityHI (Hindi amounts/units), quantityMR (Marathi amounts/units). If quantity is empty, use "" for quantityHI/MR too.
- steps, stepsHI, stepsMR: same array length as input steps. stepsHI[i] fully translates steps[i] into Hindi; stepsMR[i] into Marathi. No English inside stepsHI or stepsMR.

INPUT JSON:
${JSON.stringify(slim)}`;

  const response = await openai.chat.completions.create({
    model: AI_MODEL,
    messages: [
      {
        role: 'system',
        content:
          'Return only valid JSON matching the user recipe object shape. No markdown, no trailing commas.',
      },
      { role: 'user', content: userMsg },
    ],
    max_tokens: 8192,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Empty translation repair response');
  }
  const parsed = JSON.parse(content);
  if (parsed && Array.isArray(parsed.recipes) && parsed.recipes[0]) {
    return parsed.recipes[0];
  }
  return parsed;
}

const FOOD_SCAN_SYSTEM =
  'You are a registered dietitian assistant. Analyze food photos and return ONLY valid JSON. No markdown, no code fences, no trailing commas.';

const FOOD_SCAN_USER_TEXT = `Look at the meal or ingredients in the image. Estimate total nutrition for what is shown as one logical portion (one plate, one bowl, or the main dish in frame). If multiple separate items are visible, combine them into one meal total.

Return ONLY this JSON shape (use numbers for numeric fields, integers for calories and score):
{
  "dish_name": "best guess dish name",
  "ingredients": ["ingredient 1", "ingredient 2"],
  "meal_summary": "short description of visible food",
  "calories": number,
  "calories_label": "LOW CALORIES" | "MODERATE CALORIES" | "HIGH CALORIES",
  "sodium_mg": number,
  "sodium_label": "LOW SODIUM" | "MODERATE SODIUM" | "HIGH SODIUM",
  "protein_g": number,
  "protein_label": "LOW PROTEIN" | "MODERATE PROTEIN" | "HIGH PROTEIN",
  "fiber_g": number,
  "fiber_label": "LOW FIBER" | "MODERATE FIBER" | "HIGH FIBER",
  "fat_g": number,
  "fat_label": "LOW FAT" | "MODERATE FAT" | "HIGH FAT",
  "sugar_g": number,
  "sugar_label": "LOW SUGAR" | "MODERATE SUGAR" | "HIGH SUGAR",
  "is_good_for_plan": "YES" | "MODERATE" | "NO",
  "plan_feedback": "one short sentence about diet-plan fit",
  "score": integer 0-100,
  "score_reason": "max 12 words"
}

Label guidance (per typical single-meal context): calories <350 often LOW, 350-700 MODERATE, >700 HIGH; sodium <500mg LOW for a meal, 500-900 MODERATE, >900 HIGH; protein <12g LOW, 12-25 MODERATE, >25 HIGH; fiber <4g LOW, 4-8 MODERATE, >8 HIGH; fat <12g LOW, 12-25 MODERATE, >25 HIGH; sugar <10g LOW, 10-20 MODERATE, >20 HIGH. Adjust if the meal is clearly a small snack or a very large plate.`;

/**
 * Vision analysis: base64 image (no data: prefix), mime type e.g. image/jpeg.
 * @returns {Promise<string>} Raw JSON string from the model
 */
export const analyzeFoodImageNutrition = async (base64Image, mimeType = 'image/jpeg') => {
  const raw = String(base64Image || '').replace(/^data:image\/\w+;base64,/, '').trim();
  if (!raw) {
    throw new Error('No image data to analyze.');
  }

  const openai = await getOpenAIClient();
  const dataUrl = `data:${mimeType};base64,${raw}`;

  try {
    console.log(`FOOD SCAN VISION: ${AI_MODEL}`);
    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: 'system', content: FOOD_SCAN_SYSTEM },
        {
          role: 'user',
          content: [
            { type: 'text', text: FOOD_SCAN_USER_TEXT },
            {
              type: 'image_url',
              image_url: { url: dataUrl },
            },
          ],
        },
      ],
      max_tokens: 1200,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('AI returned an empty response. Please try again.');
    }
    return content;
  } catch (error) {
    console.log('FOOD SCAN ERROR:', error?.message || error);
    throw new Error(
      'Could not analyze this photo. ' + (error?.message || 'Check your API key and try again.')
    );
  }
};

export const TranscribeAudioAI = async (base64Audio, format = "wav") => {
  const openai = await getOpenAIClient();
  try {
    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Transcribe this audio. Return only the spoken text. No explanation.",
            },
            {
              type: "input_audio",
              input_audio: {
                data: base64Audio,
                format,
              },
            },
          ],
        },
      ],
    });

    return response.choices[0]?.message?.content || "";
  } catch (error) {
    console.log("TRANSCRIBE ERROR:", error);
    return "";
  }
};

/** Used when Pexels has no key, no hits, or the request fails. */
export const PEXELS_FALLBACK_IMAGE =
  'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg';

/** True when we should fetch (or re-fetch) a photo from Pexels using the recipe name. */
export function isPlaceholderRecipeImage(url) {
  const s = String(url || '').trim();
  if (!s) return true;
  if (s === PEXELS_FALLBACK_IMAGE) return true;
  return false;
}

/**
 * Prefer a non-placeholder URL (e.g. list preview); otherwise resolve via recipe name (cached).
 */
export async function resolveRecipeThumbnailUrl(
  recipeName,
  description = '',
  preferredUrl = ''
) {
  const pref = String(preferredUrl || '').trim();
  if (
    pref &&
    (pref.startsWith('http') || pref.startsWith('data:')) &&
    !isPlaceholderRecipeImage(pref)
  ) {
    return pref;
  }
  const name = String(recipeName || 'meal').trim() || 'meal';
  const u = await GenerateRecipeImage(name, description);
  return String(u || '').trim() || PEXELS_FALLBACK_IMAGE;
}

const PEXELS_STOP_WORDS = new Set([
  'the', 'a', 'an', 'with', 'and', 'or', 'for', 'from', 'into', 'realistic',
  'beautifully', 'professional', 'photography', 'photo', 'image', 'top', 'view',
  'soft', 'lighting', 'plated', 'plate', 'fresh', 'homemade', 'delicious', 'food',
  'meal', 'recipe', 'style', 'garnish', 'served', 'bowl', 'dish',
]);

function asciiKeywords(text) {
  return String(text || '')
    .replace(/[^\x00-\x7F]+/g, ' ')
    .replace(/[^\w\s]/g, ' ')
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 2 && !PEXELS_STOP_WORDS.has(w));
}

/**
 * Stock-photo search terms; Pexels matches short English keywords, not long "AI image" prompts.
 */
function buildPexelsSearchQueries(recipeName, description) {
  const nameWords = [...new Set(asciiKeywords(recipeName))];
  const descWords = [...new Set(asciiKeywords(String(description || '').slice(0, 200)))];
  const combined = [...new Set([...nameWords, ...descWords])].slice(0, 14).join(' ');

  const queries = [];
  if (combined.length > 0) queries.push(`${combined} food`);
  if (nameWords.length > 0) queries.push(`${nameWords.slice(0, 8).join(' ')}`);
  queries.push('healthy meal');

  return [...new Set(queries.map((q) => q.replace(/\s+/g, ' ').trim()).filter(Boolean))];
}

function pickPhotoSrc(photo) {
  const s = photo?.src;
  if (!s || typeof s !== 'object') return null;
  return (
    s.large2x ||
    s.large ||
    s.medium ||
    s.portrait ||
    s.landscape ||
    s.small ||
    null
  );
}

async function searchPexelsOnce(query, apiKey) {
  const q = query.slice(0, 120).trim();
  if (!q) return null;

  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=3`;

  const res = await axios.get(url, {
    headers: { Authorization: apiKey },
    timeout: 20000,
    validateStatus: () => true,
  });

  if (res.status !== 200) {
    console.log('PEXELS HTTP', res.status, res.data?.error || res.data);
    return null;
  }

  const photos = res.data?.photos;
  if (!Array.isArray(photos) || photos.length === 0) return null;

  for (const photo of photos) {
    const uri = pickPhotoSrc(photo);
    if (uri) return uri;
  }
  return null;
}

/**
 * Fetches a recipe thumbnail from Pexels (stock photos).
 * @param {string} recipeName - Dish title (e.g. "Oatmeal with berries")
 * @param {string} [description] - Optional short description for extra keywords
 */
export const GenerateRecipeImage = async (recipeName, description = '') => {
  const name = String(recipeName || 'meal').trim() || 'meal';
  const cacheKey = `pexels_img_${name.slice(0, 72).replace(/\W/g, '_')}`;

  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) return cached;

    const apiKey = String(process.env.EXPO_PUBLIC_PEXELS_API_KEY || '')
      .trim()
      .replace(/^['"]+|['"]+$/g, '');
    if (!apiKey) {
      console.warn('PEXELS: set EXPO_PUBLIC_PEXELS_API_KEY in your env');
      return PEXELS_FALLBACK_IMAGE;
    }

    const queries = buildPexelsSearchQueries(name, description);
    for (const query of queries) {
      const uri = await searchPexelsOnce(query, apiKey);
      if (uri) {
        await AsyncStorage.setItem(cacheKey, uri);
        return uri;
      }
    }

    console.log('PEXELS: no results for queries', queries);
    return PEXELS_FALLBACK_IMAGE;
  } catch (error) {
    console.log('PEXELS IMAGE ERROR:', error?.response?.data || error?.message);
    return PEXELS_FALLBACK_IMAGE;
  }
};

export const ChatWithRecipeAI = async (messages) => {
  const openai = await getOpenAIClient();
  try {
    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: "system", content: "You are a helpful culinary assistant. Keep your responses concise and direct. Use numbered lists for recipes. Use bold text for recipe names. If you suggest specific recipes, at the end of your message add a raw JSON block like this (no backticks): {\"suggested_recipes\": [\"Recipe Name 1\", \"Recipe Name 2\"]}. This will allow the user to add them to their meal plan." },
        ...messages
      ],
      max_tokens: 1000,
    });

    return response.choices[0]?.message?.content || "I'm having trouble responding right now.";
  } catch (error) {
    console.log("CHAT ERROR:", error);
    return "I'm having trouble responding right now.";
  }
};
