const GOAL_COPY = {
  lose: {
    title: 'Weight loss',
    workoutType: 'Fat burn + light strength',
    workoutMinutes: 45,
    walkingSteps: 10000,
    walkingMinutes: 50,
    macroSplit: { protein: 0.35, carbs: 0.3, fats: 0.35 },
  },
  gain: {
    title: 'Healthy weight gain',
    workoutType: 'Strength training + mobility',
    workoutMinutes: 50,
    walkingSteps: 7000,
    walkingMinutes: 35,
    macroSplit: { protein: 0.25, carbs: 0.5, fats: 0.25 },
  },
  muscle: {
    title: 'Muscle building',
    workoutType: 'Progressive strength + HIIT',
    workoutMinutes: 60,
    walkingSteps: 8000,
    walkingMinutes: 40,
    macroSplit: { protein: 0.35, carbs: 0.4, fats: 0.25 },
  },
  default: {
    title: 'Balanced fitness',
    workoutType: 'Mixed cardio + strength',
    workoutMinutes: 40,
    walkingSteps: 8000,
    walkingMinutes: 40,
    macroSplit: { protein: 0.3, carbs: 0.4, fats: 0.3 },
  },
};

const WORKOUT_NAME_BY_GOAL = {
  lose: {
    gym: ['Incline treadmill walk', 'Rower intervals', 'Leg press + lunges', 'Cable core circuit'],
    home: ['Brisk walking', 'Bodyweight HIIT circuit', 'Squat + lunge combo', 'Plank + mountain climbers'],
  },
  gain: {
    gym: ['Barbell squat', 'Bench press', 'Lat pulldown + rows', 'Seated shoulder press'],
    home: ['Backpack goblet squat', 'Push-up progression', 'Resistance band rows', 'Glute bridge + calf raises'],
  },
  muscle: {
    gym: ['Deadlift day', 'Bench + incline dumbbell press', 'Pull-up or assisted pull-up', 'Leg day split'],
    home: ['Resistance band push-pull', 'Single-leg squat progression', 'Pike push-ups', 'Core strength circuit'],
  },
  default: {
    gym: ['Treadmill warmup + circuit', 'Machine full-body workout'],
    home: ['Walk + mobility flow', 'Bodyweight full-body routine'],
  },
};

const safeNum = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export const getDietPlanFromUser = (user) => {
  const key = String(user?.goal || '').toLowerCase();
  const goalPlan = GOAL_COPY[key] || GOAL_COPY.default;
  const calories = safeNum(user?.calories, 2000);
  const workoutPreference = String(user?.workoutPreference || 'both').toLowerCase();
  const workoutNames = WORKOUT_NAME_BY_GOAL[key] || WORKOUT_NAME_BY_GOAL.default;

  const proteinTarget = Math.round((calories * goalPlan.macroSplit.protein) / 4);
  const carbTarget = Math.round((calories * goalPlan.macroSplit.carbs) / 4);
  const fatTarget = Math.round((calories * goalPlan.macroSplit.fats) / 9);

  return {
    goalKey: key || 'default',
    goalTitle: goalPlan.title,
    calories,
    proteinTarget,
    carbTarget,
    fatTarget,
    workoutType: goalPlan.workoutType,
    workoutPreference,
    gymWorkouts: workoutNames.gym,
    homeWorkouts: workoutNames.home,
    workoutMinutes: goalPlan.workoutMinutes,
    walkingSteps: goalPlan.walkingSteps,
    walkingMinutes: goalPlan.walkingMinutes,
  };
};

export const getMealPlanFitLabel = (result, user) => {
  const goal = String(user?.goal || '').toLowerCase();
  const calories = Number(result?.calories || 0);
  const protein = Number(result?.protein_g || 0);
  const fat = Number(result?.fat_g || 0);
  const sugar = Number(result?.sugar_g || 0);
  const score = Number(result?.score || 0);

  if (goal === 'lose') {
    if (calories <= 550 && sugar <= 18 && score >= 60) return 'Good for your weight-loss plan';
    if (calories <= 700 && score >= 45) return 'Okay occasionally for weight loss';
    return 'Not ideal for your weight-loss target';
  }
  if (goal === 'muscle') {
    if (protein >= 25 && calories >= 350 && fat <= 35) return 'Good for your muscle-building plan';
    if (protein >= 18) return 'Decent option, add more protein';
    return 'Low protein for muscle-building goals';
  }
  if (goal === 'gain') {
    if (calories >= 500 && protein >= 18) return 'Good for healthy weight gain';
    if (calories >= 380) return 'Okay, but increase calories a bit';
    return 'Too light for weight-gain goals';
  }

  if (score >= 65) return 'Good fit for your current plan';
  if (score >= 45) return 'Moderate fit for your current plan';
  return 'Not an ideal fit for your current plan';
};
