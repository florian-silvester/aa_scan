const fs = require('fs');
const path = require('path');
const { createClient } = require('@sanity/client');

// Load environment variables
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
}

const WEBFLOW_API_TOKEN = process.env.WEBFLOW_API_TOKEN;
const WEBFLOW_COLLECTIONS = {
  artwork: '686e50ba1170cab27bfa6c49'
};

async function testWebflowImageField() {
  console.log('🧪 Testing Webflow image field format...\n');
  
  try {
    // Test data with the format we're currently using
    const testData = {
      fieldData: {
        'name': 'Test Artwork',
        'slug': 'test-artwork',
        'artwork-images': ['6874e7005a11558ffcf4d83d'] // Array of asset IDs
      }
    };
    
    console.log('📝 Test data being sent to Webflow:');
    console.log(JSON.stringify(testData, null, 2));
    
    // Make the API call
    const response = await fetch(`https://api.webflow.com/v2/collections/${WEBFLOW_COLLECTIONS.artwork}/items`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WEBFLOW_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ SUCCESS: Webflow accepted the image field format');
      console.log(`  - Created item ID: ${result.id}`);
      console.log(`  - Artwork images field: ${JSON.stringify(result.fieldData['artwork-images'])}`);
    } else {
      console.log('❌ FAILED: Webflow rejected the image field format');
      console.log(`  - Status: ${response.status}`);
      console.log(`  - Error: ${JSON.stringify(result, null, 2)}`);
    }
    
  } catch (error) {
    console.error('❌ Error testing Webflow image field:', error);
  }
}

testWebflowImageField(); 