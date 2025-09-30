import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';

// Import all screens
import SplashScreen from './src/screens/SplashScreen';
import LoginScreen from './src/screens/LoginScreen';
import AgeScreen from './src/screens/onboarding/AgeScreen';
import GenderScreen from './src/screens/onboarding/GenderScreen';
import HeightWeightScreen from './src/screens/onboarding/HeightWeightScreen';
import ActivityScreen from './src/screens/onboarding/ActivityScreen';
import GoalScreen from './src/screens/onboarding/GoalScreen';
import HomeScreen from './src/screens/MobileOptimizedHomeScreen';
import CameraScreen from './src/screens/CameraScreen';
import FoodAnalysisScreen from './src/screens/FoodAnalysisScreen';
import TextMealEntryScreen from './src/screens/TextMealEntryScreen';
import { ErrorBoundary } from './src/components/ErrorBoundary';

type AppState =
  | 'splash'
  | 'login'
  | 'onboarding-age'
  | 'onboarding-gender'
  | 'onboarding-height'
  | 'onboarding-activity'
  | 'onboarding-goal'
  | 'main-home'
  | 'camera'
  | 'food-analysis'
  | 'text-meal-entry';

interface UserData {
  age?: number;
  gender?: string;
  height?: number;
  weight?: number;
  activity?: string;
  goal?: string;
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<AppState>('splash');
  const [userData, setUserData] = useState<UserData>({});
  const [capturedImageUri, setCapturedImageUri] = useState<
    string | undefined
  >();

  const handleSplashFinish = () => {
    setCurrentScreen('login');
  };

  const handleLogin = () => {
    setCurrentScreen('onboarding-age');
  };

  const handleAgeNext = (age: number) => {
    setUserData((prev) => ({ ...prev, age }));
    setCurrentScreen('onboarding-gender');
  };

  const handleGenderNext = (gender: string) => {
    setUserData((prev) => ({ ...prev, gender }));
    setCurrentScreen('onboarding-height');
  };

  const handleGenderBack = () => {
    setCurrentScreen('onboarding-age');
  };

  const handleHeightWeightNext = (height: number, weight: number) => {
    setUserData((prev) => ({ ...prev, height, weight }));
    setCurrentScreen('onboarding-activity');
  };

  const handleHeightWeightBack = () => {
    setCurrentScreen('onboarding-gender');
  };

  const handleActivityNext = (activity: string) => {
    setUserData((prev) => ({ ...prev, activity }));
    setCurrentScreen('onboarding-goal');
  };

  const handleActivityBack = () => {
    setCurrentScreen('onboarding-height');
  };

  const handleGoalNext = (goal: string) => {
    setUserData((prev) => ({ ...prev, goal }));
    setCurrentScreen('main-home');
  };

  const handleGoalBack = () => {
    setCurrentScreen('onboarding-activity');
  };

  // Camera functionality will be handled within HomeScreen

  const handleCameraCapture = (imageUri: string) => {
    // Store the captured image URI for analysis
    setCapturedImageUri(imageUri);
    setCurrentScreen('food-analysis');
  };

  const handleCameraGallery = (imageUri: string) => {
    // Store the gallery image URI for analysis
    setCapturedImageUri(imageUri);
    setCurrentScreen('food-analysis');
  };

  const handleRetryCamera = () => {
    setCurrentScreen('camera');
  };

  const handleManualEntry = () => {
    setCurrentScreen('text-meal-entry');
  };

  const handleTextMealSave = (mealData: any) => {
    // TODO: Save meal data to backend
    console.log('Meal saved:', mealData);
    setCurrentScreen('main-home');
  };

  const handleTextMealBack = () => {
    setCurrentScreen('main-home');
  };

  const handleProfileNavigation = () => {
    // TODO: Implement profile screen later
    console.log('Profile navigation - to be implemented');
  };

  const handleCameraClose = () => {
    setCurrentScreen('main-home');
  };

  const handleAnalysisBack = () => {
    setCurrentScreen('main-home');
  };

  const handleAnalysisSave = () => {
    setCurrentScreen('main-home');
  };

  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 'splash':
        return <SplashScreen onFinish={handleSplashFinish} />;

      case 'login':
        return <LoginScreen onLogin={handleLogin} />;

      case 'onboarding-age':
        return <AgeScreen onNext={handleAgeNext} />;

      case 'onboarding-gender':
        return (
          <GenderScreen onNext={handleGenderNext} onBack={handleGenderBack} />
        );

      case 'onboarding-height':
        return (
          <HeightWeightScreen
            onNext={handleHeightWeightNext}
            onBack={handleHeightWeightBack}
          />
        );

      case 'onboarding-activity':
        return (
          <ActivityScreen
            onNext={handleActivityNext}
            onBack={handleActivityBack}
          />
        );

      case 'onboarding-goal':
        return <GoalScreen onNext={handleGoalNext} onBack={handleGoalBack} />;

      case 'main-home':
        return (
          <HomeScreen
            onNavigateToCamera={() => setCurrentScreen('camera')}
            onNavigateToTextEntry={() => setCurrentScreen('text-meal-entry')}
            onNavigateToProfile={handleProfileNavigation}
          />
        );

      case 'camera':
        return (
          <CameraScreen
            onCapture={handleCameraCapture}
            onGallery={handleCameraGallery}
            onClose={handleCameraClose}
          />
        );

      case 'food-analysis':
        return (
          <FoodAnalysisScreen
            onBack={handleAnalysisBack}
            onSave={handleAnalysisSave}
            onRetryCamera={handleRetryCamera}
            onManualEntry={handleManualEntry}
            imageUri={capturedImageUri}
          />
        );

      case 'text-meal-entry':
        return (
          <TextMealEntryScreen
            onBack={handleTextMealBack}
            onSave={handleTextMealSave}
          />
        );

      default:
        return (
          <HomeScreen
            onNavigateToCamera={() => setCurrentScreen('camera')}
            onNavigateToTextEntry={() => setCurrentScreen('text-meal-entry')}
          />
        );
    }
  };

  return (
    <ErrorBoundary>
      <StatusBar style="auto" />
      {renderCurrentScreen()}
    </ErrorBoundary>
  );
}
