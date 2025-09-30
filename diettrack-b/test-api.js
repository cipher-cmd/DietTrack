// Simple test script to verify backend API
const fetch = require('node-fetch');

async function testAPI() {
  try {
    console.log('Testing backend API...');
    
    // Test health endpoint
    const healthResponse = await fetch('http://localhost:4000/health');
    const healthData = await healthResponse.json();
    console.log('Health check:', healthData);
    
    // Test analysis endpoint
    const analysisResponse = await fetch('http://localhost:4000/api/v1/analysis/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userContext: {
          prompt: '1 bowl rice and dal'
        }
      })
    });
    
    const analysisData = await analysisResponse.json();
    console.log('Analysis response:', analysisData);
    
  } catch (error) {
    console.error('Error testing API:', error.message);
  }
}

testAPI();
