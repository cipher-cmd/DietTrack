// Test script for user API endpoints
const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));

const BASE_URL = 'http://localhost:4000/api/v1';
const DEMO_USER_ID = '550e8400-e29b-41d4-a716-446655440000';

async function testUserAPI() {
  console.log('Testing User API endpoints...\n');

  try {
    // Test 1: Get user profile
    console.log('1. Testing GET /user/:userId/profile');
    const profileRes = await fetch(`${BASE_URL}/user/${DEMO_USER_ID}/profile`);
    console.log(`Status: ${profileRes.status}`);
    const profileData = await profileRes.text();
    console.log(`Response: ${profileData}\n`);

    // Test 2: Get daily stats
    console.log('2. Testing GET /user/:userId/daily-stats');
    const statsRes = await fetch(
      `${BASE_URL}/user/${DEMO_USER_ID}/daily-stats`
    );
    console.log(`Status: ${statsRes.status}`);
    const statsData = await statsRes.text();
    console.log(`Response: ${statsData}\n`);

    // Test 3: Get recent meals
    console.log('3. Testing GET /user/:userId/recent-meals');
    const mealsRes = await fetch(
      `${BASE_URL}/user/${DEMO_USER_ID}/recent-meals`
    );
    console.log(`Status: ${mealsRes.status}`);
    const mealsData = await mealsRes.text();
    console.log(`Response: ${mealsData}\n`);
  } catch (error) {
    console.error('Error testing API:', error.message);
  }
}

testUserAPI();
