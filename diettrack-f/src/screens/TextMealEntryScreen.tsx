import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { figmaColors } from '../theme/figma-colors';
import { Icon } from '../components/icons/Icons';
import { AppGradient } from '../components/AppGradient';
import { analyze } from '../api';

interface Props {
  onBack: () => void;
  onSave: (mealData: any) => void;
}

interface MealData {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving: string;
}

export default function TextMealEntryScreen({ onBack, onSave }: Props) {
  const [mealText, setMealText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [mealData, setMealData] = useState<MealData | null>(null);
  const [manualEntry, setManualEntry] = useState(false);
  const [nutrition, setNutrition] = useState({
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    serving: '1 serving',
  });

  const handleTextAnalysis = async () => {
    if (!mealText.trim()) return;

    setIsAnalyzing(true);
    try {
      // Call backend API for text analysis
      const result = await analyze({ prompt: mealText });

      if (result.success && result.data?.detectedItems?.length > 0) {
        const item = result.data.detectedItems[0];
        setMealData({
          name: item.name,
          calories: item.nutrition.calories,
          protein: item.nutrition.protein,
          carbs: item.nutrition.carbs,
          fat: item.nutrition.fat,
          serving: '1 serving',
        });
        setNutrition({
          calories: item.nutrition.calories.toString(),
          protein: item.nutrition.protein.toString(),
          carbs: item.nutrition.carbs.toString(),
          fat: item.nutrition.fat.toString(),
          serving: '1 serving',
        });
      } else {
        // Fallback to manual entry
        setManualEntry(true);
        setMealData({
          name: mealText,
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          serving: '1 serving',
        });
      }
    } catch (error) {
      console.error('Text analysis error:', error);
      // Fallback to manual entry
      setManualEntry(true);
      setMealData({
        name: mealText,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        serving: '1 serving',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleManualEntry = () => {
    setManualEntry(true);
    setMealData({
      name: mealText || 'Custom Meal',
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      serving: '1 serving',
    });
  };

  const updateNutrition = (field: keyof typeof nutrition, value: string) => {
    setNutrition((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (mealData) {
      const finalData = {
        ...mealData,
        calories: parseFloat(nutrition.calories) || 0,
        protein: parseFloat(nutrition.protein) || 0,
        carbs: parseFloat(nutrition.carbs) || 0,
        fat: parseFloat(nutrition.fat) || 0,
        serving: nutrition.serving,
      };
      onSave(finalData);
    }
  };

  const isFormValid =
    mealData &&
    nutrition.calories &&
    nutrition.protein &&
    nutrition.carbs &&
    nutrition.fat;

  return (
    <AppGradient>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={styles.keyboardContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <Icon
                name="back-arrow"
                size={20}
                color={figmaColors.textPrimary}
              />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Add Meal</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.content}>
              {/* Text Input Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>What did you eat?</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g., Grilled chicken with rice and vegetables"
                  value={mealText}
                  onChangeText={setMealText}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />

                {!mealData && (
                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={[
                        styles.analyzeButton,
                        !mealText.trim() && styles.disabledButton,
                      ]}
                      onPress={handleTextAnalysis}
                      disabled={!mealText.trim() || isAnalyzing}
                    >
                      {isAnalyzing ? (
                        <ActivityIndicator
                          size="small"
                          color={figmaColors.surface}
                        />
                      ) : (
                        <Icon
                          name="camera"
                          size={20}
                          color={figmaColors.surface}
                        />
                      )}
                      <Text style={styles.analyzeButtonText}>
                        {isAnalyzing ? 'Analyzing...' : 'Analyze with AI'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.manualButton}
                      onPress={handleManualEntry}
                    >
                      <Icon
                        name="settings"
                        size={20}
                        color={figmaColors.textPrimary}
                      />
                      <Text style={styles.manualButtonText}>
                        Enter Manually
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Nutrition Information */}
              {mealData && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Nutrition Information</Text>

                  <View style={styles.mealNameContainer}>
                    <Text style={styles.mealName}>{mealData.name}</Text>
                    <Text style={styles.servingText}>{nutrition.serving}</Text>
                  </View>

                  <View style={styles.nutritionGrid}>
                    <View style={styles.nutritionItem}>
                      <View style={styles.nutritionHeader}>
                        <Icon
                          name="calories"
                          size={20}
                          color={figmaColors.calories}
                        />
                        <Text style={styles.nutritionLabel}>Calories</Text>
                      </View>
                      <TextInput
                        style={styles.nutritionInput}
                        value={nutrition.calories}
                        onChangeText={(value) =>
                          updateNutrition('calories', value)
                        }
                        keyboardType="numeric"
                        placeholder="0"
                      />
                    </View>

                    <View style={styles.nutritionItem}>
                      <View style={styles.nutritionHeader}>
                        <Icon
                          name="protein"
                          size={20}
                          color={figmaColors.protein}
                        />
                        <Text style={styles.nutritionLabel}>Protein (g)</Text>
                      </View>
                      <TextInput
                        style={styles.nutritionInput}
                        value={nutrition.protein}
                        onChangeText={(value) =>
                          updateNutrition('protein', value)
                        }
                        keyboardType="numeric"
                        placeholder="0"
                      />
                    </View>

                    <View style={styles.nutritionItem}>
                      <View style={styles.nutritionHeader}>
                        <Icon
                          name="carbs"
                          size={20}
                          color={figmaColors.carbs}
                        />
                        <Text style={styles.nutritionLabel}>Carbs (g)</Text>
                      </View>
                      <TextInput
                        style={styles.nutritionInput}
                        value={nutrition.carbs}
                        onChangeText={(value) =>
                          updateNutrition('carbs', value)
                        }
                        keyboardType="numeric"
                        placeholder="0"
                      />
                    </View>

                    <View style={styles.nutritionItem}>
                      <View style={styles.nutritionHeader}>
                        <Icon name="fats" size={20} color={figmaColors.fats} />
                        <Text style={styles.nutritionLabel}>Fat (g)</Text>
                      </View>
                      <TextInput
                        style={styles.nutritionInput}
                        value={nutrition.fat}
                        onChangeText={(value) => updateNutrition('fat', value)}
                        keyboardType="numeric"
                        placeholder="0"
                      />
                    </View>
                  </View>

                  <View style={styles.servingContainer}>
                    <Text style={styles.servingLabel}>Serving Size</Text>
                    <TextInput
                      style={styles.servingInput}
                      value={nutrition.serving}
                      onChangeText={(value) =>
                        updateNutrition('serving', value)
                      }
                      placeholder="1 serving"
                    />
                  </View>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Bottom Buttons */}
          {mealData && (
            <View style={styles.bottomButtons}>
              <TouchableOpacity
                style={styles.backBottomButton}
                onPress={onBack}
              >
                <Text style={styles.backBottomText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.saveButton,
                  !isFormValid && styles.disabledButton,
                ]}
                onPress={handleSave}
                disabled={!isFormValid}
              >
                <Text style={styles.saveButtonText}>Add to Log</Text>
              </TouchableOpacity>
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </AppGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: figmaColors.textPrimary,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
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
    minHeight: 80,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  analyzeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: figmaColors.primary,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  manualButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: figmaColors.surface,
    borderWidth: 1,
    borderColor: figmaColors.border,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  analyzeButtonText: {
    color: figmaColors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  manualButtonText: {
    color: figmaColors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  mealNameContainer: {
    marginBottom: 20,
  },
  mealName: {
    fontSize: 18,
    fontWeight: '600',
    color: figmaColors.textPrimary,
    marginBottom: 4,
  },
  servingText: {
    fontSize: 14,
    color: figmaColors.textSecondary,
  },
  nutritionGrid: {
    gap: 16,
    marginBottom: 20,
  },
  nutritionItem: {
    backgroundColor: figmaColors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: figmaColors.border,
  },
  nutritionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  nutritionLabel: {
    fontSize: 14,
    color: figmaColors.textSecondary,
    fontWeight: '500',
  },
  nutritionInput: {
    fontSize: 18,
    fontWeight: '600',
    color: figmaColors.textPrimary,
    borderBottomWidth: 1,
    borderBottomColor: figmaColors.border,
    paddingBottom: 4,
  },
  servingContainer: {
    backgroundColor: figmaColors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: figmaColors.border,
  },
  servingLabel: {
    fontSize: 14,
    color: figmaColors.textSecondary,
    marginBottom: 8,
  },
  servingInput: {
    fontSize: 16,
    color: figmaColors.textPrimary,
    borderBottomWidth: 1,
    borderBottomColor: figmaColors.border,
    paddingBottom: 4,
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
