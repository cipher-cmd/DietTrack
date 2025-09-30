-- DietTrack Complete Database Schema
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

-- 1. USERS TABLE
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255),
    location VARCHAR(255),
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

-- Create indexes for better performance
CREATE INDEX idx_users_phone ON users(phone);
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

-- Insert sample IFCT foods data
INSERT INTO ifct_foods (canonical_name, regional_names, search_keywords, portion_grams, nutrition, category) VALUES
('Rice, white, cooked', ARRAY['chawal', 'bhaat'], ARRAY['rice', 'white rice', 'cooked rice'], 100, 
 '{"calories": 130, "protein": 2.7, "carbs": 28, "fat": 0.3, "fiber": 0.4, "sugar": 0.1, "sodium": 1, "cholesterol": 0}', 'grains'),

('Dal, moong, cooked', ARRAY['moong dal', 'green gram dal'], ARRAY['dal', 'lentils', 'moong', 'green gram'], 100,
 '{"calories": 105, "protein": 7.2, "carbs": 19, "fat": 0.4, "fiber": 7.6, "sugar": 2.0, "sodium": 2, "cholesterol": 0}', 'pulses'),

('Roti, wheat', ARRAY['chapati', 'phulka'], ARRAY['roti', 'chapati', 'wheat bread', 'phulka'], 50,
 '{"calories": 104, "protein": 3.1, "carbs": 20, "fat": 1.2, "fiber": 2.7, "sugar": 0.4, "sodium": 190, "cholesterol": 0}', 'grains'),

('Paneer', ARRAY['cottage cheese'], ARRAY['paneer', 'cottage cheese', 'indian cheese'], 100,
 '{"calories": 265, "protein": 18, "carbs": 1.2, "fat": 20, "fiber": 0, "sugar": 1.2, "sodium": 15, "cholesterol": 0}', 'dairy'),

('Ghee', ARRAY['clarified butter'], ARRAY['ghee', 'clarified butter'], 15,
 '{"calories": 135, "protein": 0, "carbs": 0, "fat": 15, "fiber": 0, "sugar": 0, "sodium": 0, "cholesterol": 0}', 'fats'),

('Onion, raw', ARRAY['pyaz', 'kanda'], ARRAY['onion', 'pyaz', 'kanda'], 100,
 '{"calories": 40, "protein": 1.1, "carbs": 9.3, "fat": 0.1, "fiber": 1.7, "sugar": 4.2, "sodium": 4, "cholesterol": 0}', 'vegetables'),

('Tomato, raw', ARRAY['tamatar'], ARRAY['tomato', 'tamatar'], 100,
 '{"calories": 18, "protein": 0.9, "carbs": 3.9, "fat": 0.2, "fiber": 1.2, "sugar": 2.6, "sodium": 5, "cholesterol": 0}', 'vegetables'),

('Potato, boiled', ARRAY['aloo', 'boiled potato'], ARRAY['potato', 'aloo', 'boiled'], 100,
 '{"calories": 87, "protein": 1.9, "carbs": 20, "fat": 0.1, "fiber": 1.8, "sugar": 0.9, "sodium": 6, "cholesterol": 0}', 'vegetables'),

('Chicken, cooked', ARRAY['murgh', 'chicken curry'], ARRAY['chicken', 'murgh', 'poultry'], 100,
 '{"calories": 165, "protein": 31, "carbs": 0, "fat": 3.6, "fiber": 0, "sugar": 0, "sodium": 74, "cholesterol": 85}', 'meat'),

('Milk, whole', ARRAY['doodh'], ARRAY['milk', 'doodh', 'whole milk'], 100,
 '{"calories": 61, "protein": 3.2, "carbs": 4.8, "fat": 3.3, "fiber": 0, "sugar": 4.8, "sodium": 40, "cholesterol": 10}', 'dairy');

-- Create RLS (Row Level Security) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_log_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_servings ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_feedback ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (adjust based on your auth requirements)
CREATE POLICY "Users can view their own data" ON users
    FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update their own data" ON users
    FOR UPDATE USING (auth.uid()::text = id::text);

CREATE POLICY "Users can view their own meal logs" ON meal_logs
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own meal logs" ON meal_logs
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view their own meal log items" ON meal_log_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM meal_logs 
            WHERE meal_logs.id = meal_log_items.meal_log_id 
            AND meal_logs.user_id::text = auth.uid()::text
        )
    );

CREATE POLICY "Users can view their own user servings" ON user_servings
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can manage their own user servings" ON user_servings
    FOR ALL USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view their own feedback" ON analysis_feedback
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own feedback" ON analysis_feedback
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Create a function to get user stats (used by the backend)
CREATE OR REPLACE FUNCTION get_user_stats(user_uuid UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_analyses', COALESCE(COUNT(ml.id), 0),
        'total_feedback_given', COALESCE(COUNT(af.id), 0)
    ) INTO result
    FROM users u
    LEFT JOIN meal_logs ml ON u.id = ml.user_id
    LEFT JOIN analysis_feedback af ON u.id = af.user_id
    WHERE u.id = user_uuid
    GROUP BY u.id;
    
    RETURN COALESCE(result, '{"total_analyses": 0, "total_feedback_given": 0}'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function for ingredient lookup (used by the backend)
CREATE OR REPLACE FUNCTION ingredient_lookup(search_term TEXT, result_limit INTEGER DEFAULT 8)
RETURNS TABLE (
    ingredient_id UUID,
    name TEXT,
    calories_per_100g DECIMAL,
    protein_per_100g DECIMAL,
    carbs_per_100g DECIMAL,
    fat_per_100g DECIMAL,
    servings JSONB,
    confidence DECIMAL,
    source TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        if.id as ingredient_id,
        if.canonical_name as name,
        (if.nutrition->>'calories')::DECIMAL as calories_per_100g,
        (if.nutrition->>'protein')::DECIMAL as protein_per_100g,
        (if.nutrition->>'carbs')::DECIMAL as carbs_per_100g,
        (if.nutrition->>'fat')::DECIMAL as fat_per_100g,
        jsonb_build_array(
            jsonb_build_object('label', '100g', 'grams', 100),
            jsonb_build_object('label', '1 serving', 'grams', COALESCE(if.portion_grams, 100))
        ) as servings,
        0.8::DECIMAL as confidence,
        'ifct'::TEXT as source
    FROM ifct_foods if
    WHERE 
        if.canonical_name ILIKE '%' || search_term || '%'
        OR search_term = ANY(if.regional_names)
        OR search_term = ANY(if.search_keywords)
    ORDER BY 
        CASE 
            WHEN if.canonical_name ILIKE search_term THEN 1
            WHEN if.canonical_name ILIKE '%' || search_term || '%' THEN 2
            ELSE 3
        END,
        if.canonical_name
    LIMIT result_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function for personal food lookup (user-specific servings)
CREATE OR REPLACE FUNCTION personal_food_lookup(user_uuid UUID, search_term TEXT, result_limit INTEGER DEFAULT 8)
RETURNS TABLE (
    ingredient_id UUID,
    name TEXT,
    calories_per_100g DECIMAL,
    protein_per_100g DECIMAL,
    carbs_per_100g DECIMAL,
    fat_per_100g DECIMAL,
    servings JSONB,
    confidence DECIMAL,
    source TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        if.id as ingredient_id,
        if.canonical_name as name,
        (if.nutrition->>'calories')::DECIMAL as calories_per_100g,
        (if.nutrition->>'protein')::DECIMAL as protein_per_100g,
        (if.nutrition->>'carbs')::DECIMAL as carbs_per_100g,
        (if.nutrition->>'fat')::DECIMAL as fat_per_100g,
        COALESCE(
            jsonb_agg(
                jsonb_build_object('label', us.label, 'grams', us.grams)
                ORDER BY us.grams DESC
            ) FILTER (WHERE us.id IS NOT NULL),
            jsonb_build_array(
                jsonb_build_object('label', '100g', 'grams', 100),
                jsonb_build_object('label', '1 serving', 'grams', COALESCE(if.portion_grams, 100))
            )
        ) as servings,
        0.9::DECIMAL as confidence,
        'personal'::TEXT as source
    FROM ifct_foods if
    LEFT JOIN user_servings us ON if.id = us.ingredient_id AND us.user_id = user_uuid
    WHERE 
        if.canonical_name ILIKE '%' || search_term || '%'
        OR search_term = ANY(if.regional_names)
        OR search_term = ANY(if.search_keywords)
    GROUP BY if.id, if.canonical_name, if.nutrition, if.portion_grams
    ORDER BY 
        CASE 
            WHEN if.canonical_name ILIKE search_term THEN 1
            WHEN if.canonical_name ILIKE '%' || search_term || '%' THEN 2
            ELSE 3
        END,
        if.canonical_name
    LIMIT result_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Success message
SELECT 'DietTrack database schema created successfully!' as message;
