import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { figmaColors } from '../theme/figma-colors';
import { Icon } from '../components/icons/Icons';
import { AppGradient } from '../components/AppGradient';
import {
  ErrorStateComponent,
  ErrorState,
  ErrorAction,
} from '../components/ErrorState';
import { analyze } from '../api';

interface Props {
  onBack: () => void;
  onSave: () => void;
  onRetryCamera: () => void;
  onManualEntry: () => void;
  imageUri?: string;
}

interface DetectedItem {
  itemId: number;
  name: string;
  confidence: number;
  portionSize: {
    estimatedGrams: number;
    confidenceRange?: [number, number];
    servingSizeCategory?: string;
  };
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
    sodium: number;
    cholesterol: number;
  };
  nutritionPer100g?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
    sodium: number;
    cholesterol: number;
  };
  ingredients?: string[];
}

type ScreenState = 'loading' | 'error' | 'success' | 'manual_entry';

export default function FoodAnalysisScreen({
  onBack,
  onSave,
  onRetryCamera,
  onManualEntry,
  imageUri,
}: Props) {
  const [screenState, setScreenState] = useState<ScreenState>('loading');
  const [analysisData, setAnalysisData] = useState<DetectedItem[]>([]);
  const [servings, setServings] = useState(1);
  const [cookingFat, setCookingFat] = useState('');
  const [fatAmount, setFatAmount] = useState('0');
  const [errorState, setErrorState] = useState<ErrorState | null>(null);
  const [editingNutrition, setEditingNutrition] = useState<{
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }>({ calories: 0, protein: 0, carbs: 0, fat: 0 });

  // Analyze the image when component mounts
  useEffect(() => {
    if (imageUri) {
      analyzeImage();
    }
  }, [imageUri]);

  const analyzeImage = async () => {
    if (!imageUri) return;

    setScreenState('loading');
    setErrorState(null);

    try {
      // Convert image URI to base64 data URL
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          // Keep the full data URL format for backend validation
          resolve(base64String);
        };
        reader.readAsDataURL(blob);
      });

      // Call the backend API with timeout
      const result = (await Promise.race([
        analyze({ imageBase64: base64 }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Analysis timeout')), 30000)
        ),
      ])) as any;

      if (
        result.success &&
        result.data?.detectedItems &&
        result.data.detectedItems.length > 0
      ) {
        setAnalysisData(result.data.detectedItems);
        setScreenState('success');

        // Initialize editing nutrition with detected values
        const totalNutrition = calculateTotalNutrition(
          result.data.detectedItems,
          servings
        );
        setEditingNutrition(totalNutrition);
      } else {
        handleAnalysisError('No food items detected in the image');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      handleAnalysisError(
        error instanceof Error ? error.message : 'Analysis failed'
      );
    }
  };

  const handleAnalysisError = (errorMessage: string) => {
    const errorState: ErrorState = {
      type: 'analysis_failed',
      title: 'Analysis Failed',
      message:
        "We couldn't analyze this photo. The image may be too blurry or the food isn't clear. Please try again.",
      actions: [
        { label: 'Try Again', action: 'retry', style: 'primary' },
        { label: 'Add Manually', action: 'manual_entry', style: 'secondary' },
        { label: 'Choose from Gallery', action: 'gallery', style: 'secondary' },
      ],
    };

    setErrorState(errorState);
    setScreenState('error');
  };

  const handleErrorAction = (action: string) => {
    switch (action) {
      case 'retry':
        onRetryCamera();
        break;
      case 'manual_entry':
        setScreenState('manual_entry');
        break;
      case 'gallery':
        // TODO: Implement gallery picker
        break;
      case 'dismiss':
        onBack();
        break;
    }
  };

  const calculateTotalNutrition = (
    items: DetectedItem[],
    servingsCount: number
  ) => {
    return items.reduce(
      (total, item) => ({
        calories: total.calories + item.nutrition.calories * servingsCount,
        protein: total.protein + item.nutrition.protein * servingsCount,
        carbs: total.carbs + item.nutrition.carbs * servingsCount,
        fat: total.fat + item.nutrition.fat * servingsCount,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  };

  const updateServings = (delta: number) => {
    const newServings = Math.max(1, servings + delta);
    setServings(newServings);

    // Recalculate nutrition with new servings
    const totalNutrition = calculateTotalNutrition(analysisData, newServings);
    setEditingNutrition(totalNutrition);
  };

  const updateNutritionValue = (
    key: keyof typeof editingNutrition,
    value: string
  ) => {
    const numValue = parseFloat(value) || 0;
    setEditingNutrition((prev) => ({ ...prev, [key]: numValue }));
  };

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={figmaColors.primary} />
      <Text style={styles.loadingText}>Analyzing your meal...</Text>
      <Text style={styles.loadingSubtext}>This may take a few seconds</Text>
    </View>
  );

  const renderErrorState = () => {
    if (!errorState) return null;
    return (
      <ErrorStateComponent
        errorState={errorState}
        onAction={handleErrorAction}
      />
    );
  };

  const renderManualEntryState = () => (
    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        <Text style={styles.title}>Add Food Manually</Text>

        <View style={styles.manualEntrySection}>
          <Text style={styles.sectionTitle}>Food Name</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g., Chicken Rice Bowl"
            value={cookingFat} // Reusing for food name
            onChangeText={setCookingFat}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nutrition Information</Text>

          <View style={styles.nutritionGrid}>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionLabel}>Calories</Text>
              <TextInput
                style={styles.nutritionInput}
                value={editingNutrition.calories.toString()}
                onChangeText={(value) =>
                  updateNutritionValue('calories', value)
                }
                keyboardType="numeric"
              />
            </View>

            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionLabel}>Protein (g)</Text>
              <TextInput
                style={styles.nutritionInput}
                value={editingNutrition.protein.toString()}
                onChangeText={(value) => updateNutritionValue('protein', value)}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionLabel}>Carbs (g)</Text>
              <TextInput
                style={styles.nutritionInput}
                value={editingNutrition.carbs.toString()}
                onChangeText={(value) => updateNutritionValue('carbs', value)}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionLabel}>Fat (g)</Text>
              <TextInput
                style={styles.nutritionInput}
                value={editingNutrition.fat.toString()}
                onChangeText={(value) => updateNutritionValue('fat', value)}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  const renderSuccessState = () => (
    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      {/* Food Image */}
      {imageUri ? (
        <View style={styles.foodImageContainer}>
          <Image source={{ uri: imageUri }} style={styles.foodImage} />
        </View>
      ) : (
        <View style={styles.foodImagePlaceholder}>
          <Icon name="camera" size={40} color={figmaColors.textSecondary} />
          <Text style={styles.placeholderText}>Food Image</Text>
        </View>
      )}

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.foodTitle}>
            {analysisData.length > 0
              ? analysisData.map((item) => item.name).join(', ')
              : 'Food Analysis'}
          </Text>
          <View style={styles.servingsControl}>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => updateServings(-1)}
            >
              <Text style={styles.controlText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.servingsText}>{servings}</Text>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => updateServings(1)}
            >
              <Text style={styles.controlText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Editable Nutrition Grid */}
        <View style={styles.nutritionGrid}>
          <TouchableOpacity style={styles.nutritionCard}>
            <Icon name="calories" size={20} color={figmaColors.calories} />
            <Text style={styles.nutritionLabel}>Calories</Text>
            <TextInput
              style={styles.nutritionValue}
              value={Math.round(editingNutrition.calories).toString()}
              onChangeText={(value) => updateNutritionValue('calories', value)}
              keyboardType="numeric"
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.nutritionCard}>
            <Icon name="protein" size={20} color={figmaColors.protein} />
            <Text style={styles.nutritionLabel}>Protein</Text>
            <TextInput
              style={styles.nutritionValue}
              value={`${Math.round(editingNutrition.protein * 10) / 10}g`}
              onChangeText={(value) => updateNutritionValue('protein', value)}
              keyboardType="numeric"
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.nutritionCard}>
            <Icon name="carbs" size={20} color={figmaColors.carbs} />
            <Text style={styles.nutritionLabel}>Carbs</Text>
            <TextInput
              style={styles.nutritionValue}
              value={`${Math.round(editingNutrition.carbs * 10) / 10}g`}
              onChangeText={(value) => updateNutritionValue('carbs', value)}
              keyboardType="numeric"
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.nutritionCard}>
            <Icon name="fats" size={20} color={figmaColors.fats} />
            <Text style={styles.nutritionLabel}>Fats</Text>
            <TextInput
              style={styles.nutritionValue}
              value={`${Math.round(editingNutrition.fat * 10) / 10}g`}
              onChangeText={(value) => updateNutritionValue('fat', value)}
              keyboardType="numeric"
            />
          </TouchableOpacity>
        </View>

        {/* Ingredients */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ingredients</Text>
          {analysisData.length > 0 ? (
            analysisData
              .flatMap((item) => item.ingredients || [])
              .map((ingredient, index) => (
                <View key={index} style={styles.ingredientRow}>
                  <Text style={styles.ingredientName}>{ingredient}</Text>
                </View>
              ))
          ) : (
            <Text style={styles.noIngredientsText}>
              No ingredients detected. Try taking a clearer photo.
            </Text>
          )}
        </View>
      </View>
    </ScrollView>
  );

  return (
    <AppGradient>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Icon name="back-arrow" size={20} color={figmaColors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Content based on state */}
        {screenState === 'loading' && renderLoadingState()}
        {screenState === 'error' && renderErrorState()}
        {screenState === 'manual_entry' && renderManualEntryState()}
        {screenState === 'success' && renderSuccessState()}

        {/* Bottom Buttons */}
        {screenState !== 'loading' && screenState !== 'error' && (
          <View style={styles.bottomButtons}>
            <TouchableOpacity style={styles.backBottomButton} onPress={onBack}>
              <Text style={styles.backBottomText}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveButton} onPress={onSave}>
              <Text style={styles.saveButtonText}>Add to Home Screen</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </AppGradient>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: figmaColors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  loadingSubtext: {
    fontSize: 14,
    color: figmaColors.textSecondary,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: figmaColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: figmaColors.textPrimary,
    marginBottom: 24,
    textAlign: 'center',
  },
  foodImageContainer: {
    margin: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  foodImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  foodImagePlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: figmaColors.surface,
    borderRadius: 12,
    margin: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: figmaColors.border,
    borderStyle: 'dashed',
  },
  placeholderText: {
    fontSize: 16,
    color: figmaColors.textSecondary,
    marginTop: 8,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  foodTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: figmaColors.textPrimary,
    flex: 1,
    marginRight: 16,
  },
  servingsControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  controlButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: figmaColors.surface,
    borderWidth: 1,
    borderColor: figmaColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlText: {
    fontSize: 18,
    color: figmaColors.textPrimary,
    fontWeight: '500',
  },
  servingsText: {
    fontSize: 16,
    fontWeight: '600',
    color: figmaColors.textPrimary,
    minWidth: 20,
    textAlign: 'center',
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
  },
  nutritionCard: {
    width: '48%',
    backgroundColor: figmaColors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: figmaColors.border,
  },
  nutritionLabel: {
    fontSize: 14,
    color: figmaColors.textSecondary,
    marginBottom: 4,
    marginTop: 8,
  },
  nutritionValue: {
    fontSize: 20,
    fontWeight: '700',
    color: figmaColors.textPrimary,
    borderBottomWidth: 1,
    borderBottomColor: figmaColors.border,
    paddingBottom: 4,
    minWidth: 60,
  },
  nutritionInput: {
    fontSize: 16,
    color: figmaColors.textPrimary,
    borderWidth: 1,
    borderColor: figmaColors.border,
    borderRadius: 8,
    padding: 8,
    marginTop: 4,
  },
  section: {
    marginBottom: 32,
  },
  manualEntrySection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: figmaColors.textPrimary,
    marginBottom: 16,
  },
  textInput: {
    borderWidth: 1,
    borderColor: figmaColors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: figmaColors.surface,
    color: figmaColors.textPrimary,
  },
  ingredientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: figmaColors.border,
  },
  ingredientName: {
    fontSize: 16,
    color: figmaColors.textPrimary,
  },
  noIngredientsText: {
    fontSize: 14,
    color: figmaColors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  bottomButtons: {
    flexDirection: 'row',
    gap: 12,
    padding: 24,
    paddingBottom: 40,
  },
  backBottomButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: figmaColors.border,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    backgroundColor: figmaColors.surface,
  },
  backBottomText: {
    color: figmaColors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 2,
    backgroundColor: figmaColors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: figmaColors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
});
