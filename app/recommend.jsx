import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { getProfile, calculateTDEE, getTodayCalories } from '../store/userStore';

const ANTHROPIC_API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;

export default function RecommendScreen() {
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState(null);
  const [profile, setProfile] = useState(null);
  const [remainingCal, setRemainingCal] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(0);
  const [caloriesEaten, setCaloriesEaten] = useState(0);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    const p = await getProfile();
    setProfile(p);
    if (p) {
      const goal = calculateTDEE(p);
      setDailyGoal(goal);
      const eaten = await getTodayCalories();
      setCaloriesEaten(eaten);
      setRemainingCal(goal - eaten);
    }
  };

  const getRecommendations = async () => {
    if (!profile) return;
    setLoading(true);
    setRecommendations(null);

    try {
      const goalLabels = {
        lose_fast: 'lose weight fast (aggressive deficit)',
        lose: 'lose weight (moderate deficit)',
        maintain: 'maintain current weight',
        gain_muscle: 'gain muscle (lean bulk)',
        gain: 'gain weight',
        gain_fast: 'gain weight fast (aggressive bulk)',
      };

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 2048,
          messages: [
            {
              role: 'user',
              content: `You are a nutrition and fitness expert. Give personalized recommendations for this person:

Profile:
- Age: ${profile.age}, Gender: ${profile.gender}
- Weight: ${profile.weight}kg, Height: ${profile.height}cm
- Activity level: ${profile.activityLevel}
- Goal: ${goalLabels[profile.goal] || profile.goal}
- Daily calorie goal: ${dailyGoal} kcal
- Calories eaten today: ${caloriesEaten} kcal
- Remaining calories today: ${remainingCal} kcal

Return ONLY a JSON object:
{
  "status": "one sentence about how they are doing today",
  "meal_recommendations": [
    {
      "meal_type": "Breakfast/Lunch/Dinner/Snack",
      "name": "meal name",
      "description": "brief description",
      "calories": number,
      "protein": number,
      "carbs": number,
      "fat": number,
      "why": "why this fits their goal"
    }
  ],
  "activity_recommendations": [
    {
      "activity": "activity name",
      "type": "Cardio/Strength/Flexibility/Sports",
      "duration": "e.g. 45 minutes",
      "calories_burned": number,
      "intensity": "Low/Medium/High",
      "description": "brief description of the activity",
      "why": "why this fits their goal"
    }
  ],
  "tip": "one personalized daily tip for their goal"
}

Give 4 meal recommendations and 4 activity recommendations. Consider Indonesian food options for meals. Make recommendations practical and achievable.`,
            },
          ],
        }),
      });

      const data = await response.json();
      if (!data.content || data.content.length === 0) {
        throw new Error(data.error?.message || 'No response from AI');
      }

      const text = data.content[0].text;
      const cleaned = text.replace(/```json|```/g, '').trim();
      const start = cleaned.indexOf('{');
      const end = cleaned.lastIndexOf('}');
      const parsed = JSON.parse(cleaned.substring(start, end + 1));
      setRecommendations(parsed);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const activityColors = {
    Cardio: '#FF6B6B',
    Strength: '#64B5F6',
    Flexibility: '#81C784',
    Sports: '#FFB74D',
  };

  const intensityColors = {
    Low: '#81C784',
    Medium: '#FFB74D',
    High: '#FF6B6B',
  };

  if (!profile) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="person-circle-outline" size={60} color="#333" />
        <Text style={styles.emptyText}>Set up your profile first</Text>
        <Text style={styles.emptySubtext}>Go to Profile tab to enter your details</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Today's Progress</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{caloriesEaten}</Text>
            <Text style={styles.summaryLabel}>Eaten</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{dailyGoal}</Text>
            <Text style={styles.summaryLabel}>Goal</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: remainingCal < 0 ? '#FF5252' : '#4CAF50' }]}>
              {Math.abs(remainingCal)}
            </Text>
            <Text style={styles.summaryLabel}>{remainingCal < 0 ? 'Over' : 'Left'}</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.generateButton}
        onPress={getRecommendations}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Ionicons name="bulb" size={20} color="#fff" />
        )}
        <Text style={styles.generateButtonText}>
          {loading ? 'Getting recommendations...' : 'Get AI Recommendations'}
        </Text>
      </TouchableOpacity>

      {recommendations?.status && (
        <View style={styles.statusCard}>
          <Ionicons name="information-circle" size={18} color="#4CAF50" />
          <Text style={styles.statusText}>{recommendations.status}</Text>
        </View>
      )}

      {recommendations?.meal_recommendations && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Meal Recommendations</Text>
          {recommendations.meal_recommendations.map((meal, i) => (
            <View key={i} style={styles.mealCard}>
              <View style={styles.mealHeader}>
                <View style={styles.mealTypeBadge}>
                  <Text style={styles.mealTypeText}>{meal.meal_type}</Text>
                </View>
                <Text style={styles.mealCalories}>{meal.calories} kcal</Text>
              </View>
              <Text style={styles.mealName}>{meal.name}</Text>
              <Text style={styles.mealDesc}>{meal.description}</Text>
              <View style={styles.macroRow}>
                <Text style={styles.macroText}>P: {meal.protein}g</Text>
                <Text style={styles.macroText}>C: {meal.carbs}g</Text>
                <Text style={styles.macroText}>F: {meal.fat}g</Text>
              </View>
              <View style={styles.whyRow}>
                <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
                <Text style={styles.whyText}>{meal.why}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {recommendations?.activity_recommendations && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activity Recommendations</Text>
          {recommendations.activity_recommendations.map((activity, i) => (
            <View key={i} style={styles.activityCard}>
              <View style={styles.activityHeader}>
                <View style={[styles.activityTypeBadge, { backgroundColor: (activityColors[activity.type] || '#888') + '25' }]}>
                  <Text style={[styles.activityTypeText, { color: activityColors[activity.type] || '#888' }]}>
                    {activity.type}
                  </Text>
                </View>
                <View style={[styles.intensityBadge, { backgroundColor: (intensityColors[activity.intensity] || '#888') + '25' }]}>
                  <Text style={[styles.intensityText, { color: intensityColors[activity.intensity] || '#888' }]}>
                    {activity.intensity}
                  </Text>
                </View>
              </View>
              <Text style={styles.activityName}>{activity.activity}</Text>
              <Text style={styles.activityDesc}>{activity.description}</Text>
              <View style={styles.activityStats}>
                <View style={styles.activityStat}>
                  <Ionicons name="time-outline" size={14} color="#888" />
                  <Text style={styles.activityStatText}>{activity.duration}</Text>
                </View>
                <View style={styles.activityStat}>
                  <Ionicons name="flame-outline" size={14} color="#FF6B6B" />
                  <Text style={styles.activityStatText}>~{activity.calories_burned} kcal burned</Text>
                </View>
              </View>
              <View style={styles.whyRow}>
                <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
                <Text style={styles.whyText}>{activity.why}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {recommendations?.tip && (
        <View style={styles.tipCard}>
          <Ionicons name="bulb" size={20} color="#FFB74D" />
          <Text style={styles.tipText}>{recommendations.tip}</Text>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  content: { padding: 16 },
  emptyContainer: {
    flex: 1, backgroundColor: '#121212',
    alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  emptyText: { color: '#555', fontSize: 18, fontWeight: '600' },
  emptySubtext: { color: '#444', fontSize: 14 },
  summaryCard: {
    backgroundColor: '#1e1e1e', borderRadius: 16, padding: 16, marginBottom: 16,
  },
  summaryTitle: { color: '#888', fontSize: 13, marginBottom: 12 },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  summaryLabel: { color: '#666', fontSize: 12, marginTop: 2 },
  summaryDivider: { width: 1, height: 40, backgroundColor: '#2a2a2a' },
  generateButton: {
    backgroundColor: '#4CAF50', borderRadius: 14, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginBottom: 16,
  },
  generateButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  statusCard: {
    backgroundColor: '#0a2a0a', borderRadius: 12, padding: 12,
    flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 16,
  },
  statusText: { color: '#81C784', fontSize: 14, flex: 1 },
  section: { marginBottom: 24 },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  mealCard: { backgroundColor: '#1e1e1e', borderRadius: 16, padding: 16, marginBottom: 10 },
  mealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  mealTypeBadge: { backgroundColor: '#4CAF5025', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  mealTypeText: { color: '#4CAF50', fontSize: 12, fontWeight: '600' },
  mealCalories: { color: '#4CAF50', fontSize: 16, fontWeight: 'bold' },
  mealName: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  mealDesc: { color: '#888', fontSize: 13, marginBottom: 8 },
  macroRow: { flexDirection: 'row', gap: 16, marginBottom: 8 },
  macroText: { color: '#666', fontSize: 12 },
  whyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  whyText: { color: '#666', fontSize: 12, flex: 1 },
  activityCard: { backgroundColor: '#1e1e1e', borderRadius: 16, padding: 16, marginBottom: 10 },
  activityHeader: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  activityTypeBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  activityTypeText: { fontSize: 12, fontWeight: '600' },
  intensityBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  intensityText: { fontSize: 12, fontWeight: '600' },
  activityName: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  activityDesc: { color: '#888', fontSize: 13, marginBottom: 8 },
  activityStats: { flexDirection: 'row', gap: 16, marginBottom: 8 },
  activityStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  activityStatText: { color: '#888', fontSize: 12 },
  tipCard: {
    backgroundColor: '#2a1f00', borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    borderWidth: 1, borderColor: '#FFB74D30',
  },
  tipText: { color: '#FFB74D', fontSize: 14, flex: 1, lineHeight: 20 },
});
