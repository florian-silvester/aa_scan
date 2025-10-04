#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Load environment variables manually
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

// Webflow API helper with rate limit handling
async function webflowRequest(endpoint, options = {}, retryCount = 0) {
  const baseUrl = 'https://api.webflow.com/v2';
  const fetch = (await import('node-fetch')).default;
  
  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: options.method || 'GET',
    headers: {
      'Authorization': `Bearer ${process.env.WEBFLOW_API_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers
    },
    body: options.body ? JSON.stringify(options.body) : null
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Webflow API Error Response:', errorText);
    throw new Error(`Webflow API error: ${response.status} ${errorText}`);
  }

  return response.json();
}

const ARTWORKS_COLLECTION_ID = '686e50ba1170cab27bfa6c49';

async function testCorrectMultiImageFormat() {
  try {
    console.log('Testing correct MultiImage format...');
    
    // Test with a known valid asset ID from our previous tests
    const validAssetId = "6874e7005a11558ffcf4d83d";
    
    // Create artwork with correct MultiImage format: array of fileId strings
    const artworkData = {
      items: [{
        fieldData: {
          "name": "Test Correct MultiImage Format",
          "slug": "test-correct-multiimage-format",
          "artwork-images": [validAssetId]  // Just array of strings!
        }
      }]
    };
    
    console.log('Creating artwork with asset ID:', validAssetId);
    console.log('MultiImage field data:', artworkData.items[0].fieldData["artwork-images"]);
    
    const result = await webflowRequest(`/collections/${ARTWORKS_COLLECTION_ID}/items`, {
      method: 'POST',
      body: artworkData
    });
    
    console.log('✅ Artwork created successfully!');
    console.log('Item ID:', result.items[0].id);
    
    // Now fetch the created item to check if the image was attached
    const items = await webflowRequest(`/collections/${ARTWORKS_COLLECTION_ID}/items?name=Test Correct MultiImage Format`);
    
    if (items.items.length > 0) {
      const artwork = items.items[0];
      console.log('✅ Artwork found');
      console.log('Artwork images field:', artwork.fieldData["artwork-images"]);
      
      if (artwork.fieldData["artwork-images"] && artwork.fieldData["artwork-images"].length > 0) {
        console.log('🎉 SUCCESS! MultiImage field is populated with', artwork.fieldData["artwork-images"].length, 'images');
        console.log('Image details:', artwork.fieldData["artwork-images"]);
      } else {
        console.log('❌ MultiImage field is still empty');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testCorrectMultiImageFormat(); 