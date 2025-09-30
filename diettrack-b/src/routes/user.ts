// src/routes/user.ts
import { Router, type RequestHandler, Request, Response } from 'express';
import { getSupabase } from '@/database/supabase';
import logger from '@/utils/logger';

const router = Router();

// Async wrapper so thrown/rejected errors hit errorHandler
const wrap = <T extends RequestHandler>(fn: T): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Get user profile
export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const supabase = getSupabase();

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      logger.error('Error fetching user profile:', error);
      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      });
    }

    return res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        age: user.age,
        gender: user.gender,
        height_cm: user.height_cm,
        weight_kg: user.weight_kg,
        activity_level: user.activity_level,
        fitness_goal: user.fitness_goal,
        daily_calorie_target: user.daily_calorie_target,
        macro_targets: user.macro_targets,
        dietary_preferences: user.dietary_preferences,
        allergies: user.allergies,
        subscription_status: user.subscription_status,
      },
    });
  } catch (error) {
    logger.error('Error in getUserProfile:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
  }
};

// Get user's daily stats
export const getUserDailyStats = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { date } = req.query;

    const targetDate = date ? new Date(date as string) : new Date();
    const dateString = targetDate.toISOString().split('T')[0];

    const supabase = getSupabase();

    const { data: stats, error } = await supabase
      .from('user_daily_stats')
      .select('*')
      .eq('user_id', userId)
      .eq('date', dateString)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      logger.error('Error fetching daily stats:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch daily stats',
        code: 'FETCH_ERROR',
      });
    }

    // Return default values if no stats found
    const defaultStats = {
      calories_consumed: 0,
      protein_consumed: 0,
      carbs_consumed: 0,
      fats_consumed: 0,
      fiber_consumed: 0,
      sugar_consumed: 0,
      sodium_consumed: 0,
      water_intake_ml: 0,
    };

    return res.json({
      success: true,
      data: stats || defaultStats,
    });
  } catch (error) {
    logger.error('Error in getUserDailyStats:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
  }
};

// Get user's recent meals
export const getUserRecentMeals = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { limit = 10 } = req.query;

    const supabase = getSupabase();

    const { data: meals, error } = await supabase
      .from('meal_logs')
      .select(
        `
        id,
        source,
        summary,
        nutrition_total,
        logged_at,
        items
      `
      )
      .eq('user_id', userId)
      .order('logged_at', { ascending: false })
      .limit(parseInt(limit as string));

    if (error) {
      logger.error('Error fetching recent meals:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch recent meals',
        code: 'FETCH_ERROR',
      });
    }

    // Transform the data to match frontend expectations
    const transformedMeals = meals.map((meal) => {
      const firstItem = meal.items?.[0] || {};
      return {
        id: meal.id,
        name: firstItem.name || meal.summary || 'Unknown Food',
        calories: meal.nutrition_total?.calories || 0,
        protein: meal.nutrition_total?.protein || 0,
        carbs: meal.nutrition_total?.carbs || 0,
        fat: meal.nutrition_total?.fat || 0,
        image: firstItem.image_url || null,
        loggedAt: meal.logged_at,
      };
    });

    return res.json({
      success: true,
      data: transformedMeals,
    });
  } catch (error) {
    logger.error('Error in getUserRecentMeals:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
  }
};

// Update user profile
export const updateUserProfile = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      logger.error('Error updating user profile:', error);
      return res.status(400).json({
        success: false,
        error: 'Failed to update profile',
        code: 'UPDATE_ERROR',
      });
    }

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error('Error in updateUserProfile:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
  }
};

// Routes
router.get('/:userId/profile', wrap(getUserProfile));
router.get('/:userId/daily-stats', wrap(getUserDailyStats));
router.get('/:userId/recent-meals', wrap(getUserRecentMeals));
router.put('/:userId/profile', wrap(updateUserProfile));

export default router;
