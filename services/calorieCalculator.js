export const calculateNutrition = ({
  weight,
  height,
  age,
  gender,
  goal,
  activity = 1.55, // moderate activity
}) => {
  const weightKg = parseFloat(weight);
  const ageYears = parseInt(age);

  // convert feet input like 5.10 -> 5 ft 10 in
  const heightParts = String(height).split(".");
  const feet = parseInt(heightParts[0] || 0);
  const inches = parseInt(heightParts[1] || 0);

  const heightCm = feet * 30.48 + inches * 2.54;

  let bmr = 0;

  if (gender === "male") {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * ageYears + 5;
  } else {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * ageYears - 161;
  }

  let calories = bmr * activity;

  if (goal === "lose") {
    calories -= 500;
  } else if (goal === "gain") {
    calories += 300;
  } else if (goal === "muscle") {
    calories += 200;
  }

  let proteins = 0;

  if (goal === "lose") {
    proteins = weightKg * 1.8;
  } else if (goal === "gain") {
    proteins = weightKg * 1.6;
  } else if (goal === "muscle") {
    proteins = weightKg * 2.0;
  } else {
    proteins = weightKg * 1.5;
  }

  return {
    calories: Math.round(calories),
    proteins: Math.round(proteins),
  };
};
