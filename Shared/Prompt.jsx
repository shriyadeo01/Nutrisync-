export default {
  RecipeGeneratorOption: `Based on the user's input provided below, generate 3 healthy recipe options.

USER INPUT:
{INPUT}

Return ONLY raw JSON. Do not wrap the response in triple backticks. Do not add headings, notes, explanations, or introductory text. Ensure the JSON is complete and properly closed. Carefully avoid trailing commas in arrays and objects.

Expected JSON Structure:
{
  "recipes": [
    {
      "recipeName": "Title in English",
      "recipeNameHI": "शीर्षक हिंदी में",
      "recipeNameMR": "शीर्षक मराठीत",
      "description": "Short description in English",
      "descriptionHI": "हिंदी में संक्षिप्त विवरण",
      "descriptionMR": "मराठीत संक्षिप्त वर्णन",
      "calories": 420,
      "proteins": 22,
      "serveTo": 1,
      "ingredients": [
        {
          "icon": "🧀",
          "ingredient": "Name in English",
          "ingredientHI": "नाम हिंदी में",
          "ingredientMR": "नाव मराठीत",
          "quantity": "1 cup",
          "quantityHI": "१ कप",
          "quantityMR": "१ कप"
        }
      ],
      "steps": [
        "Step in English"
      ],
      "stepsHI": [
        "हिंदी में कदम"
      ],
      "stepsMR": [
        "मराठीत पायरी"
      ]
    }
  ]
}

MANDATORY for every recipe (no omissions):
- Fill recipeNameHI, recipeNameMR, descriptionHI, and descriptionMR with full Devanagari translations of the English title and description (not transliteration only unless the dish has no common native name).
- Every ingredient object MUST include non-empty ingredient, ingredientHI, ingredientMR, quantity (English), quantityHI (Hindi amounts/units in Devanagari), and quantityMR (Marathi). Use at least 4 ingredients per recipe when realistic.
- steps, stepsHI, and stepsMR MUST be arrays of the SAME length and the SAME order: index i in stepsHI and stepsMR must be the full faithful translation of steps[i] with the same cooking detail — never a one-line summary. No English words inside stepsHI or stepsMR. Use at least 4 steps per recipe.
- Do not skip optional-looking fields; the app switches language using these keys.`,
  DietRecipeSuggestions: `Based on the user's health data below, suggest 6 healthy recipe options for their diet. 

USER DATA:
{USER_DATA}

Return ONLY raw JSON. Do not wrap in backticks.
Expected JSON Structure (every recipe MUST include Hindi and Marathi fields; steps/stepsHI/stepsMR same length):
{
  "recipes": [
    {
      "recipeName": "Title in English",
      "recipeNameHI": "हिंदी शीर्षक",
      "recipeNameMR": "मराठी शीर्षक",
      "description": "Brief description",
      "descriptionHI": "हिंदी विवरण",
      "descriptionMR": "मराठी वर्णन",
      "calories": 400,
      "proteins": 20,
      "ingredients": [{"icon": "🥗", "ingredient": "English", "ingredientHI": "हिंदी", "ingredientMR": "मराठी", "quantity": "1 cup", "quantityHI": "१ कप", "quantityMR": "१ कप"}],
      "steps": ["Step 1 EN"],
      "stepsHI": ["पूरा वाक्य हिंदी में चरण १"],
      "stepsMR": ["पूर्ण वाक्य मराठीत पायरी १"]
    }
  ]
}`,

  MealSlotRecipeSuggestions: `You are a professional dietitian. Based on the user's health data, suggest exactly 5 or 6 distinct meal ideas appropriate ONLY for their {MEAL_TYPE} meal. Each idea should be realistic, varied, and aligned with their goal and preferences.

USER DATA:
{USER_DATA}

MEAL SLOT: {MEAL_TYPE}

Return ONLY raw JSON. Do not wrap in backticks. No trailing commas.

Expected JSON Structure — each recipe MUST include full Hindi (HI) and Marathi (MR) fields; steps/stepsHI/stepsMR MUST have the SAME length and parallel meaning (index-by-index translation, not shortened):
{
  "recipes": [
    {
      "recipeName": "Short English title",
      "recipeNameHI": "पूर्ण हिंदी शीर्षक",
      "recipeNameMR": "पूर्ण मराठी शीर्षक",
      "description": "One-line English description",
      "descriptionHI": "एक पंक्ति हिंदी विवरण",
      "descriptionMR": "एक ओळ मराठी वर्णन",
      "calories": 350,
      "proteins": 25,
      "carbs": 40,
      "fats": 12,
      "ingredients": [
        {
          "icon": "🥗",
          "ingredient": "English name",
          "ingredientHI": "हिंदी नाम",
          "ingredientMR": "मराठी नाव",
          "quantity": "amount with unit in English",
          "quantityHI": "मात्रा हिंदी में (इकाइयों सहित)",
          "quantityMR": "प्रमाण मराठीत (एककासह)"
        }
      ],
      "steps": ["English step 1", "English step 2"],
      "stepsHI": ["हिंदी चरण 1", "हिंदी चरण 2"],
      "stepsMR": ["मराठी पायरी 1", "मराठी पायरी 2"]
    }
  ]
}

Rules:
- Return between 5 and 6 recipes. Use numbers for calories, proteins, carbs, fats (grams).
- Per recipe: at least 4 ingredients; each MUST have ingredient, ingredientHI, ingredientMR, quantity, quantityHI, quantityMR. At least 4 cooking steps; stepsHI and stepsMR MUST match steps length and each step MUST be fully translated (same detail as English, no English left inside HI/MR strings).
- Never omit recipeNameHI, recipeNameMR, descriptionHI, descriptionMR, stepsHI, stepsMR, quantityHI, or quantityMR.
- If USER_DATA includes dietaryRestrictions or allergies (JSON arrays), every recipe must strictly respect them — no allergens, no conflicting ingredients.`
}