import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  PROFILE: 'user_profile',
  MEALS: 'user_meals',
};

// Calculate BMR using Mifflin-St Jeor formula
export function calculateBMR(profile) {
  const { weight, height, age, gender } = profile;
  if (gender === 'male') {
    return 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    return 10 * weight + 6.25 * height - 5 * age - 161;
  }
}

// Calculate TDEE based on activity level and goal
export function calculateTDEE(profile) {
  const bmr = calculateBMR(profile);
  const multipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
  };
  const tdee = bmr * (multipliers[profile.activityLevel] || 1.2);

  const adjustments = {
    lose_fast: -750,
    lose: -500,
    maintain: 0,
    gain_muscle: 300,
    gain: 500,
    gain_fast: 750,
  };

  const adjustment = adjustments[profile.goal] || 0;
  return Math.round(tdee + adjustment);
}

// Calculate daily macro targets in grams based on goal
export function calculateMacroTargets(profile) {
  const totalCalories = calculateTDEE(profile);

  // Macro split percentages per goal
  const splits = {
    lose_fast:   { protein: 0.40, carbs: 0.30, fat: 0.30 },
    lose:        { protein: 0.35, carbs: 0.35, fat: 0.30 },
    maintain:    { protein: 0.30, carbs: 0.40, fat: 0.30 },
    gain_muscle: { protein: 0.35, carbs: 0.45, fat: 0.20 },
    gain:        { protein: 0.30, carbs: 0.50, fat: 0.20 },
    gain_fast:   { protein: 0.30, carbs: 0.50, fat: 0.20 },
  };

  const split = splits[profile.goal] || splits.maintain;

  // Protein & carbs = 4 kcal/g, Fat = 9 kcal/g
  return {
    protein: Math.round((totalCalories * split.protein) / 4),
    carbs: Math.round((totalCalories * split.carbs) / 4),
    fat: Math.round((totalCalories * split.fat) / 9),
  };
}

// Profile
export async function saveProfile(profile) {
  await AsyncStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));
}

export async function getProfile() {
  const data = await AsyncStorage.getItem(KEYS.PROFILE);
  return data ? JSON.parse(data) : null;
}

// Meals
export async function saveMeal(meal) {
  const today = new Date().toISOString().split('T')[0];
  const allMeals = await getAllMeals();
  if (!allMeals[today]) allMeals[today] = [];
  allMeals[today].unshift({
    ...meal,
    id: Date.now().toString(),
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  });
  await AsyncStorage.setItem(KEYS.MEALS, JSON.stringify(allMeals));
}

export async function getTodayMeals() {
  const today = new Date().toISOString().split('T')[0];
  const allMeals = await getAllMeals();
  return allMeals[today] || [];
}

export async function getAllMeals() {
  const data = await AsyncStorage.getItem(KEYS.MEALS);
  return data ? JSON.parse(data) : {};
}

export async function deleteMeal(mealId) {
  const today = new Date().toISOString().split('T')[0];
  const allMeals = await getAllMeals();
  if (allMeals[today]) {
    allMeals[today] = allMeals[today].filter(m => m.id !== mealId);
    await AsyncStorage.setItem(KEYS.MEALS, JSON.stringify(allMeals));
  }
}

export async function getTodayCalories() {
  const meals = await getTodayMeals();
  return meals.reduce((sum, meal) => sum + (meal.calories || 0), 0);
}
