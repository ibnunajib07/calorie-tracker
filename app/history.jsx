import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getAllMeals, getProfile, calculateTDEE } from '../store/userStore';

export default function HistoryScreen() {
  const [mealsByDay, setMealsByDay] = useState([]);
  const [dailyGoal, setDailyGoal] = useState(2000);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [])
  );

  const loadHistory = async () => {
    const p = await getProfile();
    if (p) setDailyGoal(calculateTDEE(p));

    const all = await getAllMeals();
    const sorted = Object.entries(all)
      .sort(([a], [b]) => new Date(b) - new Date(a))
      .map(([date, meals]) => ({
        date,
        meals,
        totalCalories: meals.reduce((s, m) => s + (m.calories || 0), 0),
        totalProtein: meals.reduce((s, m) => s + (m.protein || 0), 0),
        totalCarbs: meals.reduce((s, m) => s + (m.carbs || 0), 0),
        totalFat: meals.reduce((s, m) => s + (m.fat || 0), 0),
      }));
    setMealsByDay(sorted);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (dateStr === today) return 'Today';
    if (dateStr === yesterday) return 'Yesterday';
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  };

  const getStatusColor = (calories) => {
    const ratio = calories / dailyGoal;
    if (ratio > 1.1) return '#FF5252';
    if (ratio > 0.9) return '#4CAF50';
    return '#FFC107';
  };

  if (mealsByDay.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="time-outline" size={60} color="#333" />
        <Text style={styles.emptyText}>No meal history yet</Text>
        <Text style={styles.emptySubtext}>Start logging meals to see your history</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {mealsByDay.map(({ date, meals, totalCalories, totalProtein, totalCarbs, totalFat }) => (
        <View key={date} style={styles.dayCard}>
          {/* Day Header */}
          <View style={styles.dayHeader}>
            <Text style={styles.dayTitle}>{formatDate(date)}</Text>
            <View style={[styles.calorieBadge, { backgroundColor: `${getStatusColor(totalCalories)}20` }]}>
              <Text style={[styles.calorieTotal, { color: getStatusColor(totalCalories) }]}>
                {totalCalories} kcal
              </Text>
            </View>
          </View>

          {/* Day Macros */}
          <View style={styles.macroRow}>
            <Text style={styles.macroText}>P: {totalProtein}g</Text>
            <Text style={styles.macroText}>C: {totalCarbs}g</Text>
            <Text style={styles.macroText}>F: {totalFat}g</Text>
            <Text style={styles.macroText}>{meals.length} meals</Text>
          </View>

          {/* Progress bar */}
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, {
              width: `${Math.min((totalCalories / dailyGoal) * 100, 100)}%`,
              backgroundColor: getStatusColor(totalCalories),
            }]} />
          </View>

          {/* Meals list */}
          {meals.map((meal) => (
            <View key={meal.id} style={styles.mealRow}>
              <View style={styles.mealLeft}>
                <Text style={styles.mealName}>{meal.foodName}</Text>
                <Text style={styles.mealTime}>{meal.time} · {meal.portion}</Text>
              </View>
              <Text style={styles.mealCalories}>{meal.calories} kcal</Text>
            </View>
          ))}
        </View>
      ))}
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', padding: 16 },
  emptyContainer: {
    flex: 1, backgroundColor: '#121212',
    alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  emptyText: { color: '#555', fontSize: 18, fontWeight: '600' },
  emptySubtext: { color: '#444', fontSize: 14 },
  dayCard: {
    backgroundColor: '#1e1e1e', borderRadius: 16,
    padding: 16, marginBottom: 12,
  },
  dayHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  dayTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  calorieBadge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  calorieTotal: { fontSize: 14, fontWeight: '700' },
  macroRow: { flexDirection: 'row', gap: 16, marginBottom: 10 },
  macroText: { color: '#666', fontSize: 12 },
  progressBar: {
    height: 4, backgroundColor: '#2a2a2a',
    borderRadius: 2, marginBottom: 12, overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 2 },
  mealRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 8,
    borderTopWidth: 1, borderTopColor: '#2a2a2a',
  },
  mealLeft: { flex: 1 },
  mealName: { color: '#ccc', fontSize: 14 },
  mealTime: { color: '#555', fontSize: 12, marginTop: 2 },
  mealCalories: { color: '#4CAF50', fontSize: 14, fontWeight: '600' },
});
