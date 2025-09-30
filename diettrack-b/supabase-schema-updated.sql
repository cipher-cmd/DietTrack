-- DietTrack Updated Database Schema
-- Run this script in your Supabase SQL Editor

-- Drop existing functions first
DROP FUNCTION IF EXISTS ingredient_lookup(TEXT, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS personal_food_lookup(UUID, TEXT, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_user_stats(UUID) CASCADE;

-- Drop existing tables if they exist (in correct order to handle foreign keys)
DROP TABLE IF EXISTS analysis_feedback CASCADE;
DROP TABLE IF EXISTS user_servings CASCADE;
DROP TABLE IF EXISTS meal_log_items CASCADE;
DROP TABLE IF EXISTS meal_logs CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS ifct_foods CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE (Updated with profile data)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    location VARCHAR(255),
    age INTEGER,
    gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other')),
    height_cm DECIMAL(5,2),
    weight_kg DECIMAL(5,2),
    activity_level VARCHAR(50),
    fitness_goal VARCHAR(50),
    daily_calorie_target INTEGER DEFAULT 2000,
    macro_targets JSONB DEFAULT '{"protein": 140, "carbs": 230, "fats": 54}',
    dietary_preferences TEXT[] DEFAULT '{}',
    allergies TEXT[] DEFAULT '{}',
    free_analyses_used INTEGER DEFAULT 0,
    subscription_status VARCHAR(50) DEFAULT 'free_trial',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. IFCT FOODS TABLE (Indian Food Composition Table)
CREATE TABLE ifct_foods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canonical_name VARCHAR(255) NOT NULL,
    regional_names TEXT[] DEFAULT '{}',
    search_keywords TEXT[] DEFAULT '{}',
    portion_grams DECIMAL(10,2),
    nutrition JSONB,
    category VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. MEAL LOGS TABLE (Main analysis results)
CREATE TABLE meal_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    source VARCHAR(20) NOT NULL CHECK (source IN ('photo', 'text')),
    source_ref VARCHAR(255), -- Reference to uploaded image if applicable
    items JSONB NOT NULL DEFAULT '[]', -- Array of detected food items
    add_ons JSONB NOT NULL DEFAULT '[]', -- Array of additional ingredients
    portion_scalar DECIMAL(5,2) DEFAULT 1.0,
    nutrition_total JSONB NOT NULL DEFAULT '{}', -- Total nutrition summary
    nutrition_breakdown JSONB NOT NULL DEFAULT '{}', -- Detailed breakdown
    summary TEXT,
    logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. MEAL LOG ITEMS TABLE (Individual food items in a meal)
CREATE TABLE meal_log_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meal_log_id UUID REFERENCES meal_logs(id) ON DELETE CASCADE,
    item_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    confidence DECIMAL(3,2),
    portion_grams DECIMAL(10,2),
    nutrition JSONB,
    cooking_method VARCHAR(100),
    ingredients TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. USER SERVINGS TABLE (Custom serving sizes per user)
CREATE TABLE user_servings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    ingredient_id UUID REFERENCES ifct_foods(id) ON DELETE CASCADE,
    recipe_id UUID, -- For future recipe support
    label VARCHAR(100) NOT NULL, -- e.g., "1 bowl", "1 cup"
    grams DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. ANALYSIS FEEDBACK TABLE
CREATE TABLE analysis_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    analysis_id UUID NOT NULL, -- References meal_logs.id
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    helpful BOOLEAN,
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(analysis_id, user_id)
);

-- 7. USER DAILY STATS TABLE (Daily nutrition tracking)
CREATE TABLE user_daily_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    calories_consumed INTEGER DEFAULT 0,
    calories_burned INTEGER DEFAULT 0,
    protein_consumed DECIMAL(8,2) DEFAULT 0,
    carbs_consumed DECIMAL(8,2) DEFAULT 0,
    fats_consumed DECIMAL(8,2) DEFAULT 0,
    fiber_consumed DECIMAL(8,2) DEFAULT 0,
    sugar_consumed DECIMAL(8,2) DEFAULT 0,
    sodium_consumed DECIMAL(8,2) DEFAULT 0,
    water_intake_ml INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Create indexes for better performance
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_subscription ON users(subscription_status);

CREATE INDEX idx_ifct_foods_canonical_name ON ifct_foods(canonical_name);
CREATE INDEX idx_ifct_foods_regional_names ON ifct_foods USING GIN(regional_names);
CREATE INDEX idx_ifct_foods_search_keywords ON ifct_foods USING GIN(search_keywords);
CREATE INDEX idx_ifct_foods_category ON ifct_foods(category);

CREATE INDEX idx_meal_logs_user_id ON meal_logs(user_id);
CREATE INDEX idx_meal_logs_logged_at ON meal_logs(logged_at);
CREATE INDEX idx_meal_logs_source ON meal_logs(source);

CREATE INDEX idx_meal_log_items_meal_log_id ON meal_log_items(meal_log_id);
CREATE INDEX idx_meal_log_items_item_id ON meal_log_items(item_id);

CREATE INDEX idx_user_servings_user_id ON user_servings(user_id);
CREATE INDEX idx_user_servings_ingredient_id ON user_servings(ingredient_id);

CREATE INDEX idx_analysis_feedback_analysis_id ON analysis_feedback(analysis_id);
CREATE INDEX idx_analysis_feedback_user_id ON analysis_feedback(user_id);

CREATE INDEX idx_user_daily_stats_user_id ON user_daily_stats(user_id);
CREATE INDEX idx_user_daily_stats_date ON user_daily_stats(date);
CREATE INDEX idx_user_daily_stats_user_date ON user_daily_stats(user_id, date);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to all tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ifct_foods_updated_at BEFORE UPDATE ON ifct_foods
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meal_logs_updated_at BEFORE UPDATE ON meal_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meal_log_items_updated_at BEFORE UPDATE ON meal_log_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_servings_updated_at BEFORE UPDATE ON user_servings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analysis_feedback_updated_at BEFORE UPDATE ON analysis_feedback
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_daily_stats_updated_at BEFORE UPDATE ON user_daily_stats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Helper function to get user's daily nutrition stats
CREATE OR REPLACE FUNCTION get_user_daily_stats(p_user_id UUID, p_date DATE)
RETURNS TABLE (
    calories_consumed INTEGER,
    protein_consumed DECIMAL(8,2),
    carbs_consumed DECIMAL(8,2),
    fats_consumed DECIMAL(8,2),
    fiber_consumed DECIMAL(8,2),
    sugar_consumed DECIMAL(8,2),
    sodium_consumed DECIMAL(8,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(uds.calories_consumed, 0)::INTEGER,
        COALESCE(uds.protein_consumed, 0),
        COALESCE(uds.carbs_consumed, 0),
        COALESCE(uds.fats_consumed, 0),
        COALESCE(uds.fiber_consumed, 0),
        COALESCE(uds.sugar_consumed, 0),
        COALESCE(uds.sodium_consumed, 0)
    FROM user_daily_stats uds
    WHERE uds.user_id = p_user_id AND uds.date = p_date
    UNION ALL
    SELECT 0, 0, 0, 0, 0, 0, 0
    WHERE NOT EXISTS (
        SELECT 1 FROM user_daily_stats 
        WHERE user_id = p_user_id AND date = p_date
    )
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Helper function to get user's recent meal logs
CREATE OR REPLACE FUNCTION get_user_recent_meals(p_user_id UUID, p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
    id UUID,
    source VARCHAR(20),
    summary TEXT,
    nutrition_total JSONB,
    logged_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ml.id,
        ml.source,
        ml.summary,
        ml.nutrition_total,
        ml.logged_at
    FROM meal_logs ml
    WHERE ml.user_id = p_user_id
    ORDER BY ml.logged_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Insert sample data for testing
INSERT INTO users (id, phone, name, email, age, gender, height_cm, weight_kg, activity_level, fitness_goal, daily_calorie_target, macro_targets) VALUES
('550e8400-e29b-41d4-a716-446655440000', '+1234567890', 'Test User', 'test@example.com', 25, 'male', 175.0, 70.0, 'moderate', 'maintain', 2000, '{"protein": 140, "carbs": 230, "fats": 54}');

-- Insert sample IFCT food data
INSERT INTO ifct_foods (canonical_name, regional_names, search_keywords, portion_grams, nutrition, category) VALUES
('Rice, white, cooked', ARRAY['Chawal', 'Bhat'], ARRAY['rice', 'white rice', 'cooked rice'], 100, '{"calories": 130, "protein": 2.7, "carbs": 28, "fat": 0.3, "fiber": 0.4, "sugar": 0.1, "sodium": 1}', 'Grains'),
('Chicken, breast, grilled', ARRAY['Murgh', 'Chicken'], ARRAY['chicken', 'breast', 'grilled', 'protein'], 100, '{"calories": 165, "protein": 31, "carbs": 0, "fat": 3.6, "fiber": 0, "sugar": 0, "sodium": 74}', 'Meat'),
('Apple, raw', ARRAY['Seb', 'Apple'], ARRAY['apple', 'fruit', 'raw'], 100, '{"calories": 52, "protein": 0.3, "carbs": 14, "fat": 0.2, "fiber": 2.4, "sugar": 10, "sodium": 1}', 'Fruits');

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_log_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_servings ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_daily_stats ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only access their own data
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid()::text = id::text);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid()::text = id::text);
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid()::text = id::text);

-- Meal logs policies
CREATE POLICY "Users can view own meal logs" ON meal_logs FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert own meal logs" ON meal_logs FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update own meal logs" ON meal_logs FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Meal log items policies
CREATE POLICY "Users can view own meal log items" ON meal_log_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM meal_logs WHERE id = meal_log_id AND user_id::text = auth.uid()::text)
);
CREATE POLICY "Users can insert own meal log items" ON meal_log_items FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM meal_logs WHERE id = meal_log_id AND user_id::text = auth.uid()::text)
);

-- User servings policies
CREATE POLICY "Users can view own servings" ON user_servings FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert own servings" ON user_servings FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update own servings" ON user_servings FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Analysis feedback policies
CREATE POLICY "Users can view own feedback" ON analysis_feedback FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert own feedback" ON analysis_feedback FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- User daily stats policies
CREATE POLICY "Users can view own daily stats" ON user_daily_stats FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert own daily stats" ON user_daily_stats FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update own daily stats" ON user_daily_stats FOR UPDATE USING (auth.uid()::text = user_id::text);

-- IFCT foods are public (read-only for all users)
CREATE POLICY "IFCT foods are publicly readable" ON ifct_foods FOR SELECT USING (true);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
