import { useState } from 'react';
import {
  View, Text, TouchableOpacity, Image,
  StyleSheet, Alert, ScrollView, ActivityIndicator, TextInput
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import { saveMeal } from '../store/userStore';

const ANTHROPIC_API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;

export default function CameraScreen() {
  const router = useRouter();
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editedResult, setEditedResult] = useState(null);

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera permission is required to take photos.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.3,
      base64: true,
      exif: false,
    });
    if (!res.canceled) {
      setImage(res.assets[0]);
      setResult(null);
      analyzeFood(res.assets[0]);
    }
  };

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.3,
      base64: true,
      exif: false,
    });
    if (!res.canceled) {
      setImage(res.assets[0]);
      setResult(null);
      analyzeFood(res.assets[0]);
    }
  };

  const analyzeFood = async (imageAsset) => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));

      let base64 = imageAsset.base64;
      if (!base64) {
        base64 = await FileSystem.readAsStringAsync(imageAsset.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }

      if (!base64) throw new Error('Could not read image');

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: 'image/jpeg',
                    data: base64,
                  },
                },
                {
                  type: 'text',
                  text: `Analyze this food image and estimate its nutritional content.

Return ONLY a JSON object with no explanation:
{
  "foodName": "name of the food",
  "portion": "estimated portion size (e.g. 1 plate, 250g, 1 cup)",
  "calories": estimated calories as a number,
  "protein": estimated protein in grams as a number,
  "carbs": estimated carbs in grams as a number,
  "fat": estimated fat in grams as a number,
  "confidence": "high/medium/low",
  "notes": "any relevant notes about the estimation"
}

Be specific about the food name. If you see Indonesian food like nasi goreng, rendang, mie ayam, soto, etc, identify it correctly. Estimate for the visible portion size.`,
                },
              ],
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

      setResult(parsed);
      setEditedResult(parsed);
    } catch (error) {
      Alert.alert('Error', error.message || 'Could not analyze the food. Please try again.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const mealToSave = editing ? editedResult : result;
    await saveMeal(mealToSave);
    Alert.alert('Saved!', `${mealToSave.foodName} added to today's log.`, [
      { text: 'OK', onPress: () => { router.push('/'); setImage(null); setResult(null); } }
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {!image && (
        <View style={styles.buttonGroup}>
          <TouchableOpacity style={styles.mainButton} onPress={takePhoto}>
            <Ionicons name="camera" size={32} color="#fff" />
            <Text style={styles.mainButtonText}>Take Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={pickImage}>
            <Ionicons name="image" size={24} color="#4CAF50" />
            <Text style={styles.secondaryButtonText}>Choose from Library</Text>
          </TouchableOpacity>
        </View>
      )}

      {image && (
        <View style={styles.imageContainer}>
          <Image source={{ uri: image.uri }} style={styles.image} />
          <TouchableOpacity style={styles.retakeButton} onPress={() => { setImage(null); setResult(null); }}>
            <Ionicons name="refresh" size={16} color="#fff" />
            <Text style={styles.retakeText}>Retake</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Analyzing food...</Text>
          <Text style={styles.loadingSubtext}>Claude is identifying your meal</Text>
        </View>
      )}

      {result && !loading && (
        <View style={styles.resultCard}>
          <View style={styles.resultHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.foodName}>{editedResult.foodName}</Text>
              <Text style={styles.portion}>{editedResult.portion}</Text>
            </View>
            <TouchableOpacity onPress={() => setEditing(!editing)}>
              <Ionicons name={editing ? "checkmark-circle" : "pencil"} size={24} color="#4CAF50" />
            </TouchableOpacity>
          </View>

          <View style={styles.caloriesBadge}>
            {editing ? (
              <TextInput
                style={styles.editInput}
                value={String(editedResult.calories)}
                onChangeText={(v) => setEditedResult({ ...editedResult, calories: parseInt(v) || 0 })}
                keyboardType="numeric"
                selectTextOnFocus
              />
            ) : (
              <Text style={styles.caloriesNumber}>{editedResult.calories}</Text>
            )}
            <Text style={styles.caloriesUnit}>kcal</Text>
          </View>

          <View style={styles.macroRow}>
            <View style={styles.macroItem}>
              {editing ? (
                <TextInput
                  style={styles.editInputSmall}
                  value={String(editedResult.protein)}
                  onChangeText={(v) => setEditedResult({ ...editedResult, protein: parseInt(v) || 0 })}
                  keyboardType="numeric"
                  selectTextOnFocus
                />
              ) : (
                <Text style={styles.macroValue}>{editedResult.protein}g</Text>
              )}
              <Text style={styles.macroLabel}>Protein</Text>
            </View>
            <View style={styles.macroItem}>
              {editing ? (
                <TextInput
                  style={styles.editInputSmall}
                  value={String(editedResult.carbs)}
                  onChangeText={(v) => setEditedResult({ ...editedResult, carbs: parseInt(v) || 0 })}
                  keyboardType="numeric"
                  selectTextOnFocus
                />
              ) : (
                <Text style={styles.macroValue}>{editedResult.carbs}g</Text>
              )}
              <Text style={styles.macroLabel}>Carbs</Text>
            </View>
            <View style={styles.macroItem}>
              {editing ? (
                <TextInput
                  style={styles.editInputSmall}
                  value={String(editedResult.fat)}
                  onChangeText={(v) => setEditedResult({ ...editedResult, fat: parseInt(v) || 0 })}
                  keyboardType="numeric"
                  selectTextOnFocus
                />
              ) : (
                <Text style={styles.macroValue}>{editedResult.fat}g</Text>
              )}
              <Text style={styles.macroLabel}>Fat</Text>
            </View>
          </View>

          <View style={styles.confidenceRow}>
            <Ionicons
              name={result.confidence === 'high' ? 'checkmark-circle' : result.confidence === 'medium' ? 'alert-circle' : 'warning'}
              size={14}
              color={result.confidence === 'high' ? '#4CAF50' : result.confidence === 'medium' ? '#FFC107' : '#FF5252'}
            />
            <Text style={styles.confidenceText}>
              {result.confidence} confidence · {result.notes}
            </Text>
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Ionicons name="add-circle" size={20} color="#fff" />
            <Text style={styles.saveButtonText}>Add to Today's Log</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.retakeFullButton} onPress={() => { setImage(null); setResult(null); }}>
            <Text style={styles.retakeFullText}>Try Another Photo</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  content: { padding: 20 },
  buttonGroup: { gap: 12, marginTop: 20 },
  mainButton: {
    backgroundColor: '#4CAF50', borderRadius: 16, padding: 24,
    alignItems: 'center', gap: 8,
  },
  mainButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  secondaryButton: {
    backgroundColor: '#1e1e1e', borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  secondaryButtonText: { color: '#4CAF50', fontSize: 16 },
  imageContainer: { position: 'relative', marginBottom: 16 },
  image: { width: '100%', height: 250, borderRadius: 16 },
  retakeButton: {
    position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  retakeText: { color: '#fff', fontSize: 13 },
  loadingContainer: { alignItems: 'center', padding: 40, gap: 12 },
  loadingText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  loadingSubtext: { color: '#888', fontSize: 14 },
  resultCard: { backgroundColor: '#1e1e1e', borderRadius: 20, padding: 20 },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  foodName: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  portion: { color: '#888', fontSize: 14, marginTop: 2 },
  caloriesBadge: {
    backgroundColor: '#0a2a0a', borderRadius: 12, padding: 16,
    alignItems: 'center', marginBottom: 16,
  },
  caloriesNumber: { color: '#4CAF50', fontSize: 48, fontWeight: 'bold' },
  caloriesUnit: { color: '#4CAF50', fontSize: 16 },
  macroRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  macroItem: {
    flex: 1, backgroundColor: '#2a2a2a', borderRadius: 12,
    padding: 12, alignItems: 'center',
  },
  macroValue: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  macroLabel: { color: '#888', fontSize: 12, marginTop: 2 },
  confidenceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
  confidenceText: { color: '#666', fontSize: 12, flex: 1 },
  saveButton: {
    backgroundColor: '#4CAF50', borderRadius: 14, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginBottom: 10,
  },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  retakeFullButton: { padding: 12, alignItems: 'center' },
  retakeFullText: { color: '#888', fontSize: 14 },
  editInput: { color: '#4CAF50', fontSize: 48, fontWeight: 'bold', minWidth: 80, textAlign: 'center' },
  editInputSmall: { color: '#fff', fontSize: 18, fontWeight: 'bold', minWidth: 40, textAlign: 'center' },
});
