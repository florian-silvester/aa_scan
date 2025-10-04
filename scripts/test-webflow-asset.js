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
const WEBFLOW_SITE_ID = '68664367794a916bfa6d247c';

async function testWebflowAsset() {
  console.log('🧪 Testing Webflow asset ID...\n');
  
  const testAssetId = '6874e7005a11558ffcf4d83d';
  
  try {
    // Try to get the asset details
    const response = await fetch(`https://api.webflow.com/v2/sites/${WEBFLOW_SITE_ID}/assets/${testAssetId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${WEBFLOW_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ SUCCESS: Asset exists in Webflow');
      console.log(`  - Asset ID: ${result.id}`);
      console.log(`  - Filename: ${result.filename}`);
      console.log(`  - URL: ${result.url}`);
      console.log(`  - File size: ${result.fileSize} bytes`);
    } else {
      console.log('❌ FAILED: Asset not found in Webflow');
      console.log(`  - Status: ${response.status}`);
      console.log(`  - Error: ${JSON.stringify(result, null, 2)}`);
    }
    
  } catch (error) {
    console.error('❌ Error testing Webflow asset:', error);
  }
}

testWebflowAsset(); 