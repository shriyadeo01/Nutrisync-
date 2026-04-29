/** @param {unknown} ingredients */
export function normalizeIngredientsList(ingredients) {
  if (!Array.isArray(ingredients)) return [];
  return ingredients.map((item) => {
    if (typeof item === 'string') return { ingredient: item };
    return item && typeof item === 'object' ? item : { ingredient: String(item ?? '') };
  });
}

/**
 * True if Hindi/Marathi fields are missing, empty, or step arrays are misaligned.
 * Used to trigger a one-shot AI fill on the recipe detail screen.
 */
export function recipeNeedsTrilinguaCompletion(r) {
  if (!r || typeof r !== 'object') return false;
  const steps = Array.isArray(r.steps) ? r.steps : [];
  const hi = Array.isArray(r.stepsHI) ? r.stepsHI : [];
  const mr = Array.isArray(r.stepsMR) ? r.stepsMR : [];
  if (steps.length > 0) {
    if (hi.length !== steps.length || mr.length !== steps.length) return true;
    for (let i = 0; i < steps.length; i++) {
      if (!String(hi[i] ?? '').trim() || !String(mr[i] ?? '').trim()) return true;
    }
  }
  if (!String(r.recipeNameHI ?? '').trim() || !String(r.recipeNameMR ?? '').trim()) {
    return true;
  }
  const descEn = String(r.description ?? '').trim();
  if (descEn) {
    if (!String(r.descriptionHI ?? '').trim() || !String(r.descriptionMR ?? '').trim()) {
      return true;
    }
  }
  const ings = normalizeIngredientsList(r.ingredients);
  for (const ing of ings) {
    if (!String(ing.ingredient ?? '').trim()) continue;
    if (!String(ing.ingredientHI ?? '').trim() || !String(ing.ingredientMR ?? '').trim()) {
      return true;
    }
    const q = String(ing.quantity ?? '').trim();
    if (q) {
      if (!String(ing.quantityHI ?? '').trim() || !String(ing.quantityMR ?? '').trim()) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Merge AI-enriched *HI / *MR / arrays into the original recipe (preserve English & numbers).
 * @param {Record<string, unknown>} original
 * @param {Record<string, unknown>} enriched
 */
export function mergeEnrichedRecipe(original, enriched) {
  if (!original || typeof original !== 'object') return original;
  if (!enriched || typeof enriched !== 'object') return original;
  const o = { ...original };
  const pick = (key) => {
    const v = enriched[key];
    if (v != null && String(v).trim() !== '') o[key] = v;
  };
  [
    'recipeNameHI',
    'recipeNameMR',
    'descriptionHI',
    'descriptionMR',
  ].forEach(pick);

  const steps = Array.isArray(original.steps) ? original.steps : [];
  if (steps.length > 0) {
    const hi = Array.isArray(enriched.stepsHI) ? enriched.stepsHI : [];
    const mr = Array.isArray(enriched.stepsMR) ? enriched.stepsMR : [];
    if (hi.length === steps.length) o.stepsHI = hi;
    if (mr.length === steps.length) o.stepsMR = mr;
  }

  const origIngs = normalizeIngredientsList(original.ingredients);
  const newIngs = Array.isArray(enriched.ingredients) ? enriched.ingredients : [];
  if (origIngs.length > 0 && newIngs.length === origIngs.length) {
    o.ingredients = origIngs.map((ing, i) => ({
      ...ing,
      ...(typeof newIngs[i] === 'object' && newIngs[i] ? newIngs[i] : {}),
    }));
  }
  return o;
}

/**
 * Prefer full translated steps when arrays align and every line is non-empty; else per-index fallback.
 * @param {unknown[]} stepsEn
 * @param {unknown[]} stepsTranslated
 */
export function mergeTranslatedSteps(stepsEn, stepsTranslated) {
  const en = Array.isArray(stepsEn) ? stepsEn : [];
  const tr = Array.isArray(stepsTranslated) ? stepsTranslated : [];
  if (en.length === 0) return tr.length ? tr.map((t) => String(t ?? '')) : [];

  const allTrPresent =
    tr.length === en.length &&
    tr.every((t) => String(t ?? '').trim() !== '');

  if (allTrPresent) {
    return tr.map((t) => String(t ?? '').trim());
  }

  return en.map((s, i) => {
    const t = tr[i];
    if (t != null && String(t).trim() !== '') return String(t).trim();
    return typeof s === 'string' ? s : String(s ?? '');
  });
}
