import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Pressable,
  StyleSheet,
  Dimensions,
  Image,
  ActivityIndicator,
} from 'react-native';
import { AppGradient } from '../components/AppGradient';
import { Icon } from '../components/icons/Icons';
import { ActionSheet } from '../components/ui/ActionSheet';
import { EmptyState } from '../components/EmptyState';
import { figmaColors } from '../theme/figma-colors';
import {
  spacing,
  fontSize,
  componentSize,
  screenDimensions,
} from '../utils/responsive';
import {
  analyze,
  getAnalysisHistory,
  getUserProfile,
  getUserDailyStats,
  getUserRecentMeals,
  type UserProfile,
  type DailyStats,
  type RecentMeal,
} from '../api';

interface Props {
  onNavigateToCamera?: () => void;
  onNavigateToTextEntry?: () => void;
  onNavigateToResults?: (data: any) => void;
  onNavigateToProfile?: () => void;
}

const { width } = Dimensions.get('window');

export default function MobileOptimizedHomeScreen({
  onNavigateToCamera,
  onNavigateToTextEntry,
  onNavigateToResults,
  onNavigateToProfile,
}: Props) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showActionSheet, setShowActionSheet] = useState(false);

  // User data - will be fetched from backend
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStats | null>(null);
  const [recentFoods, setRecentFoods] = useState<RecentMeal[]>([]);
  const [loading, setLoading] = useState(true);

  // DEMO//
  const DEMO_USER_ID = '550e8400-e29b-41d4-a716-446655440000';

  // Fetch user data and recent foods on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);

        // Try real API calls first
        try {
          const [profile, stats, meals] = await Promise.all([
            getUserProfile(DEMO_USER_ID),
            getUserDailyStats(DEMO_USER_ID),
            getUserRecentMeals(DEMO_USER_ID, 5),
          ]);
          setUserProfile(profile);
          setDailyStats(stats);
          setRecentFoods(meals);
        } catch (apiError) {
          console.warn('API calls failed, using mock data:', apiError);

          // Fallback to mock data
          setUserProfile({
            id: DEMO_USER_ID,
            name: 'Demo User',
            email: 'demo@example.com',
            age: 25,
            gender: 'male',
            height_cm: 175,
            weight_kg: 70,
            activity_level: 'moderate',
            fitness_goal: 'maintain',
            daily_calorie_target: 2000,
            macro_targets: { protein: 140, carbs: 230, fats: 54 },
            dietary_preferences: [],
            allergies: [],
            subscription_status: 'free_trial',
          });

          setDailyStats({
            calories_consumed: 0,
            protein_consumed: 0,
            carbs_consumed: 0,
            fats_consumed: 0,
            fiber_consumed: 0,
            sugar_consumed: 0,
            sodium_consumed: 0,
            water_intake_ml: 0,
          });

          setRecentFoods([]);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        setUserProfile({
          id: DEMO_USER_ID,
          name: 'Demo User',
          email: 'demo@example.com',
          age: 25,
          gender: 'male',
          height_cm: 175,
          weight_kg: 70,
          activity_level: 'moderate',
          fitness_goal: 'maintain',
          daily_calorie_target: 2000,
          macro_targets: { protein: 140, carbs: 230, fats: 54 },
          dietary_preferences: [],
          allergies: [],
          subscription_status: 'free_trial',
        });
        setDailyStats({
          calories_consumed: 0,
          protein_consumed: 0,
          carbs_consumed: 0,
          fats_consumed: 0,
          fiber_consumed: 0,
          sugar_consumed: 0,
          sodium_consumed: 0,
          water_intake_ml: 0,
        });
        setRecentFoods([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [DEMO_USER_ID]);

  // Calculate progress and remaining calories
  const progress = useMemo(() => {
    if (!userProfile || !dailyStats) return 0;
    return userProfile.daily_calorie_target > 0
      ? dailyStats.calories_consumed / userProfile.daily_calorie_target
      : 0;
  }, [userProfile, dailyStats]);

  const remainingCalories = useMemo(() => {
    if (!userProfile || !dailyStats) return 2000;
    return Math.max(
      0,
      userProfile.daily_calorie_target - dailyStats.calories_consumed
    );
  }, [userProfile, dailyStats]);

  // Calculate remaining macros
  const macroData = useMemo(() => {
    if (!userProfile || !dailyStats) {
      return {
        protein: { remaining: 140, unit: 'g' },
        carbs: { remaining: 230, unit: 'g' },
        fats: { remaining: 54, unit: 'g' },
      };
    }

    return {
      protein: {
        remaining: Math.max(
          0,
          userProfile.macro_targets.protein - dailyStats.protein_consumed
        ),
        unit: 'g',
      },
      carbs: {
        remaining: Math.max(
          0,
          userProfile.macro_targets.carbs - dailyStats.carbs_consumed
        ),
        unit: 'g',
      },
      fats: {
        remaining: Math.max(
          0,
          userProfile.macro_targets.fats - dailyStats.fats_consumed
        ),
        unit: 'g',
      },
    };
  }, [userProfile, dailyStats]);

  // Memoize the days calculation to prevent recreation on every render
  const weekDays = useMemo(() => {
    const today = new Date();
    const days = [];
    const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - today.getDay() + i);
      days.push({
        day: dayNames[i],
        date: date.getDate(),
        isToday: i === today.getDay(),
      });
    }
    return days;
  }, []);

  // Memoize event handlers to prevent unnecessary re-renders
  const handleAddFood = useCallback(() => {
    setShowActionSheet(true);
  }, []);

  const handleTakePhoto = useCallback(() => {
    setShowActionSheet(false);
    onNavigateToCamera?.();
  }, [onNavigateToCamera]);

  const handleUploadFromGallery = useCallback(() => {
    setShowActionSheet(false);
    // TODO: Implement gallery picker
  }, []);

  const handleTextEntry = useCallback(() => {
    setShowActionSheet(false);
    onNavigateToTextEntry?.();
  }, [onNavigateToTextEntry]);

  const handleCameraPress = useCallback(() => {
    setShowActionSheet(false);
    onNavigateToCamera?.();
  }, [onNavigateToCamera]);

  if (loading) {
    return (
      <AppGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={figmaColors.primary} />
          <Text style={styles.loadingText}>Loading your data...</Text>
        </View>
      </AppGradient>
    );
  }

  return (
    <AppGradient>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={onNavigateToProfile}
          >
            <View style={styles.profileImage}>
              <Text style={styles.profileInitial}>U</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.appTitle}>DietTrack</Text>
          </View>

          <View style={styles.headerRight} />
        </View>

        {/* Date Picker */}
        <View style={styles.datePicker}>
          {weekDays.map((day, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.dateItem, day.isToday && styles.todayDateItem]}
              onPress={() => setSelectedDate(new Date())}
            >
              <Text
                style={[styles.dayText, day.isToday && styles.todayDayText]}
              >
                {day.day}
              </Text>
              <Text
                style={[styles.dateText, day.isToday && styles.todayDateText]}
              >
                {day.date}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Today Label */}
        <View style={styles.todayLabelContainer}>
          <Text style={styles.todayLabel}>Today</Text>
        </View>

        {/* Calorie Summary */}
        <View style={styles.calorieCard}>
          <View style={styles.calorieHeader}>
            <Icon name="calories" size={28} color={figmaColors.calories} />
            <Text style={styles.calorieTitle}>Calories</Text>
          </View>

          <View style={styles.circularProgressContainer}>
            <View style={styles.circularProgressOuter}>
              <View style={styles.circularProgressInner}>
                <Text style={styles.remainingCalories}>
                  {remainingCalories}
                </Text>
                <Text style={styles.remainingLabel}>Remaining</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Macro Cards */}
        <View style={styles.macroGrid}>
          <View style={styles.macroCard}>
            <Text style={styles.macroValue}>
              {macroData.protein.remaining}g
            </Text>
            <Text style={styles.macroLabel}>Protein left</Text>
            <View style={styles.emojiContainer}>
              <Icon name="protein" size={24} color={figmaColors.protein} />
            </View>
          </View>

          <View style={styles.macroCard}>
            <Text style={styles.macroValue}>{macroData.carbs.remaining}g</Text>
            <Text style={styles.macroLabel}>Carbs left</Text>
            <View style={styles.emojiContainer}>
              <Icon name="carbs" size={24} color={figmaColors.carbs} />
            </View>
          </View>

          <View style={styles.macroCard}>
            <Text style={styles.macroValue}>{macroData.fats.remaining}g</Text>
            <Text style={styles.macroLabel}>Fats left</Text>
            <View style={styles.emojiContainer}>
              <Icon name="fats" size={24} color={figmaColors.fats} />
            </View>
          </View>
        </View>

        {/* Recently Uploaded Section */}
        <View style={styles.recentSection}>
          <Text style={styles.recentTitle}>Recently uploaded</Text>

          {recentFoods.length === 0 ? (
            <EmptyState
              icon="plate"
              title="No meals logged yet"
              subtitle="Start by taking a photo of your food or adding it manually"
              buttonText="Add Your First Meal"
              onButtonPress={handleCameraPress}
            />
          ) : (
            <View style={styles.foodList}>
              {recentFoods.map((food) => (
                <View key={food.id} style={styles.foodItem}>
                  <View style={styles.foodImageContainer}>
                    <Image
                      source={{ uri: food.image }}
                      style={styles.foodImage}
                    />
                  </View>
                  <View style={styles.foodInfo}>
                    <Text style={styles.foodName}>{food.name}</Text>
                    <Text style={styles.foodCalories}>
                      {food.calories} calories
                    </Text>
                    <Text style={styles.foodMacros}>
                      {food.protein}g protein, {food.carbs}g carbs, {food.fat}g
                      fat
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.viewButton}>
                    <Text style={styles.viewButtonText}>View</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating Plus Button */}
      <TouchableOpacity
        style={styles.floatingPlusButton}
        onPress={handleAddFood}
      >
        <Icon name="plus" size={24} color={figmaColors.surface} />
      </TouchableOpacity>

      {/* Action Sheet */}
      <ActionSheet
        visible={showActionSheet}
        onClose={() => setShowActionSheet(false)}
        onTakePhoto={handleTakePhoto}
        onUploadFromGallery={handleUploadFromGallery}
        onTextEntry={handleTextEntry}
      />
    </AppGradient>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: figmaColors.textSecondary,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: screenDimensions.isSmall ? spacing.lg : spacing.xl,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerRight: {
    width: 40,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: figmaColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  profileImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: figmaColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitial: {
    fontSize: 16,
    fontWeight: '600',
    color: figmaColors.primary,
  },
  appTitle: {
    fontSize: fontSize.xxxl,
    fontWeight: '700',
    color: figmaColors.primary,
    marginBottom: spacing.xs,
  },
  appSubtitle: {
    fontSize: fontSize.md,
    color: figmaColors.textSecondary,
    textAlign: 'center',
  },
  datePicker: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  dateItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#6B7280',
    backgroundColor: 'transparent',
    // Create dashed effect using borderStyle (works on iOS)
    borderStyle: 'dashed',
  },
  todayDateItem: {
    borderColor: figmaColors.primary,
    backgroundColor: 'transparent',
  },
  dayText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: spacing.xs,
  },
  todayDayText: {
    color: figmaColors.primary,
    fontWeight: '700',
  },
  dateText: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: '#374151',
  },
  todayDateText: {
    color: figmaColors.primary,
    fontWeight: '700',
  },
  todayLabelContainer: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  todayLabel: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: figmaColors.textPrimary,
  },
  calorieCard: {
    backgroundColor: figmaColors.surface,
    borderRadius: 20,
    padding: spacing.xl,
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  calorieHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  calorieTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: figmaColors.textPrimary,
    marginLeft: spacing.sm,
  },
  circularProgressContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  circularProgressOuter: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularProgressInner: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  remainingCalories: {
    fontSize: 42,
    fontWeight: '700',
    color: figmaColors.primary,
  },
  remainingLabel: {
    fontSize: fontSize.md,
    color: '#6B7280',
    marginTop: spacing.xs,
    fontWeight: '500',
  },
  macroGrid: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  macroCard: {
    flex: 1,
    backgroundColor: figmaColors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  macroValue: {
    fontSize: 24,
    fontWeight: '700',
    color: figmaColors.textPrimary,
    marginBottom: spacing.xs,
  },
  macroLabel: {
    fontSize: fontSize.sm,
    color: '#6B7280',
    marginBottom: spacing.md,
    fontWeight: '500',
    textAlign: 'center',
  },
  emojiContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  recentSection: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  recentTitle: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: figmaColors.textPrimary,
    marginBottom: spacing.md,
  },
  foodList: {
    gap: spacing.sm,
  },
  foodItem: {
    backgroundColor: figmaColors.surface,
    borderRadius: componentSize.borderRadius,
    padding: componentSize.cardPadding,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  foodImageContainer: {
    marginRight: spacing.md,
  },
  foodImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    fontSize: fontSize.md,
    color: figmaColors.textPrimary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  foodCalories: {
    fontSize: fontSize.sm,
    color: figmaColors.textPrimary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  foodMacros: {
    fontSize: fontSize.xs,
    color: figmaColors.textSecondary,
  },
  viewButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  viewButtonText: {
    fontSize: fontSize.sm,
    color: figmaColors.primary,
    fontWeight: '600',
  },
  floatingPlusButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: figmaColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
