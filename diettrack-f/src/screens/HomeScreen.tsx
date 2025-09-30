import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { AppGradient } from '../components/AppGradient';
import { Icon } from '../components/icons/Icons';
import { ActionSheet } from '../components/ui/ActionSheet';
import { EmptyState } from '../components/EmptyState';
import { figmaColors } from '../theme/figma-colors';
import { mobileStyles, getResponsiveStyle } from '../styles/mobile-optimized';
import { spacing, fontSize, componentSize } from '../utils/responsive';
import {
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
}

const { width } = Dimensions.get('window');

export default function HomeScreen({
  onNavigateToCamera,
  onNavigateToTextEntry,
  onNavigateToResults,
}: Props) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showActionSheet, setShowActionSheet] = useState(false);

  // User data - will be fetched from backend
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStats | null>(null);
  const [recentFoods, setRecentFoods] = useState<RecentMeal[]>([]);
  const [loading, setLoading] = useState(true);

  // For demo purposes - in real app, this would come from authentication
  const DEMO_USER_ID = '550e8400-e29b-41d4-a716-446655440000';

  // Fetch user data on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);

        // For now, use mock data since backend is having issues
        // TODO: Replace with real API calls when backend is stable
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API delay

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

        // Uncomment these lines when backend is stable:
        // const [profile, stats, meals] = await Promise.all([
        //   getUserProfile(DEMO_USER_ID),
        //   getUserDailyStats(DEMO_USER_ID),
        //   getUserRecentMeals(DEMO_USER_ID, 5),
        // ]);
        // setUserProfile(profile);
        // setDailyStats(stats);
        // setRecentFoods(meals);
      } catch (error) {
        console.error('Error fetching user data:', error);
        // Set fallback data on error
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

  // Memoize expensive calculations
  const remainingCalories = useMemo(() => {
    if (!userProfile || !dailyStats) return 2000;
    return Math.max(
      0,
      userProfile.daily_calorie_target - dailyStats.calories_consumed
    );
  }, [userProfile, dailyStats]);

  const progress = useMemo(() => {
    if (!userProfile || !dailyStats) return 0;
    return userProfile.daily_calorie_target > 0
      ? dailyStats.calories_consumed / userProfile.daily_calorie_target
      : 0;
  }, [userProfile, dailyStats]);

  const macroData = useMemo(() => {
    if (!userProfile || !dailyStats) {
      return {
        protein: { consumed: 0, target: 140, unit: 'g' },
        carbs: { consumed: 0, target: 230, unit: 'g' },
        fats: { consumed: 0, target: 54, unit: 'g' },
      };
    }

    return {
      protein: {
        consumed: dailyStats.protein_consumed,
        target: userProfile.macro_targets.protein,
        unit: 'g',
      },
      carbs: {
        consumed: dailyStats.carbs_consumed,
        target: userProfile.macro_targets.carbs,
        unit: 'g',
      },
      fats: {
        consumed: dailyStats.fats_consumed,
        target: userProfile.macro_targets.fats,
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

  return (
    <AppGradient>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appTitle}>DietTrack</Text>
          <Text style={styles.appSubtitle}>AI-Powered Nutrition Analysis</Text>
        </View>

        {/* Date Picker */}
        <View style={styles.datePicker}>
          {weekDays.map((day, index) => (
            <Pressable
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
            </Pressable>
          ))}
        </View>

        {/* Calories Card */}
        <View style={styles.caloriesCard}>
          <Text style={styles.caloriesTitle}>Calories</Text>
          <View style={styles.caloriesContent}>
            <View style={styles.caloriesCircle}>
              <View style={styles.caloriesInner}>
                <Text style={styles.remainingText}>{remainingCalories}</Text>
                <Text style={styles.remainingLabel}>Remaining</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Macro Cards */}
        <View style={styles.macroCards}>
          <View style={styles.macroCard}>
            <Icon name="protein" size={20} color={figmaColors.primary} />
            <Text style={styles.macroText}>
              {macroData.protein.target}g Protein left
            </Text>
          </View>

          <View style={styles.macroCard}>
            <Icon name="carbs" size={20} color={figmaColors.primary} />
            <Text style={styles.macroText}>
              {macroData.carbs.target}g Carbs left
            </Text>
          </View>

          <View style={styles.macroCard}>
            <Icon name="fats" size={20} color={figmaColors.primary} />
            <Text style={styles.macroText}>
              {macroData.fats.target}g Fats left
            </Text>
          </View>
        </View>

        {/* Recently Uploaded Section */}
        <View style={styles.recentSection}>
          <Text style={styles.recentTitle}>Recently uploaded</Text>

          {recentFoods.length === 0 ? (
            <EmptyState
              title="Ready to start tracking?"
              subtitle="Take a photo of your meal to get started with AI-powered nutrition analysis"
              buttonText="Add Your First Meal"
              onButtonPress={handleAddFood}
              icon="plate"
            />
          ) : (
            <View style={styles.foodList}>
              {recentFoods.map((food, index) => (
                <View key={index} style={styles.foodItem}>
                  <Text style={styles.foodName}>{food.name}</Text>
                  <Text style={styles.foodCalories}>
                    {food.calories} calories
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <Pressable style={styles.navItem}>
          <Icon name="home" size={24} color={figmaColors.primary} />
          <Text style={[styles.navText, { color: figmaColors.primary }]}>
            Home
          </Text>
        </Pressable>

        <Pressable style={styles.addButton} onPress={handleAddFood}>
          <Icon name="plus" size={24} color={figmaColors.surface} />
        </Pressable>

        <Pressable style={styles.navItem}>
          <Icon name="settings" size={24} color={figmaColors.textSecondary} />
          <Text style={styles.navText}>Settings</Text>
        </Pressable>
      </View>

      {/* Action Sheet */}
      <ActionSheet
        visible={showActionSheet}
        onClose={() => setShowActionSheet(false)}
        onUploadFromGallery={handleUploadFromGallery}
        onTakePhoto={handleTakePhoto}
        onTextEntry={handleTextEntry}
      />
    </AppGradient>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: figmaColors.primary,
    marginBottom: 4,
  },
  appSubtitle: {
    fontSize: 16,
    color: figmaColors.textSecondary,
  },
  datePicker: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  dateItem: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  todayDateItem: {
    backgroundColor: figmaColors.primary,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
    color: figmaColors.textSecondary,
    marginBottom: 4,
  },
  todayDayText: {
    color: figmaColors.surface,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: figmaColors.textPrimary,
  },
  todayDateText: {
    color: figmaColors.surface,
  },
  caloriesCard: {
    backgroundColor: figmaColors.surface,
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  caloriesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: figmaColors.textPrimary,
    marginBottom: 16,
  },
  caloriesContent: {
    alignItems: 'center',
  },
  caloriesCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 8,
    borderColor: figmaColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caloriesInner: {
    alignItems: 'center',
  },
  remainingText: {
    fontSize: 24,
    fontWeight: '700',
    color: figmaColors.primary,
  },
  remainingLabel: {
    fontSize: 14,
    color: figmaColors.textSecondary,
    marginTop: 4,
  },
  macroCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  macroCard: {
    flex: 1,
    backgroundColor: figmaColors.surface,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  macroText: {
    fontSize: 12,
    fontWeight: '500',
    color: figmaColors.textPrimary,
    marginTop: 8,
    textAlign: 'center',
  },
  recentSection: {
    paddingHorizontal: 20,
    marginBottom: 100,
  },
  recentTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: figmaColors.textPrimary,
    marginBottom: 16,
  },
  emptyState: {
    backgroundColor: figmaColors.surface,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: figmaColors.textPrimary,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: figmaColors.textSecondary,
  },
  foodList: {
    gap: 12,
  },
  foodItem: {
    backgroundColor: figmaColors.surface,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  foodName: {
    fontSize: 16,
    fontWeight: '500',
    color: figmaColors.textPrimary,
  },
  foodCalories: {
    fontSize: 14,
    color: figmaColors.textSecondary,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: figmaColors.surface,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    paddingBottom: 34, // Account for home indicator
    borderTopWidth: 1,
    borderTopColor: figmaColors.border,
  },
  navItem: {
    alignItems: 'center',
    flex: 1,
  },
  navText: {
    fontSize: 12,
    fontWeight: '500',
    color: figmaColors.textSecondary,
    marginTop: 4,
  },
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: figmaColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: figmaColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
