import React, { useEffect, useState } from 'react';
import { Image } from 'expo-image';
import {
  GenerateRecipeImage,
  PEXELS_FALLBACK_IMAGE,
  isPlaceholderRecipeImage,
} from '../services/AiModel';

function dishName(recipeName, jsonData) {
  const jd = jsonData || {};
  const n = recipeName ?? jd.recipeName;
  return String(n ?? 'meal').trim() || 'meal';
}

/**
 * Shows the stored recipe image when it is a real photo URL; otherwise loads one from Pexels
 * using the dish name (AsyncStorage-cached so it stays stable).
 */
export default function RecipeThumbnail({
  recipeName,
  imageUrl: topImageUrl,
  jsonData,
  style,
  contentFit = 'cover',
}) {
  const jd = jsonData || {};
  const name = dishName(recipeName, jd);
  const stored = String(topImageUrl ?? jd.imageUrl ?? '').trim();

  const storedIsGood =
    stored &&
    (stored.startsWith('http') || stored.startsWith('data:')) &&
    !isPlaceholderRecipeImage(stored);

  const [uri, setUri] = useState(() =>
    storedIsGood ? stored : PEXELS_FALLBACK_IMAGE
  );

  useEffect(() => {
    const good =
      stored &&
      (stored.startsWith('http') || stored.startsWith('data:')) &&
      !isPlaceholderRecipeImage(stored);
    if (good) {
      setUri(stored);
      return;
    }
    let cancelled = false;
    const desc = String(jd.description || '').slice(0, 300);
    GenerateRecipeImage(name, desc).then((u) => {
      if (!cancelled) {
        setUri(String(u || '').trim() || PEXELS_FALLBACK_IMAGE);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [name, stored, jd.description]);

  return (
    <Image
      source={{ uri }}
      style={style}
      contentFit={contentFit}
      transition={300}
    />
  );
}
