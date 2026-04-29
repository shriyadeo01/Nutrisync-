/**
 * True when the user has finished the main preference flow (body + goal + targets).
 * Dietary preferences are intentionally excluded — they appear on Profile only after this is true.
 */
export function isProfileComplete(user) {
  if (!user?._id) return false;
  const parts = [
    user.weight,
    user.height,
    user.age,
    user.gender,
    user.goal,
    user.calories,
  ];
  return parts.every((v) => String(v ?? '').trim().length > 0);
}
