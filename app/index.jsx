import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, RefreshControl
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getTodayMeals, getTodayCalories, getProfile, calculateTDEE, calculateMacroTargets, deleteMeal } from '../store/userStore';

export default function HomeScreen() {
  const router = useRouter();
  const [meals, setMeals] = useState([]);
  const [caloriesEaten, setCaloriesEaten] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(2000);
  const [macroTargets, setMacroTargets] = useState({ protein: 150, carbs: 200, fat: 67 });
  const [profile, setProfile] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    const p = await getProfile();
    setProfile(p);
    if (p) {
      setDailyGoal(calculateTDEE(p));
      setMacroTargets(calculateMacroTargets(p));
    }
    const todayMeals = await getTodayMeals();
    setMeals(todayMeals);
    const cal = await getTodayCalories();
    setCaloriesEaten(cal);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleDelete = (mealId) => {
    Alert.alert('Delete Meal', 'Remove this meal from today?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await deleteMeal(mealId);
          await loadData();
        }
      }
    ]);
  };

  const remaining = dailyGoal - caloriesEaten;
  const progress = Math.min(caloriesEaten / dailyGoal, 1);
  const progressColor = progress > 1 ? '#FF5252' : progress > 0.85 ? '#FFC107' : '#4CAF50';

  const totalProtein = meals.reduce((s, m) => s + (m.protein || 0), 0);
  const totalCarbs = meals.reduce((s, m) => s + (m.carbs || 0), 0);
  const totalFat = meals.reduce((s, m) => s + (m.fat || 0), 0);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric'
  });

  const MacroBar = ({ eaten, target, color }) => {
    const ratio = Math.min(eaten / target, 1);
    const over = eaten > target;
    return (
      <View style={styles.macroBarContainer}>
        <View style={styles.macroBarBg}>
          <View style={[styles.macroBarFill, {
            width: `${ratio * 100}%`,
            backgroundColor: over ? '#FF5252' : color,
          }]} />
        </View>
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4CAF50" />}
    >
      {/* Date */}
      <Text style={styles.date}>{today}</Text>

      {/* Calorie Ring */}
      <View style={styles.ringContainer}>
        <View style={styles.ring}>
          <View style={[styles.ringFill, { borderColor: progressColor }]} />
          <View style={styles.ringCenter}>
            <Text style={styles.caloriesEaten}>{caloriesEaten}</Text>
            <Text style={styles.caloriesLabel}>kcal eaten</Text>
            <View style={styles.divider} />
            <Text style={[styles.remaining, { color: remaining < 0 ? '#FF5252' : '#4CAF50' }]}>
              {remaining < 0 ? `${Math.abs(remaining)} over` : `${remaining} left`}
            </Text>
          </View>
        </View>
        <Text style={styles.goalText}>Daily goal: {dailyGoal} kcal</Text>
      </View>

      {/* Macro Summary with targets and progress */}
      <View style={styles.macroRow}>
        {/* Protein */}
        <View style={styles.macroCard}>
          <Ionicons name="flame" size={18} color="#FF6B6B" />
          <Text style={styles.macroValue}>{totalProtein}g</Text>
          <Text style={styles.macroTarget}>/ {macroTargets.protein}g</Text>
          <MacroBar eaten={totalProtein} target={macroTargets.protein} color="#FF6B6B" />
          <Text style={styles.macroLabel}>Protein</Text>
        </View>

        {/* Carbs */}
        <View style={styles.macroCard}>
          <Ionicons name="leaf" size={18} color="#4CAF50" />
          <Text style={styles.macroValue}>{totalCarbs}g</Text>
          <Text style={styles.macroTarget}>/ {macroTargets.carbs}g</Text>
          <MacroBar eaten={totalCarbs} target={macroTargets.carbs} color="#4CAF50" />
          <Text style={styles.macroLabel}>Carbs</Text>
        </View>

        {/* Fat */}
        <View style={styles.macroCard}>
          <Ionicons name="water" size={18} color="#64B5F6" />
          <Text style={styles.macroValue}>{totalFat}g</Text>
          <Text style={styles.macroTarget}>/ {macroTargets.fat}g</Text>
          <MacroBar eaten={totalFat} target={macroTargets.fat} color="#64B5F6" />
          <Text style={styles.macroLabel}>Fat</Text>
        </View>
      </View>

      {/* Meals */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Meals</Text>
          <TouchableOpacity onPress={() => router.push('/camera')}>
            <Ionicons name="add-circle" size={28} color="#4CAF50" />
          </TouchableOpacity>
        </View>

        {meals.length === 0 ? (
          <TouchableOpacity style={styles.emptyCard} onPress={() => router.push('/camera')}>
            <Ionicons name="camera-outline" size={40} color="#555" />
            <Text style={styles.emptyText}>No meals logged yet</Text>
            <Text style={styles.emptySubtext}>Tap to take a photo of your food</Text>
          </TouchableOpacity>
        ) : (
          meals.map((meal) => (
            <View key={meal.id} style={styles.mealCard}>
              <View style={styles.mealLeft}>
                <Text style={styles.mealName}>{meal.foodName}</Text>
                <Text style={styles.mealTime}>{meal.time} · {meal.portion}</Text>
                <View style={styles.mealMacros}>
                  <Text style={styles.mealMacroText}>P: {meal.protein || 0}g</Text>
                  <Text style={styles.mealMacroText}>C: {meal.carbs || 0}g</Text>
                  <Text style={styles.mealMacroText}>F: {meal.fat || 0}g</Text>
                </View>
              </View>
              <View style={styles.mealRight}>
                <Text style={styles.mealCalories}>{meal.calories}</Text>
                <Text style={styles.mealKcal}>kcal</Text>
                <TouchableOpacity onPress={() => handleDelete(meal.id)}>
                  <Ionicons name="trash-outline" size={18} color="#FF5252" style={{ marginTop: 8 }} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Setup prompt if no profile */}
      {!profile && (
        <TouchableOpacity style={styles.setupBanner} onPress={() => router.push('/profile')}>
          <Ionicons name="alert-circle" size={20} color="#FFC107" />
          <Text style={styles.setupText}>Set up your profile to get your calorie and macro goals!</Text>
        </TouchableOpacity>
      )}

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  date: { color: '#888', fontSize: 14, textAlign: 'center', marginTop: 16 },
  ringContainer: { alignItems: 'center', marginVertical: 24 },
  ring: {
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: '#1e1e1e', alignItems: 'center',
    justifyContent: 'center', position: 'relative',
  },
  ringFill: {
    position: 'absolute', width: 200, height: 200,
    borderRadius: 100, borderWidth: 12,
  },
  ringCenter: { alignItems: 'center' },
  caloriesEaten: { color: '#fff', fontSize: 42, fontWeight: 'bold' },
  caloriesLabel: { color: '#888', fontSize: 13 },
  divider: { width: 40, height: 1, backgroundColor: '#333', marginVertical: 8 },
  remaining: { fontSize: 16, fontWeight: '600' },
  goalText: { color: '#666', fontSize: 13, marginTop: 12 },
  macroRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 12, marginBottom: 24 },
  macroCard: {
    flex: 1, backgroundColor: '#1e1e1e', borderRadius: 12,
    padding: 12, alignItems: 'center', gap: 2,
  },
  macroValue: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  macroTarget: { color: '#555', fontSize: 11 },
  macroBarContainer: { width: '100%', marginVertical: 4 },
  macroBarBg: {
    width: '100%', height: 4, backgroundColor: '#2a2a2a',
    borderRadius: 2, overflow: 'hidden',
  },
  macroBarFill: { height: '100%', borderRadius: 2 },
  macroLabel: { color: '#888', fontSize: 11 },
  section: { paddingHorizontal: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  emptyCard: {
    backgroundColor: '#1e1e1e', borderRadius: 16, padding: 32,
    alignItems: 'center', gap: 8,
  },
  emptyText: { color: '#555', fontSize: 16 },
  emptySubtext: { color: '#444', fontSize: 13 },
  mealCard: {
    backgroundColor: '#1e1e1e', borderRadius: 16, padding: 16,
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 10,
  },
  mealLeft: { flex: 1 },
  mealName: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 4 },
  mealTime: { color: '#888', fontSize: 12, marginBottom: 6 },
  mealMacros: { flexDirection: 'row', gap: 10 },
  mealMacroText: { color: '#666', fontSize: 12 },
  mealRight: { alignItems: 'flex-end' },
  mealCalories: { color: '#4CAF50', fontSize: 24, fontWeight: 'bold' },
  mealKcal: { color: '#666', fontSize: 12 },
  setupBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#2a2000', borderRadius: 12, padding: 16,
    marginHorizontal: 16, marginTop: 16,
  },
  setupText: { color: '#FFC107', fontSize: 13, flex: 1 },
});
