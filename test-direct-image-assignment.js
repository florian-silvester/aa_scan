const fs = require('fs');
const path = require('path');

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
const SITE_ID = '68664367794a916bfa6d247c';
const ARTWORK_COLLECTION_ID = '686e50ba1170cab27bfa6c49';

async function testDirectImageAssignment() {
  console.log('🧪 Testing direct image assignment to artwork...\n');
  
  const testAssetId = '6874e7005a11558ffcf4d83d'; // From our mappings
  
  try {
    // Test 1: Create artwork with different image field formats
    console.log('📝 Test 1: Array of strings (current format)');
    const test1Data = {
      fieldData: {
        'name': 'Image Test 1',
        'slug': 'image-test-1',
        'artwork-images': [testAssetId] // Array of asset ID strings
      }
    };
    
    const response1 = await fetch(`https://api.webflow.com/v2/collections/${ARTWORK_COLLECTION_ID}/items`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WEBFLOW_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(test1Data)
    });
    
    const result1 = await response1.json();
    console.log(`  Status: ${response1.status}`);
    if (response1.ok) {
      console.log(`  ✅ SUCCESS: Item created with ID ${result1.id}`);
      console.log(`  📷 artwork-images field: ${JSON.stringify(result1.fieldData['artwork-images'])}`);
    } else {
      console.log(`  ❌ FAILED: ${JSON.stringify(result1, null, 2)}`);
    }
    
    // Test 2: Try object format  
    console.log('\n📝 Test 2: Array of objects format');
    const test2Data = {
      fieldData: {
        'name': 'Image Test 2',
        'slug': 'image-test-2',
        'artwork-images': [{ id: testAssetId }] // Array of objects
      }
    };
    
    const response2 = await fetch(`https://api.webflow.com/v2/collections/${ARTWORK_COLLECTION_ID}/items`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WEBFLOW_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(test2Data)
    });
    
    const result2 = await response2.json();
    console.log(`  Status: ${response2.status}`);
    if (response2.ok) {
      console.log(`  ✅ SUCCESS: Item created with ID ${result2.id}`);
      console.log(`  📷 artwork-images field: ${JSON.stringify(result2.fieldData['artwork-images'])}`);
    } else {
      console.log(`  ❌ FAILED: ${JSON.stringify(result2, null, 2)}`);
    }
    
    // Test 3: Try with a different asset ID (if any)
    console.log('\n📝 Test 3: Empty array (control test)');
    const test3Data = {
      fieldData: {
        'name': 'Image Test 3',
        'slug': 'image-test-3',
        'artwork-images': [] // Empty array
      }
    };
    
    const response3 = await fetch(`https://api.webflow.com/v2/collections/${ARTWORK_COLLECTION_ID}/items`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WEBFLOW_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(test3Data)
    });
    
    const result3 = await response3.json();
    console.log(`  Status: ${response3.status}`);
    if (response3.ok) {
      console.log(`  ✅ SUCCESS: Item created with ID ${result3.id}`);
      console.log(`  📷 artwork-images field: ${JSON.stringify(result3.fieldData['artwork-images'])}`);
    } else {
      console.log(`  ❌ FAILED: ${JSON.stringify(result3, null, 2)}`);
    }
    
  } catch (error) {
    console.error('❌ Error testing image assignment:', error);
  }
}

testDirectImageAssignment(); 