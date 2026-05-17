import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getProfile, saveProfile, calculateTDEE } from '../store/userStore';

const ACTIVITY_LEVELS = [
  { key: 'sedentary', label: 'Sedentary', desc: 'Little or no exercise', icon: 'bed' },
  { key: 'light', label: 'Light', desc: '1-3 days/week', icon: 'walk' },
  { key: 'moderate', label: 'Moderate', desc: '3-5 days/week', icon: 'bicycle' },
  { key: 'active', label: 'Active', desc: '6-7 days/week', icon: 'barbell' },
];

const GOALS = [
  { key: 'lose_fast', label: 'Lose Fast', desc: '−750 kcal/day', icon: 'trending-down', color: '#FF5252' },
  { key: 'lose', label: 'Lose Weight', desc: '−500 kcal/day', icon: 'arrow-down', color: '#FF8A65' },
  { key: 'maintain', label: 'Maintain', desc: 'No change', icon: 'remove', color: '#4CAF50' },
  { key: 'gain_muscle', label: 'Gain Muscle', desc: '+300 kcal/day', icon: 'barbell', color: '#64B5F6' },
  { key: 'gain', label: 'Gain Weight', desc: '+500 kcal/day', icon: 'arrow-up', color: '#4FC3F7' },
  { key: 'gain_fast', label: 'Gain Fast', desc: '+750 kcal/day', icon: 'trending-up', color: '#AB47BC' },
];

export default function ProfileScreen() {
  const [profile, setProfile] = useState({
    name: '',
    age: '',
    gender: 'male',
    weight: '',
    height: '',
    activityLevel: 'moderate',
    goal: 'maintain',
  });
  const [saved, setSaved] = useState(false);
  const [tdee, setTdee] = useState(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const p = await getProfile();
    if (p) {
      setProfile(p);
      setTdee(calculateTDEE(p));
      setSaved(true);
    }
  };

  const handleSave = async () => {
    if (!profile.age || !profile.weight || !profile.height) {
      Alert.alert('Missing info', 'Please fill in your age, weight, and height.');
      return;
    }
    const p = {
      ...profile,
      age: parseInt(profile.age),
      weight: parseFloat(profile.weight),
      height: parseFloat(profile.height),
    };
    await saveProfile(p);
    setTdee(calculateTDEE(p));
    setSaved(true);
    Alert.alert('Saved!', 'Your profile has been updated.');
  };

  const selectedGoal = GOALS.find(g => g.key === profile.goal);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* TDEE Result */}
      {tdee && (
        <View style={[styles.tdeeCard, { borderColor: selectedGoal?.color + '50' }]}>
          <Text style={styles.tdeeLabel}>Your Daily Calorie Goal</Text>
          <Text style={[styles.tdeeValue, { color: selectedGoal?.color || '#4CAF50' }]}>{tdee} kcal</Text>
          <Text style={styles.tdeeSubtext}>{selectedGoal?.desc} from your TDEE</Text>
        </View>
      )}

      {/* Basic Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Basic Info</Text>

        <TextInput
          style={styles.input}
          placeholder="Your name (optional)"
          placeholderTextColor="#555"
          value={profile.name}
          onChangeText={(v) => setProfile({ ...profile, name: v })}
        />

        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="Age"
            placeholderTextColor="#555"
            value={String(profile.age)}
            onChangeText={(v) => setProfile({ ...profile, age: v })}
            keyboardType="numeric"
          />
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="Weight (kg)"
            placeholderTextColor="#555"
            value={String(profile.weight)}
            onChangeText={(v) => setProfile({ ...profile, weight: v })}
            keyboardType="decimal-pad"
          />
        </View>

        <TextInput
          style={styles.input}
          placeholder="Height (cm)"
          placeholderTextColor="#555"
          value={String(profile.height)}
          onChangeText={(v) => setProfile({ ...profile, height: v })}
          keyboardType="decimal-pad"
        />

        {/* Gender */}
        <Text style={styles.label}>Gender</Text>
        <View style={styles.row}>
          {['male', 'female'].map((g) => (
            <TouchableOpacity
              key={g}
              style={[styles.selectButton, profile.gender === g && styles.selectButtonActive]}
              onPress={() => setProfile({ ...profile, gender: g })}
            >
              <Ionicons
                name={g === 'male' ? 'male' : 'female'}
                size={18}
                color={profile.gender === g ? '#fff' : '#888'}
              />
              <Text style={[styles.selectText, profile.gender === g && styles.selectTextActive]}>
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Activity Level */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Activity Level</Text>
        {ACTIVITY_LEVELS.map((level) => (
          <TouchableOpacity
            key={level.key}
            style={[styles.optionCard, profile.activityLevel === level.key && styles.optionCardActive]}
            onPress={() => setProfile({ ...profile, activityLevel: level.key })}
          >
            <Ionicons
              name={level.icon}
              size={22}
              color={profile.activityLevel === level.key ? '#4CAF50' : '#888'}
            />
            <View style={styles.optionText}>
              <Text style={[styles.optionLabel, profile.activityLevel === level.key && styles.optionLabelActive]}>
                {level.label}
              </Text>
              <Text style={styles.optionDesc}>{level.desc}</Text>
            </View>
            {profile.activityLevel === level.key && (
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Goal */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Goal</Text>
        <View style={styles.goalGrid}>
          {GOALS.map((goal) => (
            <TouchableOpacity
              key={goal.key}
              style={[
                styles.goalButton,
                profile.goal === goal.key && {
                  borderColor: goal.color,
                  backgroundColor: goal.color + '15',
                }
              ]}
              onPress={() => setProfile({ ...profile, goal: goal.key })}
            >
              <Ionicons
                name={goal.icon}
                size={22}
                color={profile.goal === goal.key ? goal.color : '#888'}
              />
              <Text style={[styles.goalLabel, profile.goal === goal.key && { color: goal.color }]}>
                {goal.label}
              </Text>
              <Text style={styles.goalDesc}>{goal.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Save Button */}
      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Ionicons name="save" size={20} color="#fff" />
        <Text style={styles.saveButtonText}>{saved ? 'Update Profile' : 'Save Profile'}</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  content: { padding: 16 },
  tdeeCard: {
    backgroundColor: '#1e1e1e', borderRadius: 20, padding: 24,
    alignItems: 'center', marginBottom: 24, borderWidth: 1.5,
  },
  tdeeLabel: { color: '#888', fontSize: 14, marginBottom: 8 },
  tdeeValue: { fontSize: 52, fontWeight: 'bold' },
  tdeeSubtext: { color: '#666', fontSize: 13, marginTop: 4 },
  section: { marginBottom: 24 },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  input: {
    backgroundColor: '#1e1e1e', borderRadius: 12, padding: 14,
    color: '#fff', fontSize: 15, marginBottom: 10,
  },
  row: { flexDirection: 'row', gap: 10 },
  halfInput: { flex: 1 },
  label: { color: '#888', fontSize: 13, marginBottom: 8, marginTop: 4 },
  selectButton: {
    flex: 1, backgroundColor: '#1e1e1e', borderRadius: 12, padding: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderWidth: 1.5, borderColor: 'transparent',
  },
  selectButtonActive: { borderColor: '#4CAF50', backgroundColor: '#0a2a0a' },
  selectText: { color: '#888', fontSize: 15 },
  selectTextActive: { color: '#fff', fontWeight: '600' },
  optionCard: {
    backgroundColor: '#1e1e1e', borderRadius: 12, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginBottom: 8, borderWidth: 1.5, borderColor: 'transparent',
  },
  optionCardActive: { borderColor: '#4CAF50', backgroundColor: '#0a2a0a' },
  optionText: { flex: 1 },
  optionLabel: { color: '#888', fontSize: 15, fontWeight: '600' },
  optionLabelActive: { color: '#fff' },
  optionDesc: { color: '#555', fontSize: 12, marginTop: 2 },
  goalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  goalButton: {
    width: '47%', backgroundColor: '#1e1e1e', borderRadius: 12, padding: 14,
    alignItems: 'center', gap: 4, borderWidth: 1.5, borderColor: 'transparent',
  },
  goalLabel: { color: '#888', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  goalDesc: { color: '#555', fontSize: 11, textAlign: 'center' },
  saveButton: {
    backgroundColor: '#4CAF50', borderRadius: 14, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
