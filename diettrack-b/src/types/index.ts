// src/types/index.ts

/**
 * Core type definitions for DietTrack – AI-powered Indian food nutrition analysis
 * Production-ready, aligned with current controllers/services.
 */

/** Individual food item detected in an image with complete nutrition analysis */
export interface DetectedFoodItem {
  /** Unique item identifier within the analysis (stable across adjustments) */
  readonly itemId: number;
  /** Primary food name (English/Hindi) */
  name: string;
  /** Regional/local name variant */
  regionalName?: string;
  /** AI confidence score for this detection (0.0 to 1.0) */
  confidence: number;
  /** Bounding box coordinates in the image */
  region: BoundingBox;
  /** Complete nutritional information (per current portion) */
  nutrition: NutritionFacts;
  /** Alternative food name suggestions */
  alternatives: readonly string[];
  /** Estimated portion size and weight */
  portionSize: PortionEstimate;
  /** Detected or inferred cooking method */
  cookingMethod?: CookingMethod;
  /** Identified ingredients list */
  ingredients: readonly string[];
}

/** User account and profile information */
export interface User extends BaseEntity {
  /** User's phone number (primary identifier) */
  phone: string;
  /** Display name (optional during onboarding) */
  name?: string;
  /** Geographic location for regional food preferences */
  location: string;
  /** User's dietary restrictions and preferences */
  dietaryPreferences: readonly DietaryPreference[];
  /** Known food allergies and intolerances */
  allergies: readonly string[];
  /** Number of free analyses used in current period */
  freeAnalysesUsed: number;
  /** Current subscription tier */
  subscriptionStatus: SubscriptionStatus;
}

/** Complete food analysis record with metadata */
export interface FoodAnalysis extends BaseEntity {
  /** User who requested the analysis */
  readonly userId: string;
  /** SHA-256 hash of the analyzed image */
  readonly imageHash: string;
  /** Array of detected food items with nutrition data */
  detectedItems: readonly DetectedFoodItem[];
  /** Overall confidence score (0.0 to 1.0) */
  confidenceScore: number;
  /** Processing time in milliseconds */
  processingTimeMs: number;
  /** Whether user provided feedback */
  feedbackReceived: boolean;
}

/** Portion size estimation with confidence bounds */
export interface PortionEstimate {
  /** Estimated weight in grams */
  estimatedGrams: number;
  /** Confidence range for the estimate */
  confidenceRange: {
    /** Minimum probable weight */
    min: number;
    /** Maximum probable weight */
    max: number;
  };
  /** Reference object used for scale detection */
  referenceDetected?: ReferenceObject;
  /** Categorical size classification */
  servingSizeCategory: ServingSize;
}

/** Bounding box coordinates for detected items in images */
export interface BoundingBox {
  /** X-coordinate of top-left corner */
  x: number;
  /** Y-coordinate of top-left corner */
  y: number;
  /** Bounding box width */
  width: number;
  /** Bounding box height */
  height: number;
}

/** Result from AI analysis providers (Google Vision, Gemini, etc.) */
export interface AIAnalysisResult {
  /** AI service provider used */
  provider: AIProvider;
  /** Detected food items from analysis */
  detectedItems: readonly DetectedFoodItem[];
  /** Overall analysis confidence (0.0 to 1.0) */
  confidence: number;
  /** Processing time in milliseconds */
  processingTimeMs: number;
  /** Raw response from AI provider (for debugging) */
  rawResponse?: unknown;
}

/** Indian Food Composition Table (IFCT) database entry */
export interface IFCTFood {
  /** Database record ID */
  readonly id: number;
  /** Standard food name in IFCT database */
  foodName: string;
  /** Regional name variations */
  regionalNames: readonly string[];
  /** Food category classification */
  category: FoodCategory;
  /** Nutritional data per 100g serving */
  nutritionPer100g: NutritionFacts;
  /** Cooking method variations and their nutritional impacts */
  cookingVariations: readonly CookingVariation[];
  /** Known allergens in this food */
  allergens: readonly string[];
  /** Vegetarian food flag */
  isVegetarian: boolean;
  /** Vegan food flag */
  isVegan: boolean;
  /** Primary Indian region where commonly consumed */
  region: IndianRegion;
  /** Common portion sizes with traditional utensils */
  commonPortions: readonly CommonPortion[];
  /** Keywords for search optimization */
  searchKeywords?: readonly string[];
}

/** Cooking method variation effects on nutrition */
export interface CookingVariation {
  /** Cooking method name */
  method: CookingMethod;
  /** Oil/fat multiplication factor */
  oilFactor: number;
  /** Spice impact factor */
  spiceFactor: number;
  /** Nutrient retention percentage (0.0 to 1.0) */
  nutrientRetention: number;
  /** Calorie modification factor */
  calorieModifier: number;
}

/** Common portion size with traditional Indian utensils */
export interface CommonPortion {
  /** Human-readable portion description */
  description: string;
  /** Weight in grams */
  grams: number;
  /** Traditional utensil used for serving */
  utensil: TraditionalUtensil;
}

/** User feedback on analysis accuracy */
export interface FeedbackData extends BaseEntity {
  /** Associated analysis ID */
  readonly analysisId: string;
  /** User providing feedback */
  readonly userId: string;
  /** Specific corrections for detected items */
  corrections: readonly ItemCorrection[];
  /** Overall satisfaction rating (1-5) */
  overallRating: number;
  /** Optional user comments */
  comments?: string;
}

/** Correction data for individual detected items */
export interface ItemCorrection {
  /** Item ID being corrected */
  readonly itemId: number;
  /** Correct food name (if different) */
  correctName?: string;
  /** Correct portion size in grams */
  correctPortion?: number;
  /** Correct ingredients list */
  correctIngredients?: readonly string[];
  /** Additional user notes */
  userNotes?: string;
}

/** API request for food analysis */
export interface AnalysisRequest {
  /** Base64-encoded image data (optional; text-only prompt is supported) */
  image?: string;
  /** User context for personalized analysis (all fields optional) */
  userContext?: UserContext;
  /** Optional reference object for scale */
  referenceObject?: ReferenceObject;
}

/** User context for personalized analysis */
export interface UserContext {
  /** Optional free-form prompt (e.g., "1 bowl rice") */
  prompt?: string;
  /** User's geographic location */
  location?: string;
  /** Dietary preferences and restrictions */
  dietaryPrefs?: readonly DietaryPreference[];
  /** Known allergies */
  allergies?: readonly string[];
  /** User's preferred language (optional) */
  language?: SupportedLanguage;
}

/** API response for food analysis */
export interface AnalysisResponse {
  /** Unique analysis identifier */
  readonly analysisId: string;
  /** Detected food items with nutrition data */
  detectedItems: readonly DetectedFoodItem[];
  /** Overall confidence score */
  overallConfidence: number;
  /** Human-readable processing time */
  processing_time: string;
  /** Helpful suggestions for user */
  suggestions?: readonly string[];
  /** Important warnings (allergies, etc.) */
  warnings?: readonly string[];
  /** Analysis metadata */
  metadata?: AnalysisMetadata;
}

/** Additional analysis metadata */
export interface AnalysisMetadata {
  /** AI model versions used */
  modelVersions: Record<AIProvider, string>;
  /** Number of reference objects detected */
  referenceObjectsFound: number;
  /** Image quality score */
  imageQualityScore?: number;
}

/** Comprehensive nutritional information per serving */
export interface NutritionFacts {
  /** Energy content in kilocalories */
  calories: number;
  /** Protein content in grams */
  protein: number;
  /** Carbohydrate content in grams */
  carbs: number;
  /** Total fat content in grams */
  fat: number;
  /** Dietary fiber in grams */
  fiber: number;
  /** Sugar content in grams */
  sugar: number;
  /** Sodium content in milligrams */
  sodium: number;
  /** Cholesterol content in milligrams */
  cholesterol: number;
  /** Calcium content in milligrams (optional micronutrient) */
  calcium?: number;
  /** Iron content in milligrams (optional micronutrient) */
  iron?: number;
  /** Vitamin C content in milligrams (optional micronutrient) */
  vitaminC?: number;
  /** Saturated fat content in grams (optional) */
  saturatedFat?: number;
  /** Trans fat content in grams (optional) */
  transFat?: number;
}

// ============================================================================
// TYPE UNIONS AND ENUMS
// ============================================================================

/** Supported dietary preferences in Indian context */
export type DietaryPreference =
  | 'vegetarian'
  | 'vegan'
  | 'jain'
  | 'non_vegetarian'
  | 'eggetarian'
  | 'lactose_intolerant'
  | 'gluten_free';

/** User subscription tiers */
export type SubscriptionStatus =
  | 'free_trial'
  | 'premium'
  | 'expired'
  | 'lifetime';

/** Indian geographical regions for food preferences */
export type IndianRegion =
  | 'north'
  | 'south'
  | 'east'
  | 'west'
  | 'central'
  | 'northeast';

/** AI service providers */
export type AIProvider =
  | 'google_vision'
  | 'gemini'
  | 'openai'
  | 'anthropic'
  | 'vision';

/** Cooking methods affecting nutrition */
export type CookingMethod =
  | 'raw'
  | 'boiled'
  | 'steamed'
  | 'fried'
  | 'deep_fried'
  | 'grilled'
  | 'roasted'
  | 'pressure_cooked'
  | 'tandoor'
  | 'fermented';

/** Reference objects for portion estimation */
export type ReferenceObject =
  | 'katori'
  | 'plate'
  | 'coin_10_rupee'
  | 'spoon_steel'
  | 'phone'
  | 'bowl'
  | 'hand';

/** Serving size categories (constrained to values used by controllers) */
export type ServingSize = 'small' | 'medium' | 'large';

/** Traditional Indian utensils */
export type TraditionalUtensil =
  | 'katori'
  | 'plate'
  | 'bowl'
  | 'glass'
  | 'cup'
  | 'spoon'
  | 'handful';

/** Food categories */
export type FoodCategory =
  | 'grains'
  | 'legumes'
  | 'vegetables'
  | 'fruits'
  | 'dairy'
  | 'meat_poultry'
  | 'fish_seafood'
  | 'sweets_desserts'
  | 'beverages'
  | 'snacks'
  | 'prepared_foods';

/** Supported languages */
export type SupportedLanguage = 'en' | 'hi' | 'te' | 'ta' | 'bn' | 'mr' | 'gu';

// ============================================================================
// UTILITY TYPES
// ============================================================================

/** Create type for API responses with consistent error handling */
export type ApiResponse<T> =
  | {
      success: true;
      data: T;
      message?: string;
    }
  | {
      success: false;
      error: string;
      code?: string;
    };

/** Pagination wrapper for list responses */
export interface PaginatedResponse<T> {
  items: readonly T[];
  total: number;
  page: number;
  perPage: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/** Base interface for all database entities, providing common fields. */
export interface BaseEntity {
  /** Unique entity identifier (UUID) */
  readonly id: string;
  /** ISO 8601 timestamp of when the entity was created */
  readonly createdAt: string;
  /** ISO 8601 timestamp of the last update */
  updatedAt: string;
}

/** Type for partial updates to an entity. Excludes readonly fields like `id` and `createdAt`. */
export type UpdateEntity<T> = Partial<Omit<T, 'id' | 'createdAt'>>;
