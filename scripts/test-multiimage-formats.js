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
const WEBFLOW_COLLECTIONS = {
  artwork: '686e50ba1170cab27bfa6c49'
};

async function webflowRequest(endpoint, options = {}) {
  const response = await fetch(`https://api.webflow.com/v2${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${WEBFLOW_API_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Webflow API error: ${response.status} ${errorText}`);
  }

  return response.json();
}

async function testMultiImageFormats() {
  console.log('🧪 Testing different MultiImage field formats...\n');
  
  const testAssetId = '6874e7005a11558ffcf4d83d'; // From our previous upload
  
  const formats = [
    {
      name: 'Array of strings',
      data: [testAssetId]
    },
    {
      name: 'Array of objects with id',
      data: [{ id: testAssetId }]
    },
    {
      name: 'Array of objects with url',
      data: [{ url: testAssetId }]
    },
    {
      name: 'Array of objects with assetId',
      data: [{ assetId: testAssetId }]
    }
  ];
  
  for (const format of formats) {
    console.log(`\n📝 Testing format: ${format.name}`);
    console.log(`   Data: ${JSON.stringify(format.data)}`);
    
    try {
      const artworkData = {
        fieldData: {
          'name': `Test Format: ${format.name}`,
          'slug': `test-format-${format.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
          'artwork-images': format.data
        }
      };
      
      const response = await webflowRequest(`/collections/${WEBFLOW_COLLECTIONS.artwork}/items`, {
        method: 'POST',
        body: JSON.stringify(artworkData)
      });
      
      const images = response.fieldData['artwork-images'];
      console.log(`   Result: ${JSON.stringify(images)}`);
      
      if (images && images.length > 0) {
        console.log('   ✅ SUCCESS: Images connected!');
      } else {
        console.log('   ❌ FAIL: Images not connected');
      }
      
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
    }
    
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

testMultiImageFormats(); 