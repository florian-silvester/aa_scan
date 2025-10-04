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

const sanityClient = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-01-01',
  token: process.env.SANITY_API_TOKEN
});

const WEBFLOW_API_TOKEN = process.env.WEBFLOW_API_TOKEN;
const WEBFLOW_SITE_ID = '68664367794a916bfa6d247c';
const WEBFLOW_COLLECTIONS = {
  artwork: '686e50ba1170cab27bfa6c49'
};

// Copy functions from main sync script
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

async function uploadImageToWebflow(imageUrl, filename) {
  try {
    console.log(`  📤 Uploading: ${filename}`);
    
    // Download image
    const response = await fetch(imageUrl);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Create file hash
    const crypto = require('crypto');
    const hash = crypto.createHash('md5').update(buffer).digest('hex');
    
    // Create asset metadata
    const metadataResponse = await webflowRequest(`/sites/${WEBFLOW_SITE_ID}/assets`, {
      method: 'POST',
      body: JSON.stringify({
        fileName: filename,
        fileHash: hash,
        fileSize: buffer.length
      })
    });
    
    if (!metadataResponse.uploadUrl) {
      throw new Error('No upload URL received from Webflow');
    }
    
    // Upload to S3
    const formData = new FormData();
    Object.entries(metadataResponse.uploadDetails).forEach(([key, value]) => {
      formData.append(key, value);
    });
    formData.append('file', new Blob([buffer], { type: 'image/jpeg' }), filename);
    
    const uploadResponse = await fetch(metadataResponse.uploadUrl, {
      method: 'POST',
      body: formData
    });
    
    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.status}`);
    }
    
    console.log(`  ✅ Uploaded: ${metadataResponse.id}`);
    return metadataResponse.id;
    
  } catch (error) {
    console.error(`  ❌ Upload failed: ${error.message}`);
    return null;
  }
}

async function testManualArtworkCreation() {
  console.log('🧪 Testing manual artwork creation with images...\n');
  
  try {
    // Get one artwork with images from Sanity
    const artwork = await sanityClient.fetch(`
      *[_type == "artwork" && defined(images) && length(images) > 0][0] {
        _id,
        name,
        images[]{ 
          asset->{
            _id,
            url,
            originalFilename
          }
        }
      }
    `);
    
    if (!artwork || !artwork.images || artwork.images.length === 0) {
      console.log('❌ No artwork with images found');
      return;
    }
    
    console.log(`✅ Found artwork: ${artwork.name}`);
    console.log(`📷 Images: ${artwork.images.length}`);
    
    // Upload images to Webflow
    const imageAssetIds = [];
    for (const image of artwork.images) {
      if (image.asset && image.asset.url) {
        const assetId = await uploadImageToWebflow(
          image.asset.url,
          image.asset.originalFilename || 'artwork.jpg'
        );
        if (assetId) {
          imageAssetIds.push(assetId);
        }
      }
    }
    
    console.log(`\n📊 Uploaded ${imageAssetIds.length} images`);
    console.log(`Asset IDs: [${imageAssetIds.join(', ')}]`);
    
    if (imageAssetIds.length === 0) {
      console.log('❌ No images uploaded, cannot test artwork creation');
      return;
    }
    
    // Create artwork with images
    console.log('\n🎨 Creating artwork with images...');
    const artworkData = {
      fieldData: {
        'name': `Test: ${artwork.name}`,
        'slug': `test-${artwork.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        'artwork-images': imageAssetIds
      }
    };
    
    console.log('📝 Sending to Webflow:');
    console.log(JSON.stringify(artworkData, null, 2));
    
    const response = await webflowRequest(`/collections/${WEBFLOW_COLLECTIONS.artwork}/items`, {
      method: 'POST',
      body: JSON.stringify(artworkData)
    });
    
    console.log('\n✅ Artwork created successfully!');
    console.log('📊 Response structure:');
    console.log(JSON.stringify(response, null, 2));
    
    // Check response structure
    if (response.items && response.items.length > 0) {
      const item = response.items[0];
      console.log(`  - ID: ${item.id}`);
      console.log(`  - Name: ${item.fieldData.name}`);
      console.log(`  - Images: ${JSON.stringify(item.fieldData['artwork-images'])}`);
      
      if (item.fieldData['artwork-images'] && item.fieldData['artwork-images'].length > 0) {
        console.log('🎉 SUCCESS: Images are connected to artwork!');
      } else {
        console.log('❌ FAIL: Images are not connected to artwork');
      }
    } else {
      console.log('❌ Unexpected response structure');
    }
    
  } catch (error) {
    console.error('❌ Error testing manual artwork creation:', error);
  }
}

testManualArtworkCreation(); 